import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type, type GenerateContentResponse } from '@google/genai';
import { validateTranslationInput } from './src/utils/translationTextPolicy';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const GEMINI_VISION_MODEL = 'gemini-4-hydrogen';

const WORLDLENS_SYSTEM_INSTRUCTION =
  'You are WorldLens, a careful global visual intelligence assistant. ' +
  'Identify visible objects, plants, animals, products, machines, and places accurately. ' +
  'Return object name, category, clear explanation, key observable characteristics, useful facts, and an honest confidence/uncertainty explanation. ' +
  'If identification is uncertain, clearly say so and explain what additional image or information would help. ' +
  'Never invent or fabricate identifications or facts. Do not make unsafe medical, electrical, or mechanical claims.';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const TRANSLATOR_TEXT_SYSTEM_INSTRUCTION =
  'You are WorldLens Global AI Translator. Translate text accurately while preserving meaning, context, tone, punctuation, and line formatting. ' +
  'Never add commentary inside the translated text. Never fabricate translations if the requested language cannot be reliably translated.';

const TRANSLATOR_CAMERA_SYSTEM_INSTRUCTION =
  'You are WorldLens Camera Translator. Extract only text that is genuinely visible and clearly legible in the image, then translate it accurately into the requested target language. ' +
  'Never fabricate, guess, or hallucinate unreadable, blurred, or non-existent text. If no readable text exists, set hasReadableText to false and leave extractedText and translatedText empty.';

interface AnalyzeBody {
  imageBase64?: unknown;
  mimeType?: unknown;
  language?: unknown;
}

interface LanguageSpecBody {
  code?: unknown;
  name?: unknown;
}

interface TranslateTextBody {
  text?: unknown;
  sourceLanguage?: LanguageSpecBody;
  targetLanguage?: LanguageSpecBody;
}

interface TranslateImageBody {
  imageBase64?: unknown;
  mimeType?: unknown;
  targetLanguage?: LanguageSpecBody;
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function classifyGeminiError(err: unknown): {
  status: number;
  errorType: 'NETWORK' | 'QUOTA_EXCEEDED' | 'INVALID_IMAGE' | 'AI_UNAVAILABLE' | 'UNKNOWN';
  detail: string;
} {
  const rawMessage =
    err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unknown Gemini API error';
  const lower = rawMessage.toLowerCase();

  if (
    lower.includes('429') ||
    lower.includes('resource_exhausted') ||
    lower.includes('quota') ||
    lower.includes('rate limit')
  ) {
    return {
      status: 429,
      errorType: 'QUOTA_EXCEEDED',
      detail: 'Gemini API quota or rate limit was reached.',
    };
  }

  if (
    lower.includes('enotfound') ||
    lower.includes('econnreset') ||
    lower.includes('etimedout') ||
    lower.includes('fetch failed') ||
    lower.includes('network')
  ) {
    return {
      status: 503,
      errorType: 'NETWORK',
      detail: 'Unable to reach Gemini API due to a network error.',
    };
  }

  if (
    lower.includes('invalid image') ||
    lower.includes('unable to process input image') ||
    lower.includes('unsupported mime')
  ) {
    return {
      status: 400,
      errorType: 'INVALID_IMAGE',
      detail: 'The uploaded image could not be processed by Gemini.',
    };
  }

  if (
    lower.includes('api_key_invalid') ||
    lower.includes('permission_denied') ||
    lower.includes('403') ||
    lower.includes('401') ||
    lower.includes('503') ||
    lower.includes('unavailable') ||
    lower.includes('not_found')
  ) {
    return {
      status: 503,
      errorType: 'AI_UNAVAILABLE',
      detail: 'Gemini AI service is currently unavailable or not configured.',
    };
  }

  return {
    status: 500,
    errorType: 'UNKNOWN',
    detail: 'An unexpected error occurred while processing the AI request.',
  };
}

async function startServer() {
  const app = express();

  // Cap payload safely to support resized 1024px base64 images without memory abuse
  app.use(express.json({ limit: '6mb' }));
  app.use('/api', (_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });

  app.post('/api/vision/analyze', async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as AnalyzeBody;
    const imageBase64 = typeof body.imageBase64 === 'string' ? body.imageBase64.trim() : '';
    const mimeType = typeof body.mimeType === 'string' ? body.mimeType.trim().toLowerCase() : '';
    const language = body.language === 'hi' ? 'hi' : 'en';

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
        ? 'इस छवि का विश्लेषण करें और सरल, स्पष्ट हिन्दी (देवनागरी) में JSON उत्तर दें। दिखाई देने वाली वस्तु, पौधा, जानवर, उत्पाद, मशीन या स्थान की पहचान करें। यदि पहचान अनिश्चित हो तो कभी अनुमान या मनगढ़ंत पहचान न बनाएं—अनिश्चितता को स्पष्ट रूप से समझाएं।'
        : 'Analyze this image and respond clearly in English as JSON. Identify the visible object, plant, animal, product, machine, or place with its category, explanation, observable characteristics, useful facts, and honest confidence/uncertainty explanation. Never invent or guess an identification if unclear.';

    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
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
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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
                description: 'Clear explanation of what it is and its common purpose or use.',
              },
              characteristics: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3 to 5 concise observable characteristics visible in the image.',
              },
              usefulFacts: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '2 to 4 accurate, practical facts.',
              },
              confidenceLevel: {
                type: Type.STRING,
                description: 'One of: high, moderate, low, uncertain.',
              },
              confidenceExplanation: {
                type: Type.STRING,
                description:
                  'Honest explanation of why confidence is at this level, and what clearer angle or context would help if anything is uncertain.',
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
      });

      const raw = response.text?.trim();
      if (!raw) {
        res.status(502).json({
          errorType: 'AI_UNAVAILABLE',
          detail: 'Gemini returned an empty analysis response.',
        });
        return;
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
        res.status(502).json({
          errorType: 'AI_UNAVAILABLE',
          detail: 'Gemini returned an incomplete visual recognition payload.',
        });
        return;
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
        : [];

      const usefulFacts = Array.isArray(parsed.usefulFacts)
        ? parsed.usefulFacts
            .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
            .map((item) => item.trim())
        : [];

      res.json({
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
      });
    } catch (err) {
      const classified = classifyGeminiError(err);
      res.status(classified.status).json({
        errorType: classified.errorType,
        detail: classified.detail,
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
        ? 'Automatically detect the source language.'
        : `Source language: ${sourceName} (${sourceCode}).`;

    try {
      const translatedChunks: string[] = [];
      let detectedLanguage: string | null = null;
      let latestNote: string | undefined;

      for (const chunk of validation.chunks) {
        const prompt = `${sourceDirective}
Target language: ${targetName} (${targetCode}).
Translate the text below accurately while preserving meaning, context, tone, and line breaks.

Text:
${chunk}`;

        const response: GenerateContentResponse = await ai.models.generateContent({
          model: GEMINI_VISION_MODEL,
          contents: prompt,
          config: {
            systemInstruction: TRANSLATOR_TEXT_SYSTEM_INSTRUCTION,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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
        });

        const raw = response.text?.trim();
        if (!raw) {
          res.status(502).json({
            errorType: 'AI_UNAVAILABLE',
            detail: 'Gemini returned an empty translation response.',
          });
          return;
        }

        const parsed = JSON.parse(raw) as {
          detectedLanguage?: string;
          translatedText?: string;
          supported?: boolean;
          note?: string;
        };

        if (parsed.supported === false) {
          res.status(422).json({
            errorType: 'UNSUPPORTED_LANGUAGE',
            detail: parsed.note?.trim() || 'The requested language pair is not supported.',
          });
          return;
        }

        const translatedPiece = parsed.translatedText?.trim() ?? '';
        if (!translatedPiece) {
          res.status(502).json({
            errorType: 'AI_UNAVAILABLE',
            detail: 'Gemini returned an empty translated string.',
          });
          return;
        }

        if (!detectedLanguage && parsed.detectedLanguage?.trim()) {
          detectedLanguage = parsed.detectedLanguage.trim();
        }
        if (parsed.note?.trim()) {
          latestNote = parsed.note.trim();
        }
        translatedChunks.push(translatedPiece);
      }

      res.json({
        detectedLanguage: detectedLanguage || sourceName,
        translatedText: translatedChunks.join('\n\n'),
        supported: true,
        note: latestNote,
        modelName: GEMINI_VISION_MODEL,
      });
    } catch (err) {
      const classified = classifyGeminiError(err);
      res.status(classified.status).json({
        errorType: classified.errorType,
        detail: classified.detail,
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

    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
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
              text:
                `Extract all clearly legible visible text from this image verbatim (preserving line breaks), detect its language, and translate it accurately into ${targetName} (${targetCode}). ` +
                'Never invent, guess, or fabricate unreadable, blurry, or obscured text. If no readable text is visible, set hasReadableText to false and explain briefly in readabilityNote.',
            },
          ],
        },
        config: {
          systemInstruction: TRANSLATOR_CAMERA_SYSTEM_INSTRUCTION,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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
      });

      const raw = response.text?.trim();
      if (!raw) {
        res.status(502).json({
          errorType: 'AI_UNAVAILABLE',
          detail: 'Gemini returned an empty camera translation response.',
        });
        return;
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

      res.json({
        hasReadableText,
        detectedLanguage: parsed.detectedLanguage?.trim() || null,
        extractedText: hasReadableText ? extractedText : '',
        translatedText: hasReadableText ? translatedText : '',
        readabilityNote: parsed.readabilityNote?.trim() || null,
        targetLanguageName: targetName,
        modelName: GEMINI_VISION_MODEL,
      });
    } catch (err) {
      const classified = classifyGeminiError(err);
      res.status(classified.status).json({
        errorType: classified.errorType,
        detail: classified.detail,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`WORLDLENS server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start WORLDLENS server:', error);
  process.exit(1);
});
