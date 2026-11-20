/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AiAnalysisState,
  AppLanguage,
  LocalScanHistoryItem,
  LocalTranslationRecord,
  ScanAnalysisError,
  ScannerMode,
  ScreenRoute,
  SelectedScanImage,
  VisualRecognitionReport,
} from './domain/models';
import { STRINGS } from './data/localization';
import {
  clearScanHistory,
  clearTranslationHistory,
  deleteScanHistoryItem,
  deleteTranslationHistoryItem,
  loadAppLanguage,
  loadScanHistory,
  loadTranslationHistory,
  saveAppLanguage,
  saveScanHistoryItem,
  saveTranslationHistoryItem,
} from './data/localHistoryStore';
import {
  clearAllCloudScans,
  clearAllCloudTranslations,
  deleteCloudScan,
  deleteCloudTranslation,
  saveCloudScan,
  saveCloudTranslation,
  subscribeToUserProfile,
  subscribeToUserScans,
  subscribeToUserTranslations,
  updateUserLanguagePreference,
} from './data/firestoreHistoryService';
import { useFirebaseAuth } from './context/FirebaseContext';
import {
  getQuotaCooldownRemainingSeconds,
  loadAiUsageStats,
  recordAiUsageEvent,
  resetAiUsageStats,
  setQuotaCooldown,
  type LocalAiUsageStats,
} from './data/usageTracker';
import { createSafeThumbnailDataUrl, decodeAndResizeImageUri } from './utils/imageEncoder';
import { AppShell } from './components/AppShell';
import { AndroidSourceModal } from './components/AndroidSourceModal';
import { SplashScreen } from './screens/SplashScreen';
import { HomeScreen } from './screens/HomeScreen';
import { ScannerScreen } from './screens/ScannerScreen';
import { TranslatorScreen } from './screens/TranslatorScreen';
import { AiScanResultScreen } from './screens/AiScanResultScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { AboutWorldLensScreen } from './screens/AboutWorldLensScreen';
import { PrivacyPolicyScreen } from './screens/PrivacyPolicyScreen';

const VALID_ERROR_TYPES = new Set<ScanAnalysisError>([
  'NETWORK',
  'QUOTA_EXCEEDED',
  'INVALID_IMAGE',
  'AI_UNAVAILABLE',
  'UNKNOWN',
]);

const SCAN_CLIENT_TIMEOUT_MS = 30_000;
const SCAN_CACHE_TTL_MS = 10 * 60 * 1000;
const SCAN_CACHE_MAX_ENTRIES = 25;

interface CachedScanEntry {
  report: VisualRecognitionReport;
  modelName: string;
  language: AppLanguage;
  expiresAt: number;
}

export default function App() {
  const {
    user,
    authReady,
    isSigningIn,
    authError,
    signInWithGoogle,
    signOutUser,
    clearAuthError,
  } = useFirebaseAuth();

  const [language, setLanguage] = useState<AppLanguage>(() => loadAppLanguage());
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  );
  const [screen, setScreen] = useState<ScreenRoute>('splash');
  const [previousScreen, setPreviousScreen] = useState<ScreenRoute>('home');
  const [selectedImage, setSelectedImage] = useState<SelectedScanImage | null>(null);
  const [analysisState, setAnalysisState] = useState<AiAnalysisState>({ status: 'idle' });
  const [localScanHistory, setLocalScanHistory] = useState<LocalScanHistoryItem[]>(() =>
    loadScanHistory()
  );
  const [localTranslationHistory, setLocalTranslationHistory] = useState<LocalTranslationRecord[]>(
    () => loadTranslationHistory()
  );
  const [cloudScanHistory, setCloudScanHistory] = useState<LocalScanHistoryItem[]>([]);
  const [cloudTranslationHistory, setCloudTranslationHistory] = useState<LocalTranslationRecord[]>(
    []
  );
  const [historyStorageError, setHistoryStorageError] = useState<string | null>(null);
  const [prefillTranslation, setPrefillTranslation] = useState<LocalTranslationRecord | null>(null);
  const [androidModalOpen, setAndroidModalOpen] = useState(false);
  const [usageStats, setUsageStats] = useState<LocalAiUsageStats>(() => loadAiUsageStats());
  const [quotaCooldownSeconds, setQuotaCooldownSeconds] = useState<number>(() =>
    getQuotaCooldownRemainingSeconds()
  );

  const abortControllerRef = useRef<AbortController | null>(null);
  const scanInFlightRef = useRef<boolean>(false);
  const scanCacheRef = useRef<Map<string, CachedScanEntry>>(new Map());

  const isSignedIn = Boolean(authReady && user);
  const scanHistory = isSignedIn ? cloudScanHistory : localScanHistory;
  const translationHistory = isSignedIn ? cloudTranslationHistory : localTranslationHistory;

  const strings = STRINGS[language];

  // Attach Firestore real-time listeners strictly after authentication is confirmed
  useEffect(() => {
    if (!authReady || !user) {
      setCloudScanHistory([]);
      setCloudTranslationHistory([]);
      return;
    }

    const handleSyncError = () => {
      setHistoryStorageError(STRINGS[loadAppLanguage()].settingsCloudSyncErrorNotice);
    };

    const unsubProfile = subscribeToUserProfile(
      user.uid,
      (profile) => {
        if (profile) {
          const saved = saveAppLanguage(profile.preferredLanguage);
          setLanguage(saved);
        }
      },
      handleSyncError
    );

    const unsubScans = subscribeToUserScans(
      user.uid,
      (items) => {
        setCloudScanHistory(items);
      },
      handleSyncError
    );

    const unsubTranslations = subscribeToUserTranslations(
      user.uid,
      (items) => {
        setCloudTranslationHistory(items);
      },
      handleSyncError
    );

    return () => {
      unsubProfile();
      unsubScans();
      unsubTranslations();
    };
  }, [authReady, user]);

  const handleLanguageChange = useCallback(
    (nextLanguage: AppLanguage) => {
      const saved = saveAppLanguage(nextLanguage);
      setLanguage(saved);
      if (user) {
        void updateUserLanguagePreference(user, saved).catch(() => {
          setHistoryStorageError(STRINGS[saved].settingsCloudSyncErrorNotice);
        });
      }
    },
    [user]
  );

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const uriToRevoke = selectedImage?.uri;
    return () => {
      if (uriToRevoke && uriToRevoke.startsWith('blob:')) {
        URL.revokeObjectURL(uriToRevoke);
      }
    };
  }, [selectedImage?.uri]);

  useEffect(() => {
    if (quotaCooldownSeconds <= 0) return;
    const timer = window.setInterval(() => {
      const remaining = getQuotaCooldownRemainingSeconds();
      setQuotaCooldownSeconds(remaining);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [quotaCooldownSeconds]);

  const triggerQuotaCooldown = useCallback((retryAfterSeconds?: number) => {
    setQuotaCooldown(retryAfterSeconds ?? 60);
    setQuotaCooldownSeconds(getQuotaCooldownRemainingSeconds());
  }, []);

  const refreshUsageStats = useCallback(() => {
    setUsageStats(loadAiUsageStats());
  }, []);

  const handleResetUsageStats = useCallback(() => {
    setUsageStats(resetAiUsageStats());
  }, []);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleNavigate = (nextScreen: ScreenRoute) => {
    setScreen(nextScreen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenScanner = (_mode: ScannerMode = 'smart') => {
    handleNavigate('scanner');
  };

  const handleSelectImage = (image: SelectedScanImage | null) => {
    abortControllerRef.current?.abort();
    scanInFlightRef.current = false;
    setSelectedImage(image);
    setAnalysisState({ status: 'idle' });
  };

  const handleReloadHistory = useCallback(() => {
    if (isSignedIn) {
      setHistoryStorageError(null);
      return;
    }
    let nextError: string | null = null;
    const captureErr = (reason: string) => {
      if (!nextError) nextError = reason;
    };
    setLocalScanHistory(loadScanHistory(undefined, captureErr));
    setLocalTranslationHistory(loadTranslationHistory(undefined, captureErr));
    setHistoryStorageError(nextError);
  }, [isSignedIn]);

  const handleDeleteScan = useCallback(
    (id: string) => {
      if (user) {
        setHistoryStorageError(null);
        void deleteCloudScan(user.uid, id).catch(() => {
          setHistoryStorageError(strings.settingsCloudSyncErrorNotice);
        });
        return;
      }
      let err: string | null = null;
      setLocalScanHistory(deleteScanHistoryItem(id, undefined, (reason) => { err = reason; }));
      setHistoryStorageError(err);
    },
    [strings.settingsCloudSyncErrorNotice, user]
  );

  const handleClearAllScans = useCallback(() => {
    if (user) {
      setHistoryStorageError(null);
      const ids = cloudScanHistory.map((item) => item.id);
      void clearAllCloudScans(user.uid, ids).catch(() => {
        setHistoryStorageError(strings.settingsCloudSyncErrorNotice);
      });
      return;
    }
    let err: string | null = null;
    setLocalScanHistory(clearScanHistory(undefined, (reason) => { err = reason; }));
    setHistoryStorageError(err);
  }, [cloudScanHistory, strings.settingsCloudSyncErrorNotice, user]);

  const handleSaveTranslation = useCallback(
    (record: Omit<LocalTranslationRecord, 'id' | 'timestamp'>) => {
      if (user) {
        setHistoryStorageError(null);
        void saveCloudTranslation(user, record, language).catch(() => {
          setHistoryStorageError(strings.settingsCloudSyncErrorNotice);
        });
        return;
      }
      let err: string | null = null;
      setLocalTranslationHistory(
        saveTranslationHistoryItem(record, undefined, (reason) => { err = reason; })
      );
      setHistoryStorageError(err);
    },
    [language, strings.settingsCloudSyncErrorNotice, user]
  );

  const handleDeleteTranslation = useCallback(
    (id: string) => {
      if (user) {
        setHistoryStorageError(null);
        void deleteCloudTranslation(user.uid, id).catch(() => {
          setHistoryStorageError(strings.settingsCloudSyncErrorNotice);
        });
        return;
      }
      let err: string | null = null;
      setLocalTranslationHistory(
        deleteTranslationHistoryItem(id, undefined, (reason) => { err = reason; })
      );
      setHistoryStorageError(err);
    },
    [strings.settingsCloudSyncErrorNotice, user]
  );

  const handleClearAllTranslations = useCallback(() => {
    if (user) {
      setHistoryStorageError(null);
      const ids = cloudTranslationHistory.map((item) => item.id);
      void clearAllCloudTranslations(user.uid, ids).catch(() => {
        setHistoryStorageError(strings.settingsCloudSyncErrorNotice);
      });
      return;
    }
    let err: string | null = null;
    setLocalTranslationHistory(clearTranslationHistory(undefined, (reason) => { err = reason; }));
    setHistoryStorageError(err);
  }, [cloudTranslationHistory, strings.settingsCloudSyncErrorNotice, user]);

  const handleClearAllLocalHistory = useCallback(() => {
    let err: string | null = null;
    const captureErr = (reason: string) => {
      if (!err) err = reason;
    };
    setLocalScanHistory(clearScanHistory(undefined, captureErr));
    setLocalTranslationHistory(clearTranslationHistory(undefined, captureErr));
    setHistoryStorageError(err);

    if (user) {
      const scanIds = cloudScanHistory.map((item) => item.id);
      const trIds = cloudTranslationHistory.map((item) => item.id);
      void Promise.all([
        clearAllCloudScans(user.uid, scanIds),
        clearAllCloudTranslations(user.uid, trIds),
      ]).catch(() => {
        setHistoryStorageError(strings.settingsCloudSyncErrorNotice);
      });
    }
  }, [cloudScanHistory, cloudTranslationHistory, strings.settingsCloudSyncErrorNotice, user]);

  const handleReuseTranslation = useCallback((record: LocalTranslationRecord) => {
    setPrefillTranslation(record);
    setScreen('translator');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleConsumePrefill = useCallback(() => {
    setPrefillTranslation(null);
  }, []);

  const analyzeSelectedImage = useCallback(
    async (options?: { forceRefresh?: boolean }) => {
      if (scanInFlightRef.current) return;

      if (!selectedImage) {
        setAnalysisState({
          status: 'error',
          errorType: 'INVALID_IMAGE',
        });
        return;
      }

      const cooldownRemaining = getQuotaCooldownRemainingSeconds();
      if (cooldownRemaining > 0) {
        setQuotaCooldownSeconds(cooldownRemaining);
        setPreviousScreen('scanner');
        setScreen('ai-result');
        setAnalysisState({
          status: 'error',
          errorType: 'QUOTA_EXCEEDED',
          retryAfterSeconds: cooldownRemaining,
        });
        return;
      }

      const cacheKey = `${selectedImage.uri}::${language}`;
      if (!options?.forceRefresh) {
        const cached = scanCacheRef.current.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
          setPreviousScreen('scanner');
          setScreen('ai-result');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setAnalysisState({
            status: 'success',
            report: cached.report,
            modelName: cached.modelName,
            language: cached.language,
            cached: true,
          });
          setUsageStats(
            recordAiUsageEvent({
              feature: 'vision_scan',
              cached: true,
              latencyMs: 0,
              modelName: cached.modelName,
            })
          );
          return;
        }
        if (cached) {
          scanCacheRef.current.delete(cacheKey);
        }
      }

      scanInFlightRef.current = true;
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setPreviousScreen('scanner');
      setScreen('ai-result');
      window.scrollTo({ top: 0, behavior: 'smooth' });

      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        scanInFlightRef.current = false;
        setAnalysisState({
          status: 'error',
          errorType: 'NETWORK',
        });
        return;
      }

      const startedAt = Date.now();
      let timedOut = false;
      const timeoutId = window.setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, SCAN_CLIENT_TIMEOUT_MS);

      try {
        setAnalysisState({ status: 'loading', stage: 'compressing' });

        let encoded;
        try {
          encoded = await decodeAndResizeImageUri(selectedImage.uri, 'scan');
        } catch {
          if (controller.signal.aborted && !timedOut) return;
          setAnalysisState({
            status: 'error',
            errorType: 'INVALID_IMAGE',
          });
          return;
        }

        if (controller.signal.aborted) return;
        setAnalysisState({ status: 'loading', stage: 'analyzing' });

        const response = await fetch('/api/vision/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: encoded.imageBase64,
            mimeType: encoded.mimeType,
            language,
            bypassCache: Boolean(options?.forceRefresh),
          }),
          signal: controller.signal,
        });

        const payload = (await response.json().catch(() => ({}))) as {
          report?: VisualRecognitionReport;
          modelName?: string;
          cached?: boolean;
          errorType?: string;
          detail?: string;
          retryAfterSeconds?: number;
        };

        if (controller.signal.aborted && !timedOut) return;

        const latencyMs = Date.now() - startedAt;

        if (!response.ok || !payload.report) {
          const mappedError: ScanAnalysisError =
            payload.errorType && VALID_ERROR_TYPES.has(payload.errorType as ScanAnalysisError)
              ? (payload.errorType as ScanAnalysisError)
              : response.status === 429
                ? 'QUOTA_EXCEEDED'
                : response.status === 400
                  ? 'INVALID_IMAGE'
                  : response.status === 503
                    ? 'AI_UNAVAILABLE'
                    : 'UNKNOWN';

          const isQuota = mappedError === 'QUOTA_EXCEEDED' || response.status === 429;
          if (isQuota) {
            triggerQuotaCooldown(payload.retryAfterSeconds ?? 60);
          }

          setUsageStats(
            recordAiUsageEvent({
              feature: 'vision_scan',
              cached: false,
              quotaError: isQuota,
              latencyMs,
            })
          );

          setAnalysisState({
            status: 'error',
            errorType: mappedError,
            detail: payload.detail,
            retryAfterSeconds: payload.retryAfterSeconds,
          });
          return;
        }

        const resolvedModel = payload.modelName ?? 'gemini-3.1-flash-lite';
        const isServerCached = Boolean(payload.cached);

        if (scanCacheRef.current.size >= SCAN_CACHE_MAX_ENTRIES) {
          const oldestKey = scanCacheRef.current.keys().next().value;
          if (oldestKey) scanCacheRef.current.delete(oldestKey);
        }
        scanCacheRef.current.set(cacheKey, {
          report: payload.report,
          modelName: resolvedModel,
          language,
          expiresAt: Date.now() + SCAN_CACHE_TTL_MS,
        });

        setUsageStats(
          recordAiUsageEvent({
            feature: 'vision_scan',
            cached: isServerCached,
            latencyMs,
            modelName: resolvedModel,
          })
        );

        setAnalysisState({
          status: 'success',
          report: payload.report,
          modelName: resolvedModel,
          language,
          cached: isServerCached,
        });

        if (user) {
          // Save text-only scan report privately to Cloud Firestore (never uploads photo bytes)
          setHistoryStorageError(null);
          void saveCloudScan(user, {
            report: payload.report,
            language,
            modelName: resolvedModel,
            sourceLabel: selectedImage.source,
          }).catch(() => {
            setHistoryStorageError(strings.settingsCloudSyncErrorNotice);
          });
        } else {
          // Guest Mode: persist structured scan result + optional compact local thumbnail strictly on-device
          const safeThumbnail = await createSafeThumbnailDataUrl(selectedImage.uri).catch(
            () => undefined
          );
          let saveErr: string | null = null;
          setLocalScanHistory(
            saveScanHistoryItem(
              {
                report: payload.report,
                language,
                modelName: resolvedModel,
                sourceLabel: selectedImage.source,
                thumbnailDataUrl: safeThumbnail,
              },
              undefined,
              (reason) => {
                saveErr = reason;
              }
            )
          );
          setHistoryStorageError(saveErr);
        }
      } catch (err) {
        if (controller.signal.aborted && !timedOut) return;
        const isNetworkError = timedOut || err instanceof TypeError;
        setAnalysisState({
          status: 'error',
          errorType: isNetworkError ? 'NETWORK' : 'UNKNOWN',
          detail: timedOut
            ? 'Request timed out. Please check your connection and try again.'
            : err instanceof Error
              ? err.message
              : undefined,
        });
      } finally {
        window.clearTimeout(timeoutId);
        scanInFlightRef.current = false;
      }
    },
    [language, selectedImage, strings.settingsCloudSyncErrorNotice, triggerQuotaCooldown, user]
  );

  if (screen === 'splash') {
    return (
      <SplashScreen
        language={language}
        strings={strings}
        onEnter={() => handleNavigate('home')}
        onLanguageChange={handleLanguageChange}
      />
    );
  }

  return (
    <>
      <AppShell
        activeScreen={screen}
        language={language}
        strings={strings}
        isOnline={isOnline}
        onNavigate={handleNavigate}
        onLanguageChange={handleLanguageChange}
        onBackFromResult={() =>
          handleNavigate(screen === 'about' || screen === 'privacy' ? 'profile' : previousScreen)
        }
      >
        {screen === 'home' && (
          <HomeScreen
            language={language}
            strings={strings}
            recentScans={scanHistory.slice(0, 3)}
            onOpenScanner={handleOpenScanner}
            onOpenHistory={() => handleNavigate('history')}
          />
        )}

        {screen === 'scanner' && (
          <ScannerScreen
            strings={strings}
            selectedImage={selectedImage}
            isAnalyzing={analysisState.status === 'loading'}
            quotaCooldownSeconds={quotaCooldownSeconds}
            onImageSelected={handleSelectImage}
            onScanImage={() => {
              void analyzeSelectedImage();
            }}
          />
        )}

        {screen === 'translator' && (
          <TranslatorScreen
            language={language}
            strings={strings}
            scannerSelectedImage={selectedImage}
            translationHistory={translationHistory}
            quotaCooldownSeconds={quotaCooldownSeconds}
            onQuotaExceeded={triggerQuotaCooldown}
            onUsageUpdated={refreshUsageStats}
            onSaveTranslation={handleSaveTranslation}
            onDeleteTranslation={handleDeleteTranslation}
            onClearTranslations={handleClearAllTranslations}
            prefillTranslation={prefillTranslation}
            onConsumePrefill={handleConsumePrefill}
          />
        )}

        {screen === 'ai-result' && (
          <AiScanResultScreen
            strings={strings}
            selectedImage={selectedImage}
            analysisState={analysisState}
            quotaCooldownSeconds={quotaCooldownSeconds}
            onBack={() => handleNavigate('scanner')}
            onTryAgain={() => {
              void analyzeSelectedImage({ forceRefresh: analysisState.status === 'error' });
            }}
          />
        )}

        {screen === 'history' && (
          <HistoryScreen
            language={language}
            strings={strings}
            isSignedIn={isSignedIn}
            scanHistory={scanHistory}
            translationHistory={translationHistory}
            storageError={historyStorageError}
            onRetryStorage={handleReloadHistory}
            onDismissStorageError={() => setHistoryStorageError(null)}
            onOpenScanner={() => handleOpenScanner('smart')}
            onOpenTranslator={() => handleNavigate('translator')}
            onReuseTranslation={handleReuseTranslation}
            onDeleteScan={handleDeleteScan}
            onClearAllScans={handleClearAllScans}
            onDeleteTranslation={handleDeleteTranslation}
            onClearAllTranslations={handleClearAllTranslations}
          />
        )}

        {screen === 'profile' && (
          <ProfileScreen
            language={language}
            strings={strings}
            user={user}
            authReady={authReady}
            isSigningIn={isSigningIn}
            authError={authError}
            onSignInWithGoogle={() => {
              void signInWithGoogle();
            }}
            onSignOut={() => {
              void signOutUser();
            }}
            onDismissAuthError={clearAuthError}
            scanHistoryCount={scanHistory.length}
            translationHistoryCount={translationHistory.length}
            historyStorageError={historyStorageError}
            onDismissStorageError={() => setHistoryStorageError(null)}
            usageStats={usageStats}
            onResetUsageStats={handleResetUsageStats}
            onLanguageChange={handleLanguageChange}
            onClearAllLocalHistory={handleClearAllLocalHistory}
            onOpenAbout={() => handleNavigate('about')}
            onOpenPrivacyPolicy={() => handleNavigate('privacy')}
            onReplaySplash={() => handleNavigate('splash')}
            onOpenAndroidInspector={() => setAndroidModalOpen(true)}
          />
        )}

        {screen === 'about' && (
          <AboutWorldLensScreen
            strings={strings}
            onBack={() => handleNavigate('profile')}
          />
        )}

        {screen === 'privacy' && (
          <PrivacyPolicyScreen
            language={language}
            strings={strings}
            isSignedIn={isSignedIn}
            scanHistoryCount={scanHistory.length}
            translationHistoryCount={translationHistory.length}
            onClearAllLocalHistory={handleClearAllLocalHistory}
            onBack={() => handleNavigate('profile')}
          />
        )}
      </AppShell>

      {androidModalOpen && (
        <AndroidSourceModal
          strings={strings}
          onClose={() => setAndroidModalOpen(false)}
        />
      )}
    </>
  );
}
