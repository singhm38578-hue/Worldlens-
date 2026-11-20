import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_TRANSLATION_INPUT_CHARS,
  TRANSLATION_CHUNK_SIZE_CHARS,
  resolveSwappedLanguages,
  splitTextIntoSafeChunks,
  validateTranslationInput,
} from './translationTextPolicy';
import { AUTO_DETECT_LANGUAGE, findTranslatorLanguage } from '../data/translatorLanguages';

test('validateTranslationInput rejects empty and whitespace-only input', () => {
  assert.equal(validateTranslationInput('').status, 'empty');
  assert.equal(validateTranslationInput('   \n\t  ').status, 'empty');
});

test('validateTranslationInput rejects text exceeding MAX_TRANSLATION_INPUT_CHARS', () => {
  const oversized = 'a'.repeat(MAX_TRANSLATION_INPUT_CHARS + 1);
  const result = validateTranslationInput(oversized);
  assert.equal(result.status, 'too_long');
  if (result.status === 'too_long') {
    assert.equal(result.actualLength, MAX_TRANSLATION_INPUT_CHARS + 1);
    assert.equal(result.maxLength, MAX_TRANSLATION_INPUT_CHARS);
  }
});

test('validateTranslationInput keeps short English and Hindi inputs in one chunk', () => {
  const enResult = validateTranslationInput('  See the world and understand everything.  ');
  assert.equal(enResult.status, 'valid');
  if (enResult.status === 'valid') {
    assert.equal(enResult.cleanedText, 'See the world and understand everything.');
    assert.equal(enResult.chunks.length, 1);
  }

  const hiResult = validateTranslationInput('नमस्ते, दुनिया देखें और सब कुछ समझें।');
  assert.equal(hiResult.status, 'valid');
  if (hiResult.status === 'valid') {
    assert.equal(hiResult.chunks.length, 1);
    assert.equal(hiResult.chunks[0], 'नमस्ते, दुनिया देखें और सब कुछ समझें।');
  }
});

test('splitTextIntoSafeChunks splits long multi-paragraph Hindi and English text cleanly', () => {
  const paragraph =
    'WorldLens helps people read signs, menus, manuals, and everyday notes across languages. ' +
    'वर्ल्डलेंस विभिन्न भाषाओं में साइनबोर्ड और दस्तावेज़ समझने में मदद करता है।';
  const longText = Array.from({ length: 24 }, (_, idx) => `${idx + 1}. ${paragraph}`).join('\n\n');

  assert.ok(longText.length > TRANSLATION_CHUNK_SIZE_CHARS);
  assert.ok(longText.length <= MAX_TRANSLATION_INPUT_CHARS);

  const validation = validateTranslationInput(longText);
  assert.equal(validation.status, 'valid');
  if (validation.status === 'valid') {
    assert.ok(validation.chunks.length >= 2);
    for (const chunk of validation.chunks) {
      assert.ok(chunk.length > 0);
      assert.ok(chunk.length <= TRANSLATION_CHUNK_SIZE_CHARS);
    }
    const rejoined = validation.chunks.join('\n\n');
    assert.ok(rejoined.includes('1. WorldLens'));
    assert.ok(rejoined.includes('24. WorldLens'));
  }
});

test('resolveSwappedLanguages swaps explicit Hindi and English cleanly', () => {
  const hi = findTranslatorLanguage('hi');
  const en = findTranslatorLanguage('en');

  const swapped = resolveSwappedLanguages(hi, en);
  assert.equal(swapped.nextSource.code, 'en');
  assert.equal(swapped.nextTarget.code, 'hi');
});

test('resolveSwappedLanguages uses detected language when Auto-detect is active', () => {
  const en = findTranslatorLanguage('en');
  const hi = findTranslatorLanguage('hi');

  const fromDetectedHindi = resolveSwappedLanguages(AUTO_DETECT_LANGUAGE, en, 'Hindi');
  assert.equal(fromDetectedHindi.nextSource.code, 'en');
  assert.equal(fromDetectedHindi.nextTarget.code, 'hi');

  const fromDetectedSpanish = resolveSwappedLanguages(AUTO_DETECT_LANGUAGE, en, 'Spanish');
  assert.equal(fromDetectedSpanish.nextSource.code, 'en');
  assert.equal(fromDetectedSpanish.nextTarget.code, 'es');

  const fallbackFromHindiTarget = resolveSwappedLanguages(AUTO_DETECT_LANGUAGE, hi, null);
  assert.equal(fallbackFromHindiTarget.nextSource.code, 'hi');
  assert.equal(fallbackFromHindiTarget.nextTarget.code, 'en');
});
