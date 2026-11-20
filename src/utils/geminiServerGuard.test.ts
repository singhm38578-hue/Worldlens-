import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ThinkingLevel } from '@google/genai';
import {
  BoundedTtlCache,
  DEFAULT_FAST_GEMINI_MODEL,
  GeminiRequestCoordinator,
  classifyGeminiServerError,
  createRequestHash,
  resolveConfiguredModel,
  resolveFastThinkingLevel,
  runWithTimeoutAndSafeRetry,
} from './geminiServerGuard.ts';

describe('Gemini Speed & Quota Guardrails', () => {
  it('resolves default fast Gemini model and compatible ThinkingLevel', () => {
    assert.equal(resolveConfiguredModel(undefined), DEFAULT_FAST_GEMINI_MODEL);
    assert.equal(resolveConfiguredModel('   '), 'gemini-3.1-flash-lite');
    assert.equal(resolveConfiguredModel('gemini-4-hydrogen'), 'gemini-4-hydrogen');

    assert.equal(resolveFastThinkingLevel('gemini-3.1-flash-lite'), ThinkingLevel.MINIMAL);
    assert.equal(resolveFastThinkingLevel('gemini-4-hydrogen'), ThinkingLevel.LOW);
  });

  it('classifies HTTP 429 / RESOURCE_EXHAUSTED as non-retryable with retryAfterSeconds', () => {
    const quotaErr = classifyGeminiServerError(
      new Error('429 RESOURCE_EXHAUSTED: Quota exceeded. Please retry in 42s.')
    );
    assert.equal(quotaErr.status, 429);
    assert.equal(quotaErr.errorType, 'QUOTA_EXCEEDED');
    assert.equal(quotaErr.retryable, false);
    assert.equal(quotaErr.retryAfterSeconds, 42);

    const defaultRetryErr = classifyGeminiServerError(new Error('Rate limit reached'));
    assert.equal(defaultRetryErr.errorType, 'QUOTA_EXCEEDED');
    assert.equal(defaultRetryErr.retryable, false);
    assert.equal(defaultRetryErr.retryAfterSeconds, 60);
  });

  it('stops immediately with ZERO automatic retries on HTTP 429 / quota exhaustion', async () => {
    let calls = 0;
    await assert.rejects(
      () =>
        runWithTimeoutAndSafeRetry(
          async () => {
            calls += 1;
            throw new Error('429 RESOURCE_EXHAUSTED: Too many requests');
          },
          { timeoutMs: 2000, maxTransientRetries: 2, retryDelayMs: 10 }
        ),
      /429/
    );
    assert.equal(calls, 1, 'Expected strictly 1 call and 0 retries on HTTP 429');
  });

  it('retries once on transient 503 error and succeeds', async () => {
    let calls = 0;
    const result = await runWithTimeoutAndSafeRetry(
      async () => {
        calls += 1;
        if (calls === 1) {
          throw new Error('503 Service temporarily overloaded');
        }
        return 'ok';
      },
      { timeoutMs: 2000, maxTransientRetries: 1, retryDelayMs: 10 }
    );
    assert.equal(result, 'ok');
    assert.equal(calls, 2);
  });

  it('aborts hung calls after timeoutMs', async () => {
    let calls = 0;
    await assert.rejects(
      () =>
        runWithTimeoutAndSafeRetry(
          async () => {
            calls += 1;
            await new Promise((resolve) => setTimeout(resolve, 250));
            return 'late';
          },
          { timeoutMs: 30, maxTransientRetries: 0 }
        ),
      /REQUEST_TIMEOUT/
    );
    assert.equal(calls, 1);
  });

  it('BoundedTtlCache evicts oldest LRU entry and expires stale entries', () => {
    const cache = new BoundedTtlCache<string>(2, 1000);
    cache.set('a', '1', 100);
    cache.set('b', '2', 200);
    // Touch 'a' so 'b' becomes oldest
    assert.equal(cache.get('a', 300), '1');
    cache.set('c', '3', 400);
    assert.equal(cache.get('b', 450), undefined);
    assert.equal(cache.get('a', 450), '1');
    assert.equal(cache.get('c', 450), '3');
    // Expire 'a' past TTL
    assert.equal(cache.get('a', 1200), undefined);
  });

  it('GeminiRequestCoordinator caches identical results, coalesces concurrent taps, never caches errors, and tracks top quota feature', async () => {
    const coordinator = new GeminiRequestCoordinator();
    const key1 = createRequestHash(['text', 'en', 'hi', 'Hello world']);
    let workCalls = 0;

    // Fire 2 simultaneous identical requests -> must coalesce into 1 Gemini call
    const [first, second] = await Promise.all([
      coordinator.execute({
        feature: 'text_translate',
        cacheKey: key1,
        work: async () => {
          workCalls += 1;
          await new Promise((resolve) => setTimeout(resolve, 25));
          return { data: { translatedText: 'नमस्ते दुनिया' }, promptTokens: 20, outputTokens: 10 };
        },
      }),
      coordinator.execute({
        feature: 'text_translate',
        cacheKey: key1,
        work: async () => {
          workCalls += 1;
          return { data: { translatedText: 'should not run' } };
        },
      }),
    ]);

    assert.equal(workCalls, 1, 'Concurrent duplicate requests must invoke Gemini only once');
    assert.equal(first.data.translatedText, 'नमस्ते दुनिया');
    assert.equal(second.data.translatedText, 'नमस्ते दुनिया');
    assert.equal(first.deduped || second.deduped, true);

    // Subsequent identical request -> served from cache with 0 additional calls
    const third = await coordinator.execute({
      feature: 'text_translate',
      cacheKey: key1,
      work: async () => {
        workCalls += 1;
        return { data: { translatedText: 'unexpected' } };
      },
    });
    assert.equal(workCalls, 1);
    assert.equal(third.cached, true);

    // Errors are never cached
    const errKey = createRequestHash(['scan', 'en', 'bad']);
    await assert.rejects(() =>
      coordinator.execute({
        feature: 'vision_scan',
        cacheKey: errKey,
        work: async () => {
          throw new Error('429 RESOURCE_EXHAUSTED');
        },
      })
    );

    // Run 2 vision_scan calls to make vision_scan the top consumer
    await coordinator.execute({
      feature: 'vision_scan',
      cacheKey: createRequestHash(['scan', 'en', 'img-1']),
      work: async () => ({ data: { objectName: 'Coffee Mug' }, promptTokens: 300, outputTokens: 80 }),
    });
    await coordinator.execute({
      feature: 'vision_scan',
      cacheKey: createRequestHash(['scan', 'en', 'img-2']),
      work: async () => ({ data: { objectName: 'Notebook' }, promptTokens: 280, outputTokens: 70 }),
    });

    const summary = coordinator.getSummary({
      vision: 'gemini-3.1-flash-lite',
      translation: 'gemini-3.1-flash-lite',
    });

    assert.equal(summary.totals.cacheHits, 1);
    assert.equal(summary.totals.dedupedCalls, 1);
    assert.equal(summary.totals.quotaErrors, 1);
    assert.equal(summary.features.text_translate.geminiCalls, 1);
    assert.equal(summary.features.vision_scan.geminiCalls, 3); // 1 failed 429 + 2 successes
    assert.equal(summary.topQuotaFeature, 'vision_scan');
  });
});
