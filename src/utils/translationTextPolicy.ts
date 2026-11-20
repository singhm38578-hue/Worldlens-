import {
  AUTO_DETECT_LANGUAGE,
  TRANSLATOR_LANGUAGES,
  findTranslatorLanguage,
  type TranslatorLanguage,
} from '../data/translatorLanguages.ts';

export const MAX_TRANSLATION_INPUT_CHARS = 5000;
export const TRANSLATION_CHUNK_SIZE_CHARS = 1800;

export type TranslationTextValidation =
  | { status: 'empty' }
  | { status: 'too_long'; actualLength: number; maxLength: number }
  | { status: 'valid'; cleanedText: string; chunks: string[] };

/**
 * Validates and prepares user text for Gemini translation:
 * - Rejects empty/whitespace-only input cleanly
 * - Rejects inputs exceeding MAX_TRANSLATION_INPUT_CHARS (5,000 chars)
 * - Splits long multi-paragraph text into safe semantic chunks (<= 1,800 chars)
 *   along paragraph breaks, newlines, sentence boundaries (including Hindi danda '।'),
 *   or word boundaries so structured Gemini JSON output never truncates.
 */
export function validateTranslationInput(rawText: string): TranslationTextValidation {
  const cleanedText = rawText.trim();
  if (!cleanedText) {
    return { status: 'empty' };
  }
  if (cleanedText.length > MAX_TRANSLATION_INPUT_CHARS) {
    return {
      status: 'too_long',
      actualLength: cleanedText.length,
      maxLength: MAX_TRANSLATION_INPUT_CHARS,
    };
  }
  return {
    status: 'valid',
    cleanedText,
    chunks: splitTextIntoSafeChunks(cleanedText, TRANSLATION_CHUNK_SIZE_CHARS),
  };
}

export function splitTextIntoSafeChunks(
  text: string,
  maxChunkSize: number = TRANSLATION_CHUNK_SIZE_CHARS
): string[] {
  const normalized = text.trim();
  if (!normalized) return [];
  if (normalized.length <= maxChunkSize) return [normalized];

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    const remaining = normalized.length - start;
    if (remaining <= maxChunkSize) {
      const tail = normalized.slice(start).trim();
      if (tail) chunks.push(tail);
      break;
    }

    const windowEnd = start + maxChunkSize;
    const minSearchStart = start + Math.floor(maxChunkSize / 3);
    const slice = normalized.slice(start, windowEnd);

    let splitAt = -1;

    // 1. Prefer paragraph boundary
    const paraIdx = slice.lastIndexOf('\n\n');
    if (paraIdx !== -1 && start + paraIdx >= minSearchStart) {
      splitAt = start + paraIdx + 2;
    }

    // 2. Next prefer single line break
    if (splitAt === -1) {
      const lineIdx = slice.lastIndexOf('\n');
      if (lineIdx !== -1 && start + lineIdx >= minSearchStart) {
        splitAt = start + lineIdx + 1;
      }
    }

    // 3. Next prefer sentence boundaries (English & Hindi Devanagari danda)
    if (splitAt === -1) {
      const sentenceMarkers = ['. ', '। ', '? ', '! ', '।'];
      let bestSentenceEnd = -1;
      for (const marker of sentenceMarkers) {
        const idx = slice.lastIndexOf(marker);
        if (idx !== -1 && start + idx >= minSearchStart) {
          const candidateEnd = start + idx + marker.length;
          if (candidateEnd > bestSentenceEnd) {
            bestSentenceEnd = candidateEnd;
          }
        }
      }
      if (bestSentenceEnd !== -1) {
        splitAt = bestSentenceEnd;
      }
    }

    // 4. Next prefer word space
    if (splitAt === -1) {
      const spaceIdx = slice.lastIndexOf(' ');
      if (spaceIdx !== -1 && start + spaceIdx >= minSearchStart) {
        splitAt = start + spaceIdx + 1;
      }
    }

    // 5. Fallback hard cut at maxChunkSize
    if (splitAt === -1 || splitAt <= start) {
      splitAt = windowEnd;
    }

    const piece = normalized.slice(start, splitAt).trim();
    if (piece) {
      chunks.push(piece);
    }
    start = splitAt;
    while (start < normalized.length && /\s/.test(normalized[start])) {
      start += 1;
    }
  }

  return chunks;
}

export function findTranslatorLanguageByNameOrCode(
  query: string | null | undefined
): TranslatorLanguage | null {
  const normalized = query?.trim().toLowerCase();
  if (!normalized) return null;

  const exact = TRANSLATOR_LANGUAGES.find(
    (lang) =>
      lang.code.toLowerCase() === normalized ||
      lang.name.toLowerCase() === normalized ||
      lang.nativeName.toLowerCase() === normalized
  );
  if (exact) return exact;

  return (
    TRANSLATOR_LANGUAGES.find(
      (lang) =>
        normalized.includes(lang.name.toLowerCase()) ||
        lang.name.toLowerCase().includes(normalized)
    ) ?? null
  );
}

/**
 * Resolves swapped source/target languages cleanly, including when Auto-detect is active
 * by leveraging the last detected source language if available.
 */
export function resolveSwappedLanguages(
  currentSource: TranslatorLanguage,
  currentTarget: TranslatorLanguage,
  detectedSourceName?: string | null
): { nextSource: TranslatorLanguage; nextTarget: TranslatorLanguage } {
  if (currentSource.code !== AUTO_DETECT_LANGUAGE.code) {
    return {
      nextSource: currentTarget,
      nextTarget: currentSource,
    };
  }

  const matchedDetected = findTranslatorLanguageByNameOrCode(detectedSourceName);
  if (matchedDetected && matchedDetected.code !== currentTarget.code) {
    return {
      nextSource: currentTarget,
      nextTarget: matchedDetected,
    };
  }

  return {
    nextSource: currentTarget,
    nextTarget:
      currentTarget.code === 'en'
        ? findTranslatorLanguage('hi')
        : findTranslatorLanguage('en'),
  };
}
