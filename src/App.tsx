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

export default function App() {
  const [language, setLanguage] = useState<AppLanguage>(() => loadAppLanguage());
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  );
  const [screen, setScreen] = useState<ScreenRoute>('splash');
  const [previousScreen, setPreviousScreen] = useState<ScreenRoute>('home');
  const [selectedImage, setSelectedImage] = useState<SelectedScanImage | null>(null);
  const [analysisState, setAnalysisState] = useState<AiAnalysisState>({ status: 'idle' });
  const [scanHistory, setScanHistory] = useState<LocalScanHistoryItem[]>(() => loadScanHistory());
  const [translationHistory, setTranslationHistory] = useState<LocalTranslationRecord[]>(() =>
    loadTranslationHistory()
  );
  const [historyStorageError, setHistoryStorageError] = useState<string | null>(null);
  const [prefillTranslation, setPrefillTranslation] = useState<LocalTranslationRecord | null>(null);
  const [androidModalOpen, setAndroidModalOpen] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  const strings = STRINGS[language];

  const handleLanguageChange = useCallback((nextLanguage: AppLanguage) => {
    const saved = saveAppLanguage(nextLanguage);
    setLanguage(saved);
  }, []);

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
    setSelectedImage(image);
    setAnalysisState({ status: 'idle' });
  };

  const handleReloadHistory = useCallback(() => {
    let nextError: string | null = null;
    const captureErr = (reason: string) => {
      if (!nextError) nextError = reason;
    };
    setScanHistory(loadScanHistory(undefined, captureErr));
    setTranslationHistory(loadTranslationHistory(undefined, captureErr));
    setHistoryStorageError(nextError);
  }, []);

  const handleDeleteScan = useCallback((id: string) => {
    let err: string | null = null;
    setScanHistory(deleteScanHistoryItem(id, undefined, (reason) => { err = reason; }));
    setHistoryStorageError(err);
  }, []);

  const handleClearAllScans = useCallback(() => {
    let err: string | null = null;
    setScanHistory(clearScanHistory(undefined, (reason) => { err = reason; }));
    setHistoryStorageError(err);
  }, []);

  const handleSaveTranslation = useCallback(
    (record: Omit<LocalTranslationRecord, 'id' | 'timestamp'>) => {
      let err: string | null = null;
      setTranslationHistory(
        saveTranslationHistoryItem(record, undefined, (reason) => { err = reason; })
      );
      setHistoryStorageError(err);
    },
    []
  );

  const handleDeleteTranslation = useCallback((id: string) => {
    let err: string | null = null;
    setTranslationHistory(
      deleteTranslationHistoryItem(id, undefined, (reason) => { err = reason; })
    );
    setHistoryStorageError(err);
  }, []);

  const handleClearAllTranslations = useCallback(() => {
    let err: string | null = null;
    setTranslationHistory(clearTranslationHistory(undefined, (reason) => { err = reason; }));
    setHistoryStorageError(err);
  }, []);

  const handleClearAllLocalHistory = useCallback(() => {
    let err: string | null = null;
    const captureErr = (reason: string) => {
      if (!err) err = reason;
    };
    setScanHistory(clearScanHistory(undefined, captureErr));
    setTranslationHistory(clearTranslationHistory(undefined, captureErr));
    setHistoryStorageError(err);
  }, []);

  const handleReuseTranslation = useCallback((record: LocalTranslationRecord) => {
    setPrefillTranslation(record);
    setScreen('translator');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleConsumePrefill = useCallback(() => {
    setPrefillTranslation(null);
  }, []);

  const analyzeSelectedImage = useCallback(async () => {
    if (!selectedImage) {
      setAnalysisState({
        status: 'error',
        errorType: 'INVALID_IMAGE',
      });
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setPreviousScreen('scanner');
    setScreen('ai-result');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setAnalysisState({
        status: 'error',
        errorType: 'NETWORK',
      });
      return;
    }

    setAnalysisState({ status: 'loading' });

    let encoded;
    try {
      encoded = await decodeAndResizeImageUri(selectedImage.uri);
    } catch {
      if (controller.signal.aborted) return;
      setAnalysisState({
        status: 'error',
        errorType: 'INVALID_IMAGE',
      });
      return;
    }

    try {
      const response = await fetch('/api/vision/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: encoded.imageBase64,
          mimeType: encoded.mimeType,
          language,
        }),
        signal: controller.signal,
      });

      const payload = (await response.json().catch(() => ({}))) as {
        report?: VisualRecognitionReport;
        modelName?: string;
        errorType?: string;
        detail?: string;
      };

      if (controller.signal.aborted) return;

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

        setAnalysisState({
          status: 'error',
          errorType: mappedError,
          detail: payload.detail,
        });
        return;
      }

      const resolvedModel = payload.modelName ?? 'gemini-4-hydrogen';
      setAnalysisState({
        status: 'success',
        report: payload.report,
        modelName: resolvedModel,
        language,
      });

      // Persist structured scan result + optional compact local thumbnail strictly on-device
      const safeThumbnail = await createSafeThumbnailDataUrl(selectedImage.uri).catch(
        () => undefined
      );
      let saveErr: string | null = null;
      setScanHistory(
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
    } catch (err) {
      if (controller.signal.aborted) return;
      const isNetworkError = err instanceof TypeError;
      setAnalysisState({
        status: 'error',
        errorType: isNetworkError ? 'NETWORK' : 'UNKNOWN',
        detail: err instanceof Error ? err.message : undefined,
      });
    }
  }, [language, selectedImage]);

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
            onBack={() => handleNavigate('scanner')}
            onTryAgain={() => {
              void analyzeSelectedImage();
            }}
          />
        )}

        {screen === 'history' && (
          <HistoryScreen
            language={language}
            strings={strings}
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
            scanHistoryCount={scanHistory.length}
            translationHistoryCount={translationHistory.length}
            historyStorageError={historyStorageError}
            onDismissStorageError={() => setHistoryStorageError(null)}
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
