import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  APP_LANGUAGE_STORAGE_KEY,
  MAX_SAFE_THUMBNAIL_CHARS,
  SCAN_HISTORY_STORAGE_KEY,
  TRANSLATION_HISTORY_STORAGE_KEY,
  clearScanHistory,
  clearTranslationHistory,
  deleteScanHistoryItem,
  deleteTranslationHistoryItem,
  formatHistoryDateTime,
  formatScanLanguageLabel,
  loadAppLanguage,
  loadScanHistory,
  loadTranslationHistory,
  sanitizeSafeThumbnailDataUrl,
  saveAppLanguage,
  saveScanHistoryItem,
  saveTranslationHistoryItem,
  type StorageLike,
} from './localHistoryStore';

function createMemoryStorage(): StorageLike & { dump: () => Record<string, string> } {
  const map = new Map<string, string>();
  return {
    getItem(key: string): string | null {
      return map.has(key) ? map.get(key)! : null;
    },
    setItem(key: string, value: string): void {
      map.set(key, value);
    },
    removeItem(key: string): void {
      map.delete(key);
    },
    dump() {
      return Object.fromEntries(map.entries());
    },
  };
}

const SAMPLE_TINY_JPEG_THUMBNAIL = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAA==';

describe('localHistoryStore — Scan History & Translation History', () => {
  it('returns empty lists on fresh install with zero fake records', () => {
    const storage = createMemoryStorage();
    assert.deepEqual(loadScanHistory(storage), []);
    assert.deepEqual(loadTranslationHistory(storage), []);
  });

  it('saves successful scan results with language, timestamp, and safe thumbnail, and persists across restarts', () => {
    const storage = createMemoryStorage();

    saveScanHistoryItem(
      {
        id: 'scan-1',
        timestamp: 1_740_000_000_000,
        language: 'en',
        modelName: 'gemini-2.5-flash',
        sourceLabel: 'gallery',
        thumbnailDataUrl: SAMPLE_TINY_JPEG_THUMBNAIL,
        report: {
          objectName: 'Brass Compass',
          category: 'Instrument',
          explanation: 'Magnetic navigation compass in cast brass housing.',
          characteristics: ['360-degree bezel', 'Non-magnetic brass body'],
          usefulFacts: ['Used in field navigation'],
          confidenceLevel: 'high',
          confidenceExplanation: 'Clear view of compass dial and needle.',
        },
      },
      storage
    );

    saveScanHistoryItem(
      {
        id: 'scan-2',
        timestamp: 1_740_000_500_000,
        language: 'hi',
        modelName: 'gemini-2.5-flash',
        sourceLabel: 'camera',
        report: {
          objectName: 'तुलसी का पौधा',
          category: 'पौधा',
          explanation: 'भारतीय घरों में पाया जाने वाला सुगंधित औषधीय पौधा।',
          characteristics: ['हरी पत्तियाँ'],
          usefulFacts: ['आयुर्वेद में उपयोगी'],
          confidenceLevel: 'moderate',
          confidenceExplanation: 'पत्तियों की बनावट स्पष्ट है।',
        },
      },
      storage
    );

    // Simulate app restart by reading directly from underlying storage
    const reloaded = loadScanHistory(storage);
    assert.equal(reloaded.length, 2);
    assert.equal(reloaded[0].id, 'scan-2');
    assert.equal(reloaded[0].language, 'hi');
    assert.equal(reloaded[0].thumbnailDataUrl, undefined);

    assert.equal(reloaded[1].id, 'scan-1');
    assert.equal(reloaded[1].language, 'en');
    assert.equal(reloaded[1].report.objectName, 'Brass Compass');
    assert.equal(reloaded[1].thumbnailDataUrl, SAMPLE_TINY_JPEG_THUMBNAIL);
  });

  it('sanitizes and rejects unsafe or oversized thumbnail values cleanly', () => {
    assert.equal(sanitizeSafeThumbnailDataUrl(SAMPLE_TINY_JPEG_THUMBNAIL), SAMPLE_TINY_JPEG_THUMBNAIL);
    assert.equal(sanitizeSafeThumbnailDataUrl('javascript:alert(1)'), undefined);
    assert.equal(sanitizeSafeThumbnailDataUrl('data:image/svg+xml;base64,PHN2Zz4='), undefined);
    assert.equal(
      sanitizeSafeThumbnailDataUrl(`data:image/jpeg;base64,${'A'.repeat(MAX_SAFE_THUMBNAIL_CHARS)}`),
      undefined
    );
  });

  it('deletes individual scan entries and clears all scans cleanly', () => {
    const storage = createMemoryStorage();
    saveScanHistoryItem(
      {
        id: 'scan-a',
        timestamp: 1_740_000_100_000,
        language: 'en',
        modelName: 'gemini-2.5-flash',
        sourceLabel: 'camera',
        thumbnailDataUrl: SAMPLE_TINY_JPEG_THUMBNAIL,
        report: {
          objectName: 'Ceramic Mug',
          category: 'Object',
          explanation: 'Glazed stoneware coffee mug.',
          characteristics: ['Curved handle'],
          usefulFacts: ['Retains heat'],
          confidenceLevel: 'high',
          confidenceExplanation: 'Clearly visible shape.',
        },
      },
      storage
    );
    saveScanHistoryItem(
      {
        id: 'scan-b',
        timestamp: 1_740_000_200_000,
        language: 'en',
        modelName: 'gemini-2.5-flash',
        sourceLabel: 'gallery',
        report: {
          objectName: 'Oak Leaf',
          category: 'Plant',
          explanation: 'Lobed deciduous leaf.',
          characteristics: ['Deep rounded lobes'],
          usefulFacts: ['Produces acorns'],
          confidenceLevel: 'moderate',
          confidenceExplanation: 'Leaf outline is clear.',
        },
      },
      storage
    );

    const afterDelete = deleteScanHistoryItem('scan-a', storage);
    assert.equal(afterDelete.length, 1);
    assert.equal(afterDelete[0].id, 'scan-b');
    assert.equal(loadScanHistory(storage).length, 1);

    const afterClear = clearScanHistory(storage);
    assert.deepEqual(afterClear, []);
    assert.deepEqual(loadScanHistory(storage), []);
  });

  it('saves, reloads after restart, deletes, and clears local translation history', () => {
    const storage = createMemoryStorage();

    saveTranslationHistoryItem(
      {
        id: 'tr-1',
        mode: 'text',
        sourceLanguageCode: 'en',
        sourceLanguageName: 'English',
        targetLanguageCode: 'hi',
        targetLanguageName: 'Hindi',
        sourceText: 'Good morning',
        translatedText: 'सुप्रभात',
        timestamp: 1_740_001_000_000,
      },
      storage
    );

    saveTranslationHistoryItem(
      {
        id: 'tr-2',
        mode: 'camera',
        sourceLanguageCode: 'auto',
        sourceLanguageName: 'Hindi',
        targetLanguageCode: 'en',
        targetLanguageName: 'English',
        sourceText: 'प्रवेश द्वार',
        translatedText: 'Entrance Gate',
        timestamp: 1_740_002_000_000,
      },
      storage
    );

    const reloaded = loadTranslationHistory(storage);
    assert.equal(reloaded.length, 2);
    assert.equal(reloaded[0].id, 'tr-2');
    assert.equal(reloaded[1].translatedText, 'सुप्रभात');

    const afterDelete = deleteTranslationHistoryItem('tr-2', storage);
    assert.equal(afterDelete.length, 1);
    assert.equal(afterDelete[0].id, 'tr-1');

    const afterClear = clearTranslationHistory(storage);
    assert.deepEqual(afterClear, []);
    assert.deepEqual(loadTranslationHistory(storage), []);
  });

  it('handles corrupted JSON and storage write/quota errors gracefully without crashing', () => {
    const storage = createMemoryStorage();
    storage.setItem(SCAN_HISTORY_STORAGE_KEY, '{not-valid-json');
    storage.setItem(TRANSLATION_HISTORY_STORAGE_KEY, '[{"broken":true}]');

    let scanReadErr: string | null = null;
    assert.deepEqual(
      loadScanHistory(storage, (reason) => {
        scanReadErr = reason;
      }),
      []
    );
    assert.ok(scanReadErr !== null);
    assert.deepEqual(loadTranslationHistory(storage), []);

    // Simulate quota error that succeeds once thumbnails are stripped
    let quotaStoragePayload: string | null = null;
    const quotaFallbackStorage: StorageLike = {
      getItem: () => quotaStoragePayload,
      setItem: (_key, value) => {
        if (value.includes('thumbnailDataUrl')) {
          throw new Error('QuotaExceededError');
        }
        quotaStoragePayload = value;
      },
      removeItem: () => {
        quotaStoragePayload = null;
      },
    };

    let fallbackErr: string | null = null;
    const saved = saveScanHistoryItem(
      {
        id: 'scan-quota',
        timestamp: 1_740_003_000_000,
        language: 'en',
        modelName: 'gemini-2.5-flash',
        sourceLabel: 'camera',
        thumbnailDataUrl: SAMPLE_TINY_JPEG_THUMBNAIL,
        report: {
          objectName: 'Steel Kettle',
          category: 'Product',
          explanation: 'Electric stainless steel water kettle.',
          characteristics: ['Spout'],
          usefulFacts: ['Heats water quickly'],
          confidenceLevel: 'high',
          confidenceExplanation: 'Clearly visible.',
        },
      },
      quotaFallbackStorage,
      (reason) => {
        fallbackErr = reason;
      }
    );
    assert.equal(fallbackErr, null);
    assert.equal(saved.length, 1);
    assert.equal(saved[0].thumbnailDataUrl, undefined);
    assert.equal(loadScanHistory(quotaFallbackStorage).length, 1);

    // Simulate hard storage failure and confirm error callback fires cleanly
    const brokenStorage: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('Disk read-only');
      },
      removeItem: () => {
        throw new Error('Disk read-only');
      },
    };

    let writeErr: string | null = null;
    saveTranslationHistoryItem(
      {
        id: 'tr-broken',
        mode: 'text',
        sourceLanguageCode: 'en',
        sourceLanguageName: 'English',
        targetLanguageCode: 'hi',
        targetLanguageName: 'Hindi',
        sourceText: 'Hello',
        translatedText: 'नमस्ते',
        timestamp: 1_740_004_000_000,
      },
      brokenStorage,
      (reason) => {
        writeErr = reason;
      }
    );
    assert.equal(writeErr, 'Disk read-only');
  });

  it('formats date/time and scan language labels cleanly for English and Hindi locales', () => {
    const ts = Date.UTC(2025, 2, 15, 10, 30, 0);
    const enDate = formatHistoryDateTime(ts, 'en');
    const hiDate = formatHistoryDateTime(ts, 'hi');
    assert.ok(enDate.length > 0);
    assert.ok(hiDate.length > 0);
    assert.ok(enDate.includes('2025'));

    assert.equal(formatScanLanguageLabel('en', 'en'), 'English');
    assert.equal(formatScanLanguageLabel('hi', 'en'), 'Hindi');
    assert.equal(formatScanLanguageLabel('hi', 'hi'), 'हिन्दी');
    assert.equal(formatScanLanguageLabel('en', 'hi'), 'अंग्रेज़ी');
  });

  it('persists selected app language across restarts and safely defaults invalid values to English', () => {
    const storage = createMemoryStorage();
    assert.equal(loadAppLanguage(storage), 'en');

    assert.equal(saveAppLanguage('hi', storage), 'hi');
    assert.equal(storage.getItem(APP_LANGUAGE_STORAGE_KEY), 'hi');
    assert.equal(loadAppLanguage(storage), 'hi');

    assert.equal(saveAppLanguage('en', storage), 'en');
    assert.equal(loadAppLanguage(storage), 'en');

    storage.setItem(APP_LANGUAGE_STORAGE_KEY, 'unsupported-code');
    assert.equal(loadAppLanguage(storage), 'en');
  });
});
