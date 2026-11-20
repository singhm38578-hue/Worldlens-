export type TrackedAiFeature =
  | 'vision_scan'
  | 'text_translate'
  | 'camera_translate'
  | 'voice_translate'
  | 'conversation_translate';

export interface FeatureUsageRecord {
  apiCalls: number;
  cacheHits: number;
  quotaErrors: number;
  lastLatencyMs: number | null;
}

export interface LocalAiUsageStats {
  features: Record<TrackedAiFeature, FeatureUsageRecord>;
  lastModelUsed: string | null;
  updatedAt: number;
}

export const AI_USAGE_STORAGE_KEY = 'worldlens_ai_usage_v1';
const QUOTA_COOLDOWN_KEY = 'worldlens_quota_cooldown_until_v1';

const ALL_FEATURES: TrackedAiFeature[] = [
  'vision_scan',
  'text_translate',
  'camera_translate',
  'voice_translate',
  'conversation_translate',
];

function createEmptyFeatureRecord(): FeatureUsageRecord {
  return {
    apiCalls: 0,
    cacheHits: 0,
    quotaErrors: 0,
    lastLatencyMs: null,
  };
}

export function createEmptyUsageStats(): LocalAiUsageStats {
  return {
    features: {
      vision_scan: createEmptyFeatureRecord(),
      text_translate: createEmptyFeatureRecord(),
      camera_translate: createEmptyFeatureRecord(),
      voice_translate: createEmptyFeatureRecord(),
      conversation_translate: createEmptyFeatureRecord(),
    },
    lastModelUsed: null,
    updatedAt: Date.now(),
  };
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadAiUsageStats(): LocalAiUsageStats {
  const store = getStorage();
  if (!store) return createEmptyUsageStats();
  try {
    const raw = store.getItem(AI_USAGE_STORAGE_KEY);
    if (!raw) return createEmptyUsageStats();
    const parsed = JSON.parse(raw) as Partial<LocalAiUsageStats>;
    const base = createEmptyUsageStats();
    for (const key of ALL_FEATURES) {
      const candidate = parsed.features?.[key];
      if (candidate && typeof candidate === 'object') {
        base.features[key] = {
          apiCalls: typeof candidate.apiCalls === 'number' && candidate.apiCalls >= 0 ? candidate.apiCalls : 0,
          cacheHits: typeof candidate.cacheHits === 'number' && candidate.cacheHits >= 0 ? candidate.cacheHits : 0,
          quotaErrors:
            typeof candidate.quotaErrors === 'number' && candidate.quotaErrors >= 0
              ? candidate.quotaErrors
              : 0,
          lastLatencyMs:
            typeof candidate.lastLatencyMs === 'number' && Number.isFinite(candidate.lastLatencyMs)
              ? candidate.lastLatencyMs
              : null,
        };
      }
    }
    base.lastModelUsed = typeof parsed.lastModelUsed === 'string' ? parsed.lastModelUsed : null;
    base.updatedAt = typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now();
    return base;
  } catch {
    return createEmptyUsageStats();
  }
}

function saveAiUsageStats(stats: LocalAiUsageStats): LocalAiUsageStats {
  const store = getStorage();
  if (store) {
    try {
      store.setItem(AI_USAGE_STORAGE_KEY, JSON.stringify(stats));
    } catch {
      // Ignore quota errors in localStorage
    }
  }
  return stats;
}

export function recordAiUsageEvent(params: {
  feature: TrackedAiFeature;
  cached?: boolean;
  quotaError?: boolean;
  latencyMs?: number;
  modelName?: string;
}): LocalAiUsageStats {
  const stats = loadAiUsageStats();
  const bucket = stats.features[params.feature];
  if (params.cached) {
    bucket.cacheHits += 1;
  } else {
    bucket.apiCalls += 1;
  }
  if (params.quotaError) {
    bucket.quotaErrors += 1;
  }
  if (typeof params.latencyMs === 'number' && Number.isFinite(params.latencyMs) && params.latencyMs >= 0) {
    bucket.lastLatencyMs = Math.round(params.latencyMs);
  }
  if (params.modelName) {
    stats.lastModelUsed = params.modelName;
  }
  stats.updatedAt = Date.now();
  return saveAiUsageStats(stats);
}

export function resetAiUsageStats(): LocalAiUsageStats {
  const empty = createEmptyUsageStats();
  return saveAiUsageStats(empty);
}

export function getTopUsageFeature(stats: LocalAiUsageStats): TrackedAiFeature | null {
  let topFeature: TrackedAiFeature | null = null;
  let maxCalls = 0;
  for (const key of ALL_FEATURES) {
    const calls = stats.features[key].apiCalls;
    if (calls > maxCalls) {
      maxCalls = calls;
      topFeature = key;
    }
  }
  return topFeature;
}

export function setQuotaCooldown(seconds: number): number {
  const clamped = Math.max(15, Math.min(300, Math.ceil(seconds || 60)));
  const until = Date.now() + clamped * 1000;
  const store = getStorage();
  if (store) {
    try {
      store.setItem(QUOTA_COOLDOWN_KEY, String(until));
    } catch {
      // Ignore storage failures
    }
  }
  return until;
}

export function getQuotaCooldownUntil(): number {
  const store = getStorage();
  if (!store) return 0;
  try {
    const raw = store.getItem(QUOTA_COOLDOWN_KEY);
    const parsed = raw ? Number(raw) : 0;
    if (!Number.isFinite(parsed) || parsed <= Date.now()) {
      return 0;
    }
    return parsed;
  } catch {
    return 0;
  }
}

export function getQuotaCooldownRemainingSeconds(): number {
  const until = getQuotaCooldownUntil();
  if (until <= 0) return 0;
  return Math.max(0, Math.ceil((until - Date.now()) / 1000));
}
