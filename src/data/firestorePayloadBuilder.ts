import type {
  AppLanguage,
  LocalScanHistoryItem,
  LocalTranslationRecord,
  ScanImageSource,
  VisualConfidenceLevel,
  VisualRecognitionReport,
} from '../domain/models';

/**
 * Exact limits synchronized verbatim with firebase-blueprint.json and firestore.rules.
 */
export const FIREBASE_SCHEMA_LIMITS = {
  idMaxLength: 128,
  idPattern: /^[a-zA-Z0-9_-]+$/,
  displayNameMaxLength: 120,
  objectNameMaxLength: 200,
  categoryMaxLength: 80,
  explanationMaxLength: 3000,
  listMaxItems: 10,
  listItemMaxLength: 400,
  confidenceExplanationMaxLength: 1500,
  modelNameMaxLength: 100,
  languageCodeMaxLength: 24,
  languageNameMaxLength: 80,
  sourceTextMaxLength: 5000,
  translatedTextMaxLength: 8000,
} as const;

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

function clampString(value: unknown, maxLength: number, fallback = ''): string {
  const raw = typeof value === 'string' ? value.trim() : '';
  const resolved = raw.length > 0 ? raw : fallback;
  return resolved.slice(0, maxLength);
}

function clampStringList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const cleaned: string[] = [];
  for (const item of values) {
    if (cleaned.length >= FIREBASE_SCHEMA_LIMITS.listMaxItems) break;
    if (typeof item !== 'string') continue;
    const trimmed = item.trim().slice(0, FIREBASE_SCHEMA_LIMITS.listItemMaxLength);
    if (trimmed.length > 0) {
      cleaned.push(trimmed);
    }
  }
  return cleaned;
}

export function sanitizeFirestoreDocId(candidate: string, prefix: string): string {
  const cleaned = candidate.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, FIREBASE_SCHEMA_LIMITS.idMaxLength);
  if (cleaned.length >= 1 && FIREBASE_SCHEMA_LIMITS.idPattern.test(cleaned)) {
    return cleaned;
  }
  const randomSuffix = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${randomSuffix}`.slice(0, FIREBASE_SCHEMA_LIMITS.idMaxLength);
}

export interface UserProfileDocPayload<TTimestamp> {
  ownerId: string;
  displayName: string;
  preferredLanguage: AppLanguage;
  createdAt: TTimestamp;
  updatedAt: TTimestamp;
}

export interface UserProfileUpdatePayload<TTimestamp> {
  displayName?: string;
  preferredLanguage?: AppLanguage;
  updatedAt: TTimestamp;
}

export interface ScanRecordDocPayload<TTimestamp> {
  ownerId: string;
  objectName: string;
  category: string;
  explanation: string;
  characteristics: string[];
  usefulFacts: string[];
  confidenceLevel: VisualConfidenceLevel;
  confidenceExplanation: string;
  language: AppLanguage;
  modelName: string;
  sourceLabel: ScanImageSource;
  createdAt: TTimestamp;
}

export interface TranslationRecordDocPayload<TTimestamp> {
  ownerId: string;
  mode: LocalTranslationRecord['mode'];
  sourceLanguageCode: string;
  sourceLanguageName: string;
  targetLanguageCode: string;
  targetLanguageName: string;
  sourceText: string;
  translatedText: string;
  createdAt: TTimestamp;
}

export function buildUserProfileCreatePayload<TTimestamp>(params: {
  ownerId: string;
  displayName: string | null | undefined;
  preferredLanguage: AppLanguage;
  timestamp: TTimestamp;
}): UserProfileDocPayload<TTimestamp> {
  return {
    ownerId: clampString(params.ownerId, FIREBASE_SCHEMA_LIMITS.idMaxLength),
    displayName: clampString(params.displayName ?? '', FIREBASE_SCHEMA_LIMITS.displayNameMaxLength),
    preferredLanguage: params.preferredLanguage === 'hi' ? 'hi' : 'en',
    createdAt: params.timestamp,
    updatedAt: params.timestamp,
  };
}

export function buildUserProfileUpdatePayload<TTimestamp>(params: {
  displayName?: string | null;
  preferredLanguage?: AppLanguage;
  timestamp: TTimestamp;
}): UserProfileUpdatePayload<TTimestamp> {
  const payload: UserProfileUpdatePayload<TTimestamp> = {
    updatedAt: params.timestamp,
  };
  if (params.displayName !== undefined) {
    payload.displayName = clampString(params.displayName ?? '', FIREBASE_SCHEMA_LIMITS.displayNameMaxLength);
  }
  if (params.preferredLanguage !== undefined) {
    payload.preferredLanguage = params.preferredLanguage === 'hi' ? 'hi' : 'en';
  }
  return payload;
}

export function buildScanRecordPayload<TTimestamp>(params: {
  ownerId: string;
  report: VisualRecognitionReport;
  language: AppLanguage;
  modelName: string;
  sourceLabel: ScanImageSource;
  timestamp: TTimestamp;
}): ScanRecordDocPayload<TTimestamp> {
  const confidenceLevel: VisualConfidenceLevel = VALID_CONFIDENCE_LEVELS.has(
    params.report.confidenceLevel
  )
    ? params.report.confidenceLevel
    : 'moderate';

  return {
    ownerId: clampString(params.ownerId, FIREBASE_SCHEMA_LIMITS.idMaxLength),
    objectName: clampString(
      params.report.objectName,
      FIREBASE_SCHEMA_LIMITS.objectNameMaxLength,
      'Unidentified subject'
    ),
    category: clampString(
      params.report.category,
      FIREBASE_SCHEMA_LIMITS.categoryMaxLength,
      'General'
    ),
    explanation: clampString(
      params.report.explanation,
      FIREBASE_SCHEMA_LIMITS.explanationMaxLength,
      'No explanation provided.'
    ),
    characteristics: clampStringList(params.report.characteristics),
    usefulFacts: clampStringList(params.report.usefulFacts),
    confidenceLevel,
    confidenceExplanation: clampString(
      params.report.confidenceExplanation,
      FIREBASE_SCHEMA_LIMITS.confidenceExplanationMaxLength
    ),
    language: params.language === 'hi' ? 'hi' : 'en',
    modelName: clampString(params.modelName, FIREBASE_SCHEMA_LIMITS.modelNameMaxLength, 'gemini'),
    sourceLabel: params.sourceLabel === 'camera' ? 'camera' : 'gallery',
    createdAt: params.timestamp,
  };
}

export function buildTranslationRecordPayload<TTimestamp>(params: {
  ownerId: string;
  record: Omit<LocalTranslationRecord, 'id' | 'timestamp'>;
  timestamp: TTimestamp;
}): TranslationRecordDocPayload<TTimestamp> {
  const mode: LocalTranslationRecord['mode'] = VALID_TRANSLATION_MODES.has(params.record.mode)
    ? params.record.mode
    : 'text';

  return {
    ownerId: clampString(params.ownerId, FIREBASE_SCHEMA_LIMITS.idMaxLength),
    mode,
    sourceLanguageCode: clampString(
      params.record.sourceLanguageCode,
      FIREBASE_SCHEMA_LIMITS.languageCodeMaxLength,
      'auto'
    ),
    sourceLanguageName: clampString(
      params.record.sourceLanguageName,
      FIREBASE_SCHEMA_LIMITS.languageNameMaxLength,
      'Auto-detect'
    ),
    targetLanguageCode: clampString(
      params.record.targetLanguageCode,
      FIREBASE_SCHEMA_LIMITS.languageCodeMaxLength,
      'en'
    ),
    targetLanguageName: clampString(
      params.record.targetLanguageName,
      FIREBASE_SCHEMA_LIMITS.languageNameMaxLength,
      'English'
    ),
    sourceText: clampString(params.record.sourceText, FIREBASE_SCHEMA_LIMITS.sourceTextMaxLength, ' '),
    translatedText: clampString(
      params.record.translatedText,
      FIREBASE_SCHEMA_LIMITS.translatedTextMaxLength,
      ' '
    ),
    createdAt: params.timestamp,
  };
}

function resolveTimestampMs(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (
    value &&
    typeof value === 'object' &&
    'toMillis' in value &&
    typeof (value as { toMillis?: unknown }).toMillis === 'function'
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  return Date.now();
}

export function mapFirestoreScanDoc(
  id: string,
  data: Record<string, unknown>
): LocalScanHistoryItem {
  const rawConfidence = data.confidenceLevel;
  const confidenceLevel: VisualConfidenceLevel =
    typeof rawConfidence === 'string' &&
    VALID_CONFIDENCE_LEVELS.has(rawConfidence as VisualConfidenceLevel)
      ? (rawConfidence as VisualConfidenceLevel)
      : 'moderate';

  return {
    id,
    report: {
      objectName: clampString(data.objectName, FIREBASE_SCHEMA_LIMITS.objectNameMaxLength, 'Scan'),
      category: clampString(data.category, FIREBASE_SCHEMA_LIMITS.categoryMaxLength, 'General'),
      explanation: clampString(data.explanation, FIREBASE_SCHEMA_LIMITS.explanationMaxLength),
      characteristics: clampStringList(data.characteristics),
      usefulFacts: clampStringList(data.usefulFacts),
      confidenceLevel,
      confidenceExplanation: clampString(
        data.confidenceExplanation,
        FIREBASE_SCHEMA_LIMITS.confidenceExplanationMaxLength
      ),
    },
    language: data.language === 'hi' ? 'hi' : 'en',
    modelName: clampString(data.modelName, FIREBASE_SCHEMA_LIMITS.modelNameMaxLength, 'gemini'),
    sourceLabel: data.sourceLabel === 'camera' ? 'camera' : 'gallery',
    timestamp: resolveTimestampMs(data.createdAt),
  };
}

export function mapFirestoreTranslationDoc(
  id: string,
  data: Record<string, unknown>
): LocalTranslationRecord {
  const rawMode = data.mode;
  const mode: LocalTranslationRecord['mode'] =
    typeof rawMode === 'string' &&
    VALID_TRANSLATION_MODES.has(rawMode as LocalTranslationRecord['mode'])
      ? (rawMode as LocalTranslationRecord['mode'])
      : 'text';

  return {
    id,
    mode,
    sourceLanguageCode: clampString(
      data.sourceLanguageCode,
      FIREBASE_SCHEMA_LIMITS.languageCodeMaxLength,
      'auto'
    ),
    sourceLanguageName: clampString(
      data.sourceLanguageName,
      FIREBASE_SCHEMA_LIMITS.languageNameMaxLength,
      'Auto-detect'
    ),
    targetLanguageCode: clampString(
      data.targetLanguageCode,
      FIREBASE_SCHEMA_LIMITS.languageCodeMaxLength,
      'en'
    ),
    targetLanguageName: clampString(
      data.targetLanguageName,
      FIREBASE_SCHEMA_LIMITS.languageNameMaxLength,
      'English'
    ),
    sourceText: clampString(data.sourceText, FIREBASE_SCHEMA_LIMITS.sourceTextMaxLength),
    translatedText: clampString(data.translatedText, FIREBASE_SCHEMA_LIMITS.translatedTextMaxLength),
    timestamp: resolveTimestampMs(data.createdAt),
  };
}
