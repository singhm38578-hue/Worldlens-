import type {
  AppLanguage,
  LocalScanHistoryItem,
  LocalTranslationRecord,
  ScanImageSource,
  VisualConfidenceLevel,
  VisualRecognitionReport,
} from '../domain/models';

export const APP_VERSION = '1.0.0';
export const APP_BUILD = 1;
export const APP_LANGUAGE_STORAGE_KEY = 'worldlens_app_language_v1';
export const SCAN_HISTORY_STORAGE_KEY = 'worldlens_local_scans_v1';
export const TRANSLATION_HISTORY_STORAGE_KEY = 'worldlens_local_translations_v1';
export const MAX_LOCAL_HISTORY_ITEMS = 100;
export const MAX_SAFE_THUMBNAIL_CHARS = 40_000;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type StorageErrorCallback = (reason: string) => void;

const VALID_CONFIDENCE_LEVELS = new Set<VisualConfidenceLevel>([
  'high',
  'moderate',
  'low',
  'uncertain',
]);

const VALID_TRANSLATION_MODES = new Set<LocalTranslationRecord['mode']>([
  'text',
  'camera',
  'voice',
  'conversation',
]);

const SAFE_THUMBNAIL_PREFIXES = [
  'data:image/jpeg;base64,',
  'data:image/png;base64,',
  'data:image/webp;base64,',
];

function resolveStorage(storage?: StorageLike | null): StorageLike | null {
  if (storage !== undefined) {
    return storage;
  }
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function createRecordId(prefix: string): string {
  const randomSuffix = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now()}-${randomSuffix}`;
}

export function sanitizeSafeThumbnailDataUrl(candidate: unknown): string | undefined {
  if (typeof candidate !== 'string') return undefined;
  const trimmed = candidate.trim();
  if (!trimmed || trimmed.length > MAX_SAFE_THUMBNAIL_CHARS) return undefined;
  const hasSafePrefix = SAFE_THUMBNAIL_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
  return hasSafePrefix ? trimmed : undefined;
}

function isValidScanItem(candidate: unknown): candidate is LocalScanHistoryItem {
  if (!candidate || typeof candidate !== 'object') return false;
  const item = candidate as Partial<LocalScanHistoryItem>;
  if (
    typeof item.id !== 'string' ||
    !item.id.trim() ||
    typeof item.timestamp !== 'number' ||
    !Number.isFinite(item.timestamp) ||
    !item.report ||
    typeof item.report !== 'object'
  ) {
    return false;
  }

  const report = item.report as Partial<VisualRecognitionReport>;
  if (typeof report.objectName !== 'string' || !report.objectName.trim()) {
    return false;
  }

  return true;
}

function normalizeScanItem(item: LocalScanHistoryItem): LocalScanHistoryItem {
  const confidenceLevel: VisualConfidenceLevel = VALID_CONFIDENCE_LEVELS.has(
    item.report.confidenceLevel
  )
    ? item.report.confidenceLevel
    : 'moderate';

  const sourceLabel: ScanImageSource = item.sourceLabel === 'camera' ? 'camera' : 'gallery';
  const language: AppLanguage = item.language === 'hi' ? 'hi' : 'en';
  const safeThumbnail = sanitizeSafeThumbnailDataUrl(item.thumbnailDataUrl);

  return {
    id: item.id,
    report: {
      objectName: item.report.objectName.trim(),
      category:
        typeof item.report.category === 'string' && item.report.category.trim()
          ? item.report.category.trim()
          : 'General',
      explanation: typeof item.report.explanation === 'string' ? item.report.explanation.trim() : '',
      characteristics: Array.isArray(item.report.characteristics)
        ? item.report.characteristics.filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
        : [],
      usefulFacts: Array.isArray(item.report.usefulFacts)
        ? item.report.usefulFacts.filter((f): f is string => typeof f === 'string' && f.trim().length > 0)
        : [],
      confidenceLevel,
      confidenceExplanation:
        typeof item.report.confidenceExplanation === 'string'
          ? item.report.confidenceExplanation.trim()
          : '',
    },
    language,
    modelName: typeof item.modelName === 'string' && item.modelName.trim() ? item.modelName : 'gemini',
    sourceLabel,
    timestamp: item.timestamp,
    ...(safeThumbnail ? { thumbnailDataUrl: safeThumbnail } : {}),
  };
}

function isValidTranslationRecord(candidate: unknown): candidate is LocalTranslationRecord {
  if (!candidate || typeof candidate !== 'object') return false;
  const rec = candidate as Partial<LocalTranslationRecord>;
  return (
    typeof rec.id === 'string' &&
    rec.id.trim().length > 0 &&
    typeof rec.mode === 'string' &&
    VALID_TRANSLATION_MODES.has(rec.mode as LocalTranslationRecord['mode']) &&
    typeof rec.sourceLanguageCode === 'string' &&
    typeof rec.sourceLanguageName === 'string' &&
    typeof rec.targetLanguageCode === 'string' &&
    typeof rec.targetLanguageName === 'string' &&
    typeof rec.sourceText === 'string' &&
    typeof rec.translatedText === 'string' &&
    typeof rec.timestamp === 'number' &&
    Number.isFinite(rec.timestamp)
  );
}

function persistScanListSafely(
  items: LocalScanHistoryItem[],
  storage?: StorageLike | null,
  onError?: StorageErrorCallback
): LocalScanHistoryItem[] {
  const capped = items.slice(0, MAX_LOCAL_HISTORY_ITEMS);
  const store = resolveStorage(storage);
  if (!store) {
    onError?.('Local device storage is unavailable.');
    return capped;
  }

  try {
    store.setItem(SCAN_HISTORY_STORAGE_KEY, JSON.stringify(capped));
    return capped;
  } catch {
    // Graceful quota fallback: strip thumbnails from older entries first, then all thumbnails if needed
    const keepNewestThumbnails = capped.map((item, idx) => {
      if (idx < 5) return item;
      const { thumbnailDataUrl: _omit, ...rest } = item;
      return rest;
    });
    try {
      store.setItem(SCAN_HISTORY_STORAGE_KEY, JSON.stringify(keepNewestThumbnails));
      return keepNewestThumbnails;
    } catch {
      const textOnly = capped.map(({ thumbnailDataUrl: _omit, ...rest }) => rest);
      try {
        store.setItem(SCAN_HISTORY_STORAGE_KEY, JSON.stringify(textOnly));
        return textOnly;
      } catch (err) {
        onError?.(
          err instanceof Error && err.message
            ? err.message
            : 'Unable to save scan history to local storage.'
        );
        return capped;
      }
    }
  }
}

function persistList<T>(
  key: string,
  items: T[],
  storage?: StorageLike | null,
  onError?: StorageErrorCallback
): void {
  const store = resolveStorage(storage);
  if (!store) {
    onError?.('Local device storage is unavailable.');
    return;
  }
  try {
    store.setItem(key, JSON.stringify(items.slice(0, MAX_LOCAL_HISTORY_ITEMS)));
  } catch (err) {
    onError?.(
      err instanceof Error && err.message
        ? err.message
        : 'Unable to write to local device storage.'
    );
  }
}

/**
 * Loads all locally persisted scan results ordered newest-first.
 * Never returns fake or placeholder entries when storage is empty or corrupted.
 */
export function loadScanHistory(
  storage?: StorageLike | null,
  onError?: StorageErrorCallback
): LocalScanHistoryItem[] {
  const store = resolveStorage(storage);
  if (!store) return [];
  try {
    const raw = store.getItem(SCAN_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isValidScanItem)
      .map(normalizeScanItem)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_LOCAL_HISTORY_ITEMS);
  } catch (err) {
    onError?.(
      err instanceof Error && err.message
        ? err.message
        : 'Local scan history data could not be read.'
    );
    return [];
  }
}

/**
 * Saves a successful visual scan result locally on-device with optional compact thumbnail.
 * Never uploads personal history to any server.
 */
export function saveScanHistoryItem(
  input: Omit<LocalScanHistoryItem, 'id' | 'timestamp'> & { id?: string; timestamp?: number },
  storage?: StorageLike | null,
  onError?: StorageErrorCallback
): LocalScanHistoryItem[] {
  const existing = loadScanHistory(storage);
  const entry = normalizeScanItem({
    id: input.id ?? createRecordId('scan'),
    report: input.report,
    language: input.language,
    modelName: input.modelName,
    sourceLabel: input.sourceLabel,
    timestamp: input.timestamp ?? Date.now(),
    thumbnailDataUrl: input.thumbnailDataUrl,
  });
  const next = [entry, ...existing.filter((item) => item.id !== entry.id)]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_LOCAL_HISTORY_ITEMS);
  return persistScanListSafely(next, storage, onError);
}

export function deleteScanHistoryItem(
  id: string,
  storage?: StorageLike | null,
  onError?: StorageErrorCallback
): LocalScanHistoryItem[] {
  const existing = loadScanHistory(storage);
  const next = existing.filter((item) => item.id !== id);
  return persistScanListSafely(next, storage, onError);
}

export function clearScanHistory(
  storage?: StorageLike | null,
  onError?: StorageErrorCallback
): LocalScanHistoryItem[] {
  const store = resolveStorage(storage);
  if (store) {
    try {
      store.removeItem(SCAN_HISTORY_STORAGE_KEY);
    } catch (err) {
      onError?.(
        err instanceof Error && err.message
          ? err.message
          : 'Unable to clear local scan history.'
      );
    }
  }
  return [];
}

/**
 * Loads all locally persisted translations ordered newest-first.
 * Never returns fake or placeholder entries when storage is empty or corrupted.
 */
export function loadTranslationHistory(
  storage?: StorageLike | null,
  onError?: StorageErrorCallback
): LocalTranslationRecord[] {
  const store = resolveStorage(storage);
  if (!store) return [];
  try {
    const raw = store.getItem(TRANSLATION_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isValidTranslationRecord)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_LOCAL_HISTORY_ITEMS);
  } catch (err) {
    onError?.(
      err instanceof Error && err.message
        ? err.message
        : 'Local translation history data could not be read.'
    );
    return [];
  }
}

export function saveTranslationHistoryItem(
  input: Omit<LocalTranslationRecord, 'id' | 'timestamp'> & { id?: string; timestamp?: number },
  storage?: StorageLike | null,
  onError?: StorageErrorCallback
): LocalTranslationRecord[] {
  const existing = loadTranslationHistory(storage);
  const entry: LocalTranslationRecord = {
    id: input.id ?? createRecordId('tr'),
    mode: input.mode,
    sourceLanguageCode: input.sourceLanguageCode,
    sourceLanguageName: input.sourceLanguageName,
    targetLanguageCode: input.targetLanguageCode,
    targetLanguageName: input.targetLanguageName,
    sourceText: input.sourceText,
    translatedText: input.translatedText,
    timestamp: input.timestamp ?? Date.now(),
  };
  const next = [entry, ...existing.filter((item) => item.id !== entry.id)]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_LOCAL_HISTORY_ITEMS);
  persistList(TRANSLATION_HISTORY_STORAGE_KEY, next, storage, onError);
  return next;
}

export function deleteTranslationHistoryItem(
  id: string,
  storage?: StorageLike | null,
  onError?: StorageErrorCallback
): LocalTranslationRecord[] {
  const existing = loadTranslationHistory(storage);
  const next = existing.filter((item) => item.id !== id);
  persistList(TRANSLATION_HISTORY_STORAGE_KEY, next, storage, onError);
  return next;
}

export function clearTranslationHistory(
  storage?: StorageLike | null,
  onError?: StorageErrorCallback
): LocalTranslationRecord[] {
  const store = resolveStorage(storage);
  if (store) {
    try {
      store.removeItem(TRANSLATION_HISTORY_STORAGE_KEY);
    } catch (err) {
      onError?.(
        err instanceof Error && err.message
          ? err.message
          : 'Unable to clear local translation history.'
      );
    }
  }
  return [];
}

/**
 * Formats the saved scan language ('en' or 'hi') cleanly for the current UI language.
 */
export function formatScanLanguageLabel(
  scanLanguage: AppLanguage,
  uiLanguage: AppLanguage
): string {
  if (scanLanguage === 'hi') {
    return uiLanguage === 'hi' ? 'हिन्दी' : 'Hindi';
  }
  return uiLanguage === 'hi' ? 'अंग्रेज़ी' : 'English';
}

/**
 * Formats a Unix epoch timestamp into a clear localized date and time string.
 */
export function formatHistoryDateTime(timestamp: number, language: AppLanguage): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const locale = language === 'hi' ? 'hi-IN' : 'en-US';
  try {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

/**
 * Loads the persisted UI language ('en' or 'hi') from local device storage.
 * Safely defaults to 'en' when unset or invalid.
 */
export function loadAppLanguage(storage?: StorageLike | null): AppLanguage {
  const store = resolveStorage(storage);
  if (!store) return 'en';
  try {
    const raw = store.getItem(APP_LANGUAGE_STORAGE_KEY);
    return raw === 'hi' ? 'hi' : 'en';
  } catch {
    return 'en';
  }
}

/**
 * Persists the user's selected UI language locally across app restarts.
 */
export function saveAppLanguage(
  language: AppLanguage,
  storage?: StorageLike | null
): AppLanguage {
  const normalized: AppLanguage = language === 'hi' ? 'hi' : 'en';
  const store = resolveStorage(storage);
  if (store) {
    try {
      store.setItem(APP_LANGUAGE_STORAGE_KEY, normalized);
    } catch {
      // Ignore storage errors safely without interrupting UI
    }
  }
  return normalized;
}
