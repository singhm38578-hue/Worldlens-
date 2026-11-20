import crypto from 'crypto';
import { ThinkingLevel } from '@google/genai';

export type GeminiFeatureKey =
  | 'vision_scan'
  | 'text_translate'
  | 'camera_translate'
  | 'voice_translate'
  | 'conversation_translate';

export interface FeatureUsageCounters {
  geminiCalls: number;
  cacheHits: number;
  dedupedCalls: number;
  quotaErrors: number;
  otherErrors: number;
  totalLatencyMs: number;
  promptTokens: number;
  outputTokens: number;
}

export interface UsageSummarySnapshot {
  models: {
    vision: string;
    translation: string;
  };
  totals: {
    geminiCalls: number;
    cacheHits: number;
    dedupedCalls: number;
    quotaErrors: number;
    otherErrors: number;
    promptTokens: number;
    outputTokens: number;
  };
  topQuotaFeature: GeminiFeatureKey | null;
  features: Record<GeminiFeatureKey, FeatureUsageCounters & { avgLatencyMs: number }>;
  cacheSize: number;
  inFlightCount: number;
}

export interface ClassifiedGeminiError {
  status: number;
  errorType: 'NETWORK' | 'QUOTA_EXCEEDED' | 'INVALID_IMAGE' | 'AI_UNAVAILABLE' | 'UNKNOWN';
  detail: string;
  retryable: boolean;
  retryAfterSeconds?: number;
}

/**
 * Resolves the active Gemini model from optional environment overrides,
 * defaulting to 'gemini-3.1-flash-lite' — the fastest free-tier compatible
 * multimodal model supporting ThinkingLevel.MINIMAL (no wasted thinking tokens).
 */
export const DEFAULT_FAST_GEMINI_MODEL = 'gemini-3.1-flash-lite';

export function resolveConfiguredModel(envValue: string | undefined): string {
  const trimmed = envValue?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_FAST_GEMINI_MODEL;
}

/**
 * Returns the fastest valid ThinkingLevel for the configured Gemini model:
 * - 'gemini-3.1-flash-lite' -> ThinkingLevel.MINIMAL (equivalent to no thinking)
 * - 'gemini-4-*' -> ThinkingLevel.LOW (MINIMAL returns 400 on Gemini 4 series)
 */
export function resolveFastThinkingLevel(modelName: string): ThinkingLevel {
  const lower = modelName.trim().toLowerCase();
  if (lower.startsWith('gemini-3.1-flash-lite')) {
    return ThinkingLevel.MINIMAL;
  }
  return ThinkingLevel.LOW;
}

export function createRequestHash(parts: string[]): string {
  const hash = crypto.createHash('sha256');
  for (const part of parts) {
    hash.update(part);
    hash.update('\u0000');
  }
  return hash.digest('hex');
}

function extractRetryAfterSeconds(rawMessage: string): number {
  const secMatch = rawMessage.match(/retry(?:\s+in|\s+after)?\s+(\d+(?:\.\d+)?)\s*s/i);
  if (secMatch) {
    const parsed = Math.ceil(Number(secMatch[1]));
    if (Number.isFinite(parsed) && parsed > 0 && parsed <= 600) {
      return parsed;
    }
  }
  return 60;
}

export function classifyGeminiServerError(err: unknown): ClassifiedGeminiError {
  const rawMessage =
    err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unknown Gemini API error';
  const lower = rawMessage.toLowerCase();

  if (
    lower.includes('429') ||
    lower.includes('resource_exhausted') ||
    lower.includes('quota') ||
    lower.includes('rate limit') ||
    lower.includes('too many requests')
  ) {
    return {
      status: 429,
      errorType: 'QUOTA_EXCEEDED',
      detail:
        'Gemini API quota or rate limit was reached. Automatic retries have been stopped. Please wait for your quota window to reset or enable billing on your Gemini API project if needed.',
      retryable: false,
      retryAfterSeconds: extractRetryAfterSeconds(rawMessage),
    };
  }

  if (lower.includes('request_timeout') || lower.includes('timed out') || lower.includes('abort')) {
    return {
      status: 504,
      errorType: 'NETWORK',
      detail: 'The AI request timed out before completing. Please try again.',
      retryable: true,
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
      detail: 'Unable to reach Gemini API due to a transient network error.',
      retryable: true,
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
      retryable: false,
    };
  }

  if (
    lower.includes('api_key_invalid') ||
    lower.includes('permission_denied') ||
    lower.includes('403') ||
    lower.includes('401') ||
    lower.includes('not_found') ||
    lower.includes('404')
  ) {
    return {
      status: 503,
      errorType: 'AI_UNAVAILABLE',
      detail: 'Gemini AI service is currently unavailable or not configured.',
      retryable: false,
    };
  }

  if (lower.includes('503') || lower.includes('unavailable') || lower.includes('overloaded')) {
    return {
      status: 503,
      errorType: 'AI_UNAVAILABLE',
      detail: 'Gemini AI service is temporarily busy. Please try again shortly.',
      retryable: true,
    };
  }

  return {
    status: 500,
    errorType: 'UNKNOWN',
    detail: 'An unexpected error occurred while processing the AI request.',
    retryable: false,
  };
}

export async function runWithTimeoutAndSafeRetry<T>(
  operation: () => Promise<T>,
  options: {
    timeoutMs: number;
    maxTransientRetries?: number;
    retryDelayMs?: number;
  }
): Promise<T> {
  const maxRetries = options.maxTransientRetries ?? 1;
  const retryDelayMs = options.retryDelayMs ?? 800;

  let attempt = 0;
  while (true) {
    try {
      return await new Promise<T>((resolve, reject) => {
        let settled = false;
        const timer = setTimeout(() => {
          if (!settled) {
            settled = true;
            reject(new Error('REQUEST_TIMEOUT: Gemini call exceeded timeout'));
          }
        }, options.timeoutMs);

        operation().then(
          (value) => {
            if (!settled) {
              settled = true;
              clearTimeout(timer);
              resolve(value);
            }
          },
          (err) => {
            if (!settled) {
              settled = true;
              clearTimeout(timer);
              reject(err);
            }
          }
        );
      });
    } catch (err) {
      const classified = classifyGeminiServerError(err);
      // Strict guard: NEVER automatically retry HTTP 429 / quota exhaustion or 4xx client errors
      if (!classified.retryable || attempt >= maxRetries) {
        throw err;
      }
      attempt += 1;
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs * attempt));
    }
  }
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class BoundedTtlCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private readonly maxEntries: number;
  private readonly ttlMs: number;

  constructor(maxEntries = 100, ttlMs = 10 * 60 * 1000) {
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
  }

  get(key: string, now = Date.now()): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (now >= entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    // Refresh LRU order
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, now = Date.now()): void {
    if (this.store.has(key)) {
      this.store.delete(key);
    }
    while (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
      } else {
        break;
      }
    }
    this.store.set(key, { value, expiresAt: now + this.ttlMs });
  }

  get size(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }
}

function emptyCounters(): FeatureUsageCounters {
  return {
    geminiCalls: 0,
    cacheHits: 0,
    dedupedCalls: 0,
    quotaErrors: 0,
    otherErrors: 0,
    totalLatencyMs: 0,
    promptTokens: 0,
    outputTokens: 0,
  };
}

export class GeminiRequestCoordinator {
  private readonly cache = new BoundedTtlCache<unknown>(100, 10 * 60 * 1000);
  private readonly inFlight = new Map<string, Promise<unknown>>();
  private readonly stats: Record<GeminiFeatureKey, FeatureUsageCounters> = {
    vision_scan: emptyCounters(),
    text_translate: emptyCounters(),
    camera_translate: emptyCounters(),
    voice_translate: emptyCounters(),
    conversation_translate: emptyCounters(),
  };

  async execute<T>(params: {
    feature: GeminiFeatureKey;
    cacheKey: string;
    bypassCache?: boolean;
    work: () => Promise<{ data: T; promptTokens?: number; outputTokens?: number; apiCallCount?: number }>;
  }): Promise<{ data: T; cached: boolean; deduped: boolean; latencyMs: number }> {
    const startedAt = Date.now();
    const counters = this.stats[params.feature];

    if (!params.bypassCache) {
      const cached = this.cache.get(params.cacheKey) as T | undefined;
      if (cached !== undefined) {
        counters.cacheHits += 1;
        return {
          data: cached,
          cached: true,
          deduped: false,
          latencyMs: Date.now() - startedAt,
        };
      }
    }

    const existingPromise = this.inFlight.get(params.cacheKey) as Promise<T> | undefined;
    if (existingPromise) {
      counters.dedupedCalls += 1;
      const data = await existingPromise;
      return {
        data,
        cached: false,
        deduped: true,
        latencyMs: Date.now() - startedAt,
      };
    }

    const runPromise = (async () => {
      const callStart = Date.now();
      try {
        const result = await params.work();
        const elapsed = Date.now() - callStart;
        counters.geminiCalls += result.apiCallCount ?? 1;
        counters.totalLatencyMs += elapsed;
        counters.promptTokens += result.promptTokens ?? 0;
        counters.outputTokens += result.outputTokens ?? 0;
        this.cache.set(params.cacheKey, result.data);
        return result.data;
      } catch (err) {
        const classified = classifyGeminiServerError(err);
        counters.geminiCalls += 1;
        if (classified.errorType === 'QUOTA_EXCEEDED') {
          counters.quotaErrors += 1;
        } else {
          counters.otherErrors += 1;
        }
        throw err;
      } finally {
        this.inFlight.delete(params.cacheKey);
      }
    })();

    this.inFlight.set(params.cacheKey, runPromise);
    const data = await runPromise;
    return {
      data,
      cached: false,
      deduped: false,
      latencyMs: Date.now() - startedAt,
    };
  }

  getSummary(models: { vision: string; translation: string }): UsageSummarySnapshot {
    const totals = {
      geminiCalls: 0,
      cacheHits: 0,
      dedupedCalls: 0,
      quotaErrors: 0,
      otherErrors: 0,
      promptTokens: 0,
      outputTokens: 0,
    };

    let topQuotaFeature: GeminiFeatureKey | null = null;
    let topCalls = 0;

    const features = {} as Record<GeminiFeatureKey, FeatureUsageCounters & { avgLatencyMs: number }>;

    for (const key of Object.keys(this.stats) as GeminiFeatureKey[]) {
      const entry = this.stats[key];
      totals.geminiCalls += entry.geminiCalls;
      totals.cacheHits += entry.cacheHits;
      totals.dedupedCalls += entry.dedupedCalls;
      totals.quotaErrors += entry.quotaErrors;
      totals.otherErrors += entry.otherErrors;
      totals.promptTokens += entry.promptTokens;
      totals.outputTokens += entry.outputTokens;

      if (entry.geminiCalls > topCalls) {
        topCalls = entry.geminiCalls;
        topQuotaFeature = key;
      }

      const successfulCalls = Math.max(0, entry.geminiCalls - entry.quotaErrors - entry.otherErrors);
      features[key] = {
        ...entry,
        avgLatencyMs: successfulCalls > 0 ? Math.round(entry.totalLatencyMs / successfulCalls) : 0,
      };
    }

    return {
      models,
      totals,
      topQuotaFeature,
      features,
      cacheSize: this.cache.size,
      inFlightCount: this.inFlight.size,
    };
  }
}
