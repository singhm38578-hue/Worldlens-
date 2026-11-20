import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, type GenerateContentResponse } from '@google/genai';
import { validateTranslationInput } from './src/utils/translationTextPolicy.ts';
import {
  classifyGeminiServerError,
  createRequestHash,
  GeminiRequestCoordinator,
  resolveConfiguredModel,
  resolveFastThinkingLevel,
  runWithTimeoutAndSafeRetry,
  type GeminiFeatureKey,
} from './src/utils/geminiServerGuard.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const parsedPort = Number.parseInt(process.env.PORT ?? '', 10);
const PORT = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 3000;

// Fastest active multimodal free-tier model ('gemini-3.1-flash-lite' with ThinkingLevel.MINIMAL).
// Optional env overrides remain supported without code changes.
const GEMINI_VISION_MODEL = resolveConfiguredModel(process.env.GEMINI_VISION_MODEL);
const GEMINI_TRANSLATION_MODEL = resolveConfiguredModel(process.env.GEMINI_TRANSLATION_MODEL);
const VISION_THINKING_LEVEL = resolveFastThinkingLevel(GEMINI_VISION_MODEL);
const TRANSLATION_THINKING_LEVEL = resolveFastThinkingLevel(GEMINI_TRANSLATION_MODEL);

const VISION_TIMEOUT_MS = 25_000;
const TRANSLATE_TEXT_TIMEOUT_MS = 20_000;
const TRANSLATE_IMAGE_TIMEOUT_MS = 25_000;

const coordinator = new GeminiRequestCoordinator();

// Concise response size directives keep output tokens tight without truncating JSON
// (recommended over maxOutputTokens by @google/genai guidelines).
const WORLDLENS_SYSTEM_INSTRUCTION =
  'You are WorldLens, a careful visual intelligence assistant. ' +
  'Identify visible objects, plants, animals, products, machines, and places accurately. ' +
  'Keep responses concise and practical: explanation in 2-3 clear sentences, 3-4 brief characteristics, 2-3 short useful facts, and a 1-2 sentence confidence note. ' +
  'If identification is uncertain, say so clearly and explain what clearer photo would help. ' +
  'Never invent identifications or facts. Do not make unsafe medical, electrical, or mechanical claims.';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const TRANSLATOR_TEXT_SYSTEM_INSTRUCTION =
  'You are WorldLens Global AI Translator. Translate text accurately and concisely while preserving meaning, tone, punctuation, and line breaks. ' +
  'Return only the requested JSON fields with no extra commentary. Never fabricate translations for unsupported languages.';

const TRANSLATOR_CAMERA_SYSTEM_INSTRUCTION =
  'You are WorldLens Camera Translator. Extract only clearly legible visible text from the image and translate it accurately into the target language. ' +
  'Never fabricate or guess blurry or non-existent text. If no readable text exists, set hasReadableText to false and leave extractedText and translatedText empty.';

interface AnalyzeBody {
  imageBase64?: unknown;
  mimeType?: unknown;
  language?: unknown;
  bypassCache?: unknown;
}

interface LanguageSpecBody {
  code?: unknown;
  name?: unknown;
}

interface TranslateTextBody {
  text?: unknown;
  sourceLanguage?: LanguageSpecBody;
  targetLanguage?: LanguageSpecBody;
  featureMode?: unknown;
  bypassCache?: unknown;
}

interface TranslateImageBody {
  imageBase64?: unknown;
  mimeType?: unknown;
  targetLanguage?: LanguageSpecBody;
  bypassCache?: unknown;
}

let cachedClient: GoogleGenAI | null = null;
let cachedApiKey: string | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  if (cachedClient && cachedApiKey === apiKey) {
    return cachedClient;
  }
  cachedApiKey = apiKey;
  cachedClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
  return cachedClient;
}

function resolveTranslateFeatureKey(featureMode: unknown): GeminiFeatureKey {
  if (featureMode === 'voice') return 'voice_translate';
  if (featureMode === 'conversation') return 'conversation_translate';
  return 'text_translate';
}

async function startServer() {
  const app = express();

  // Cap payload safely to support compressed base64 images without memory abuse
  app.use(express.json({ limit: '4mb' }));
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/api', (_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });

  // Aggregate usage summary for owner diagnostics (no secrets, no PII, no user prompts)
  app.get('/api/usage/summary', (_req: Request, res: Response) => {
    res.json(
      coordinator.getSummary({
        vision: GEMINI_VISION_MODEL,
        translation: GEMINI_TRANSLATION_MODEL,
      })
    );
  });

  app.post('/api/vision/analyze', async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as AnalyzeBody;
    const imageBase64 = typeof body.imageBase64 === 'string' ? body.imageBase64.trim() : '';
    const mimeType = typeof body.mimeType === 'string' ? body.mimeType.trim().toLowerCase() : '';
    const language = body.language === 'hi' ? 'hi' : 'en';
    const bypassCache = body.bypassCache === true;

    if (!imageBase64 || !ALLOWED_MIME_TYPES.has(mimeType)) {
      res.status(400).json({
        errorType: 'INVALID_IMAGE',
        detail: 'Provide a valid JPEG, PNG, or WebP image.',
      });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        errorType: 'AI_UNAVAILABLE',
        detail: 'Gemini API is not configured on this server environment.',
      });
      return;
    }

    const languagePrompt =
      language === 'hi'
        ? 'इस छवि का विश्लेषण करें और संक्षिप्त, स्पष्ट हिन्दी (देवनागरी) में JSON उत्तर दें। दिखाई देने वाली वस्तु, पौधा, जानवर, उत्पाद, मशीन या स्थान की पहचान करें। अनिश्चित होने पर स्पष्ट बताएं।'
        : 'Analyze this image and reply concisely in English JSON. Identify the visible object, plant, animal, product, machine, or place with category, brief explanation, key characteristics, useful facts, and honest confidence note.';

    const cacheKey = createRequestHash(['vision', GEMINI_VISION_MODEL, language, mimeType, imageBase64]);

    try {
      const outcome = await coordinator.execute({
        feature: 'vision_scan',
        cacheKey,
        bypassCache,
        work: async () => {
          const response: GenerateContentResponse = await runWithTimeoutAndSafeRetry(
            () =>
              ai.models.generateContent({
                model: GEMINI_VISION_MODEL,
                contents: {
                  parts: [
                    {
                      inlineData: {
                        mimeType,
                        data: imageBase64,
                      },
                    },
                    {
                      text: languagePrompt,
                    },
                  ],
                },
                config: {
                  systemInstruction: WORLDLENS_SYSTEM_INSTRUCTION,
                  thinkingConfig: { thinkingLevel: VISION_THINKING_LEVEL },
                  responseMimeType: 'application/json',
                  responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                      objectName: {
                        type: Type.STRING,
                        description:
                          'Specific name of the visible object, plant, animal, product, machine, or place, or an honest uncertain label if unclear.',
                      },
                      category: {
                        type: Type.STRING,
                        description: 'Category such as Object, Plant, Animal, Product, Machine, Place, or Uncertain.',
                      },
                      explanation: {
                        type: Type.STRING,
                        description: 'Concise 2-3 sentence explanation of what it is and its purpose.',
                      },
                      characteristics: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: '3 to 4 brief observable characteristics.',
                      },
                      usefulFacts: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: '2 to 3 short, practical facts.',
                      },
                      confidenceLevel: {
                        type: Type.STRING,
                        description: 'One of: high, moderate, low, uncertain.',
                      },
                      confidenceExplanation: {
                        type: Type.STRING,
                        description: '1-2 sentence explanation of confidence or uncertainty.',
                      },
                    },
                    required: [
                      'objectName',
                      'category',
                      'explanation',
                      'characteristics',
                      'usefulFacts',
                      'confidenceLevel',
                      'confidenceExplanation',
                    ],
                  },
                },
              }),
            { timeoutMs: VISION_TIMEOUT_MS, maxTransientRetries: 1 }
          );

          const raw = response.text?.trim();
          if (!raw) {
            throw new Error('UNAVAILABLE: Gemini returned an empty analysis response.');
          }

          const parsed = JSON.parse(raw) as {
            objectName?: string;
            category?: string;
            explanation?: string;
            characteristics?: unknown;
            usefulFacts?: unknown;
            confidenceLevel?: string;
            confidenceExplanation?: string;
          };

          const objectName = parsed.objectName?.trim() || '';
          const explanation = parsed.explanation?.trim() || '';
          if (!objectName && !explanation) {
            throw new Error('UNAVAILABLE: Gemini returned an incomplete visual recognition payload.');
          }

          const normalizedConfidence = ['high', 'moderate', 'low', 'uncertain'].includes(
            (parsed.confidenceLevel ?? '').trim().toLowerCase()
          )
            ? (parsed.confidenceLevel ?? '').trim().toLowerCase()
            : 'moderate';

          const characteristics = Array.isArray(parsed.characteristics)
            ? parsed.characteristics
                .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
                .map((item) => item.trim())
                .slice(0, 6)
            : [];

          const usefulFacts = Array.isArray(parsed.usefulFacts)
            ? parsed.usefulFacts
                .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
                .map((item) => item.trim())
                .slice(0, 6)
            : [];

          return {
            data: {
              report: {
                objectName: objectName || (language === 'hi' ? 'अनिश्चित विषय' : 'Uncertain Subject'),
                category: parsed.category?.trim() || (language === 'hi' ? 'सामान्य' : 'General'),
                explanation,
                characteristics,
                usefulFacts,
                confidenceLevel: normalizedConfidence,
                confidenceExplanation: parsed.confidenceExplanation?.trim() || '',
              },
              modelName: GEMINI_VISION_MODEL,
              language,
            },
            promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
            outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
            apiCallCount: 1,
          };
        },
      });

      res.json({
        ...outcome.data,
        cached: outcome.cached,
        deduped: outcome.deduped,
        latencyMs: outcome.latencyMs,
      });
    } catch (err) {
      const classified = classifyGeminiServerError(err);
      if (classified.retryAfterSeconds) {
        res.setHeader('Retry-After', String(classified.retryAfterSeconds));
      }
      res.status(classified.status).json({
        errorType: classified.errorType,
        detail: classified.detail,
        ...(classified.retryAfterSeconds ? { retryAfterSeconds: classified.retryAfterSeconds } : {}),
      });
    }
  });

  app.post('/api/translate/text', async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as TranslateTextBody;
    const rawText = typeof body.text === 'string' ? body.text : '';
    const sourceCode =
      typeof body.sourceLanguage?.code === 'string' ? body.sourceLanguage.code.trim() : 'auto';
    const sourceName =
      typeof body.sourceLanguage?.name === 'string' ? body.sourceLanguage.name.trim() : 'Auto-detect';
    const targetCode =
      typeof body.targetLanguage?.code === 'string' ? body.targetLanguage.code.trim() : '';
    const targetName =
      typeof body.targetLanguage?.name === 'string' ? body.targetLanguage.name.trim() : '';
    const featureKey = resolveTranslateFeatureKey(body.featureMode);
    const bypassCache = body.bypassCache === true;

    const validation = validateTranslationInput(rawText);
    if (validation.status === 'empty') {
      res.status(400).json({
        errorType: 'EMPTY_INPUT',
        detail: 'Please enter text to translate.',
      });
      return;
    }

    if (validation.status === 'too_long') {
      res.status(400).json({
        errorType: 'TEXT_TOO_LONG',
        detail: `Text is too long (${validation.actualLength} characters). Maximum supported length is ${validation.maxLength} characters.`,
      });
      return;
    }

    if (!targetCode || !targetName) {
      res.status(400).json({
        errorType: 'UNSUPPORTED_LANGUAGE',
        detail: 'Please select a valid target language.',
      });
      return;
    }

    // Short-circuit identical explicit source & target language with 0 Gemini calls
    if (sourceCode !== 'auto' && sourceCode.toLowerCase() === targetCode.toLowerCase()) {
      res.json({
        detectedLanguage: sourceName,
        translatedText: validation.cleanedText,
        supported: true,
        modelName: GEMINI_TRANSLATION_MODEL,
        cached: true,
        deduped: false,
        latencyMs: 0,
      });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        errorType: 'AI_UNAVAILABLE',
        detail: 'Gemini API is not configured on this server environment.',
      });
      return;
    }

    const sourceDirective =
      sourceCode === 'auto'
        ? 'Auto-detect source language.'
        : `Source: ${sourceName} (${sourceCode}).`;

    const cacheKey = createRequestHash([
      'translate_text',
      GEMINI_TRANSLATION_MODEL,
      sourceCode.toLowerCase(),
      targetCode.toLowerCase(),
      validation.cleanedText,
    ]);

    try {
      const outcome = await coordinator.execute({
        feature: featureKey,
        cacheKey,
        bypassCache,
        work: async () => {
          const translatedChunks: string[] = [];
          let detectedLanguage: string | null = null;
          let latestNote: string | undefined;
          let totalPromptTokens = 0;
          let totalOutputTokens = 0;
          let callsMade = 0;

          for (const chunk of validation.chunks) {
            callsMade += 1;
            const prompt = `${sourceDirective} Target: ${targetName} (${targetCode}).
Translate accurately preserving meaning, tone, and line breaks.

${chunk}`;

            const response: GenerateContentResponse = await runWithTimeoutAndSafeRetry(
              () =>
                ai.models.generateContent({
                  model: GEMINI_TRANSLATION_MODEL,
                  contents: prompt,
                  config: {
                    systemInstruction: TRANSLATOR_TEXT_SYSTEM_INSTRUCTION,
                    thinkingConfig: { thinkingLevel: TRANSLATION_THINKING_LEVEL },
                    responseMimeType: 'application/json',
                    responseSchema: {
                      type: Type.OBJECT,
                      properties: {
                        detectedLanguage: { type: Type.STRING },
                        translatedText: { type: Type.STRING },
                        supported: { type: Type.BOOLEAN },
                        note: { type: Type.STRING },
                      },
                      required: ['detectedLanguage', 'translatedText', 'supported'],
                    },
                  },
                }),
              { timeoutMs: TRANSLATE_TEXT_TIMEOUT_MS, maxTransientRetries: 1 }
            );

            totalPromptTokens += response.usageMetadata?.promptTokenCount ?? 0;
            totalOutputTokens += response.usageMetadata?.candidatesTokenCount ?? 0;

            const raw = response.text?.trim();
            if (!raw) {
              throw new Error('UNAVAILABLE: Gemini returned an empty translation response.');
            }

            const parsed = JSON.parse(raw) as {
              detectedLanguage?: string;
              translatedText?: string;
              supported?: boolean;
              note?: string;
            };

            if (parsed.supported === false) {
              const unsupportedErr = new Error(
                `UNSUPPORTED_LANGUAGE: ${parsed.note?.trim() || 'The requested language pair is not supported.'}`
              );
              throw unsupportedErr;
            }

            const translatedPiece = parsed.translatedText?.trim() ?? '';
            if (!translatedPiece) {
              throw new Error('UNAVAILABLE: Gemini returned an empty translated string.');
            }

            if (!detectedLanguage && parsed.detectedLanguage?.trim()) {
              detectedLanguage = parsed.detectedLanguage.trim();
            }
            if (parsed.note?.trim()) {
              latestNote = parsed.note.trim();
            }
            translatedChunks.push(translatedPiece);
          }

          return {
            data: {
              detectedLanguage: detectedLanguage || sourceName,
              translatedText: translatedChunks.join('\n\n'),
              supported: true,
              note: latestNote,
              modelName: GEMINI_TRANSLATION_MODEL,
            },
            promptTokens: totalPromptTokens,
            outputTokens: totalOutputTokens,
            apiCallCount: callsMade,
          };
        },
      });

      res.json({
        ...outcome.data,
        cached: outcome.cached,
        deduped: outcome.deduped,
        latencyMs: outcome.latencyMs,
      });
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('UNSUPPORTED_LANGUAGE:')) {
        res.status(422).json({
          errorType: 'UNSUPPORTED_LANGUAGE',
          detail: err.message.replace(/^UNSUPPORTED_LANGUAGE:\s*/, ''),
        });
        return;
      }
      const classified = classifyGeminiServerError(err);
      if (classified.retryAfterSeconds) {
        res.setHeader('Retry-After', String(classified.retryAfterSeconds));
      }
      res.status(classified.status).json({
        errorType: classified.errorType,
        detail: classified.detail,
        ...(classified.retryAfterSeconds ? { retryAfterSeconds: classified.retryAfterSeconds } : {}),
      });
    }
  });

  app.post('/api/translate/image', async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as TranslateImageBody;
    const imageBase64 = typeof body.imageBase64 === 'string' ? body.imageBase64.trim() : '';
    const mimeType = typeof body.mimeType === 'string' ? body.mimeType.trim().toLowerCase() : '';
    const targetCode =
      typeof body.targetLanguage?.code === 'string' ? body.targetLanguage.code.trim() : '';
    const targetName =
      typeof body.targetLanguage?.name === 'string' ? body.targetLanguage.name.trim() : '';
    const bypassCache = body.bypassCache === true;

    if (!imageBase64 || !ALLOWED_MIME_TYPES.has(mimeType)) {
      res.status(400).json({
        errorType: 'INVALID_IMAGE',
        detail: 'Provide a valid JPEG, PNG, or WebP image.',
      });
      return;
    }

    if (!targetCode || !targetName) {
      res.status(400).json({
        errorType: 'UNSUPPORTED_LANGUAGE',
        detail: 'Please select a valid target language.',
      });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        errorType: 'AI_UNAVAILABLE',
        detail: 'Gemini API is not configured on this server environment.',
      });
      return;
    }

    const cacheKey = createRequestHash([
      'translate_image',
      GEMINI_TRANSLATION_MODEL,
      targetCode.toLowerCase(),
      mimeType,
      imageBase64,
    ]);

    try {
      const outcome = await coordinator.execute({
        feature: 'camera_translate',
        cacheKey,
        bypassCache,
        work: async () => {
          const response: GenerateContentResponse = await runWithTimeoutAndSafeRetry(
            () =>
              ai.models.generateContent({
                model: GEMINI_TRANSLATION_MODEL,
                contents: {
                  parts: [
                    {
                      inlineData: {
                        mimeType,
                        data: imageBase64,
                      },
                    },
                    {
                      text:
                        `Extract clearly legible visible text verbatim (preserving line breaks), detect its language, and translate it accurately into ${targetName} (${targetCode}). ` +
                        'Never fabricate blurry or absent text. If no readable text exists, set hasReadableText to false and note why briefly.',
                    },
                  ],
                },
                config: {
                  systemInstruction: TRANSLATOR_CAMERA_SYSTEM_INSTRUCTION,
                  thinkingConfig: { thinkingLevel: TRANSLATION_THINKING_LEVEL },
                  responseMimeType: 'application/json',
                  responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                      hasReadableText: { type: Type.BOOLEAN },
                      detectedLanguage: { type: Type.STRING },
                      extractedText: { type: Type.STRING },
                      translatedText: { type: Type.STRING },
                      readabilityNote: { type: Type.STRING },
                    },
                    required: ['hasReadableText', 'extractedText', 'translatedText'],
                  },
                },
              }),
            { timeoutMs: TRANSLATE_IMAGE_TIMEOUT_MS, maxTransientRetries: 1 }
          );

          const raw = response.text?.trim();
          if (!raw) {
            throw new Error('UNAVAILABLE: Gemini returned an empty camera translation response.');
          }

          const parsed = JSON.parse(raw) as {
            hasReadableText?: boolean;
            detectedLanguage?: string;
            extractedText?: string;
            translatedText?: string;
            readabilityNote?: string;
          };

          const extractedText = parsed.extractedText?.trim() ?? '';
          const translatedText = parsed.translatedText?.trim() ?? '';
          const hasReadableText = Boolean(parsed.hasReadableText) && extractedText.length > 0;

          return {
            data: {
              hasReadableText,
              detectedLanguage: parsed.detectedLanguage?.trim() || null,
              extractedText: hasReadableText ? extractedText : '',
              translatedText: hasReadableText ? translatedText : '',
              readabilityNote: parsed.readabilityNote?.trim() || null,
              targetLanguageName: targetName,
              modelName: GEMINI_TRANSLATION_MODEL,
            },
            promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
            outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
            apiCallCount: 1,
          };
        },
      });

      res.json({
        ...outcome.data,
        cached: outcome.cached,
        deduped: outcome.deduped,
        latencyMs: outcome.latencyMs,
      });
    } catch (err) {
      const classified = classifyGeminiServerError(err);
      if (classified.retryAfterSeconds) {
        res.setHeader('Retry-After', String(classified.retryAfterSeconds));
      }
      res.status(classified.status).json({
        errorType: classified.errorType,
        detail: classified.detail,
        ...(classified.retryAfterSeconds ? { retryAfterSeconds: classified.retryAfterSeconds } : {}),
      });
    }
  });

  const distPath = path.resolve(__dirname, 'dist');
  const distIndexPath = path.join(distPath, 'index.html');
  const hasDistBuild = fs.existsSync(distIndexPath);
  const useViteDevMiddleware =
    process.env.NODE_ENV === 'development' ||
    (process.env.NODE_ENV !== 'production' && !hasDistBuild);

  if (useViteDevMiddleware) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      if (fs.existsSync(distIndexPath)) {
        res.sendFile(distIndexPath);
        return;
      }
      res.status(503).send('WorldLens frontend build (dist/index.html) not found.');
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `WORLDLENS server listening on http://0.0.0.0:${PORT} (vision=${GEMINI_VISION_MODEL}, translate=${GEMINI_TRANSLATION_MODEL})`
    );
  });
}

startServer().catch((error) => {
  console.error('Failed to start WORLDLENS server:', error);
  process.exit(1);
});
