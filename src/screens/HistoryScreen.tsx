import { useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Clock,
  Copy,
  Languages,
  RotateCcw,
  ScanLine,
  Share2,
  Trash2,
  X,
} from 'lucide-react';
import type {
  AppLanguage,
  HistoryTab,
  LocalScanHistoryItem,
  LocalTranslationRecord,
  VisualConfidenceLevel,
} from '../domain/models';
import type { AppStrings } from '../data/localization';
import { formatHistoryDateTime, formatScanLanguageLabel } from '../data/localHistoryStore';

interface HistoryScreenProps {
  language: AppLanguage;
  strings: AppStrings;
  isSignedIn?: boolean;
  scanHistory: LocalScanHistoryItem[];
  translationHistory: LocalTranslationRecord[];
  storageError?: string | null;
  onRetryStorage?: () => void;
  onDismissStorageError?: () => void;
  onOpenScanner: () => void;
  onOpenTranslator: () => void;
  onReuseTranslation: (record: LocalTranslationRecord) => void;
  onDeleteScan: (id: string) => void;
  onClearAllScans: () => void;
  onDeleteTranslation: (id: string) => void;
  onClearAllTranslations: () => void;
}

function getConfidenceLabel(level: VisualConfidenceLevel, strings: AppStrings): string {
  switch (level) {
    case 'high':
      return strings.aiConfidenceHigh;
    case 'moderate':
      return strings.aiConfidenceModerate;
    case 'low':
      return strings.aiConfidenceLow;
    case 'uncertain':
    default:
      return strings.aiConfidenceUncertain;
  }
}

export function HistoryScreen({
  language,
  strings,
  isSignedIn = false,
  scanHistory,
  translationHistory,
  storageError = null,
  onRetryStorage,
  onDismissStorageError,
  onOpenScanner,
  onOpenTranslator,
  onReuseTranslation,
  onDeleteScan,
  onClearAllScans,
  onDeleteTranslation,
  onClearAllTranslations,
}: HistoryScreenProps) {
  const [activeTab, setActiveTab] = useState<HistoryTab>('scans');
  const [selectedScan, setSelectedScan] = useState<LocalScanHistoryItem | null>(null);
  const [selectedTranslation, setSelectedTranslation] = useState<LocalTranslationRecord | null>(null);
  const [confirmClearTab, setConfirmClearTab] = useState<HistoryTab | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeCount = activeTab === 'scans' ? scanHistory.length : translationHistory.length;

  const handleCopyText = async (text: string, markerId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(markerId);
      window.setTimeout(() => setCopiedId((curr) => (curr === markerId ? null : curr)), 1600);
    } catch {
      // Clipboard unavailable in restricted iframe contexts
    }
  };

  const handleShareText = async (text: string, markerId: string) => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ text, title: strings.brandName });
        return;
      } catch {
        return;
      }
    }
    await handleCopyText(text, markerId);
  };

  const handleConfirmClearAll = () => {
    if (confirmClearTab === 'scans') {
      onClearAllScans();
      setSelectedScan(null);
    } else if (confirmClearTab === 'translations') {
      onClearAllTranslations();
      setSelectedTranslation(null);
    }
    setConfirmClearTab(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#071428]">
            {strings.historyTitle}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isSignedIn ? strings.historyCloudSyncNotice : strings.historyPrivacyNotice}
          </p>
        </div>

        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => setConfirmClearTab(activeTab)}
            className="min-h-[42px] px-4 rounded-xl border border-red-200 bg-white text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{strings.historyClearAll}</span>
          </button>
        )}
      </header>

      {/* Graceful Local Storage Error Notice */}
      {storageError && (
        <div
          role="alert"
          className="rounded-2xl bg-red-50/90 border border-red-200 p-4 flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-900">
              {language === 'hi' ? 'स्थानीय स्टोरेज सूचना' : 'Local storage notice'}
            </p>
            <p className="text-xs text-red-800/85 mt-1 leading-relaxed">
              {language === 'hi'
                ? 'स्थानीय इतिहास स्टोरेज में कोई त्रुटि आई। ऐप का उपयोग सुरक्षित रूप से जारी रखा जा सकता है।'
                : 'A local history storage operation could not be completed. The app remains safe to use.'}
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              {onRetryStorage && (
                <button
                  type="button"
                  onClick={onRetryStorage}
                  className="min-h-[36px] px-3 rounded-lg bg-white border border-red-200 text-xs font-semibold text-red-800 hover:bg-red-100/60 transition-colors"
                >
                  {language === 'hi' ? 'पुनः प्रयास करें' : 'Retry'}
                </button>
              )}
              {onDismissStorageError && (
                <button
                  type="button"
                  onClick={onDismissStorageError}
                  className="min-h-[36px] px-3 rounded-lg text-xs font-semibold text-slate-600 hover:bg-white/80 transition-colors"
                >
                  {language === 'hi' ? 'हटाएँ' : 'Dismiss'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Interactive Segmented Tabs: Scans | Translations */}
      <div
        className="grid grid-cols-2 gap-2.5 p-1.5 rounded-2xl bg-slate-100 border border-slate-200/80"
        role="tablist"
        aria-label={strings.historyTitle}
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'scans'}
          onClick={() => setActiveTab('scans')}
          className={`min-h-[46px] px-4 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A6BFF] ${
            activeTab === 'scans'
              ? 'bg-[#071428] text-white shadow-xs'
              : 'text-slate-600 hover:text-[#071428] hover:bg-white/70'
          }`}
        >
          <ScanLine className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{strings.historyTabScans}</span>
          <span className="font-mono tabular-nums text-xs opacity-80">({scanHistory.length})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'translations'}
          onClick={() => setActiveTab('translations')}
          className={`min-h-[46px] px-4 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A6BFF] ${
            activeTab === 'translations'
              ? 'bg-[#071428] text-white shadow-xs'
              : 'text-slate-600 hover:text-[#071428] hover:bg-white/70'
          }`}
        >
          <Languages className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{strings.historyTabTranslations}</span>
          <span className="font-mono tabular-nums text-xs opacity-80">
            ({translationHistory.length})
          </span>
        </button>
      </div>

      {/* ================= TAB 1: LOCAL SCAN HISTORY ================= */}
      {activeTab === 'scans' && (
        <>
          {scanHistory.length === 0 ? (
            <section className="rounded-3xl bg-white border border-slate-200/90 px-6 py-14 sm:py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#F0F5FF] text-[#1A6BFF] flex items-center justify-center mx-auto mb-5">
                <Clock className="w-7 h-7" aria-hidden="true" />
              </div>

              <h2 className="text-xl font-bold tracking-tight text-[#071428]">
                {strings.historyEmptyScansTitle}
              </h2>
              <p className="mt-2.5 text-sm sm:text-base text-slate-600 max-w-md mx-auto leading-relaxed">
                {strings.historyEmptyScansBody}
              </p>

              <div className="mt-8 flex items-center justify-center">
                <button
                  type="button"
                  onClick={onOpenScanner}
                  className="w-full sm:w-auto min-h-[48px] px-6 rounded-xl bg-[#1A6BFF] hover:bg-[#1258DB] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A6BFF] focus-visible:ring-offset-2"
                >
                  <ScanLine className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{strings.historyEmptyActionScanner}</span>
                </button>
              </div>
            </section>
          ) : (
            <section className="space-y-3" aria-label={strings.historyTabScans}>
              {scanHistory.map((item) => {
                const formattedDate = formatHistoryDateTime(item.timestamp, language);
                const scanLanguageLabel = formatScanLanguageLabel(item.language, language);
                const sourceText =
                  item.sourceLabel === 'camera'
                    ? strings.historySourceCamera
                    : strings.historySourceGallery;

                return (
                  <article
                    key={item.id}
                    className="rounded-2xl bg-white border border-slate-200/90 hover:border-[#1A6BFF]/40 transition-colors overflow-hidden shadow-xs"
                  >
                    <div className="flex items-stretch">
                      <button
                        type="button"
                        onClick={() => setSelectedScan(item)}
                        className="flex-1 min-w-0 p-4 sm:p-5 text-left hover:bg-[#F6F8FC]/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1A6BFF] flex items-start gap-3.5"
                      >
                        {item.thumbnailDataUrl && (
                          <img
                            src={item.thumbnailDataUrl}
                            alt={item.report.objectName}
                            className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0 bg-[#071428]"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#1A6BFF]">
                            {item.report.category} · {sourceText} · {scanLanguageLabel}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">{formattedDate}</p>
                          <h2 className="mt-1.5 text-base sm:text-lg font-bold text-[#071428] truncate">
                            {item.report.objectName}
                          </h2>
                          {item.report.explanation && (
                            <p className="mt-1 text-sm text-slate-600 line-clamp-2 leading-relaxed">
                              {item.report.explanation}
                            </p>
                          )}
                          <p className="mt-2 text-xs text-slate-400 inline-flex items-center gap-1">
                            <span>{strings.historyOpenResultHint}</span>
                            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                          </p>
                        </div>
                      </button>

                      <div className="border-l border-slate-100 flex items-center px-2 sm:px-3">
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteScan(item.id);
                            if (selectedScan?.id === item.id) {
                              setSelectedScan(null);
                            }
                          }}
                          aria-label={`${strings.historyDeleteItem}: ${item.report.objectName}`}
                          className="min-w-[44px] min-h-[44px] rounded-xl text-slate-400 hover:text-red-700 hover:bg-red-50 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </>
      )}

      {/* ================= TAB 2: LOCAL TRANSLATION HISTORY ================= */}
      {activeTab === 'translations' && (
        <>
          {translationHistory.length === 0 ? (
            <section className="rounded-3xl bg-white border border-slate-200/90 px-6 py-14 sm:py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#F0F5FF] text-[#1A6BFF] flex items-center justify-center mx-auto mb-5">
                <Languages className="w-7 h-7" aria-hidden="true" />
              </div>

              <h2 className="text-xl font-bold tracking-tight text-[#071428]">
                {strings.historyEmptyTranslationsTitle}
              </h2>
              <p className="mt-2.5 text-sm sm:text-base text-slate-600 max-w-md mx-auto leading-relaxed">
                {strings.historyEmptyTranslationsBody}
              </p>

              <div className="mt-8 flex items-center justify-center">
                <button
                  type="button"
                  onClick={onOpenTranslator}
                  className="w-full sm:w-auto min-h-[48px] px-6 rounded-xl bg-[#1A6BFF] hover:bg-[#1258DB] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A6BFF] focus-visible:ring-offset-2"
                >
                  <Languages className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{strings.historyEmptyActionTranslator}</span>
                </button>
              </div>
            </section>
          ) : (
            <section className="space-y-3" aria-label={strings.historyTabTranslations}>
              {translationHistory.map((record) => {
                const formattedDate = formatHistoryDateTime(record.timestamp, language);

                return (
                  <article
                    key={record.id}
                    className="rounded-2xl bg-white border border-slate-200/90 hover:border-[#1A6BFF]/40 transition-colors overflow-hidden shadow-xs"
                  >
                    <div className="flex items-stretch">
                      <button
                        type="button"
                        onClick={() => setSelectedTranslation(record)}
                        className="flex-1 min-w-0 p-4 sm:p-5 text-left hover:bg-[#F6F8FC]/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1A6BFF]"
                      >
                        <p className="text-xs font-semibold text-[#1A6BFF]">
                          {record.mode.toUpperCase()} · {record.sourceLanguageName} →{' '}
                          {record.targetLanguageName}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">{formattedDate}</p>
                        <p className="mt-2 text-sm text-slate-600 line-clamp-2 whitespace-pre-wrap">
                          {record.sourceText}
                        </p>
                        <p className="mt-1.5 text-sm sm:text-base font-medium text-[#071428] line-clamp-3 whitespace-pre-wrap">
                          {record.translatedText}
                        </p>
                      </button>

                      <div className="border-l border-slate-100 flex items-center px-2 sm:px-3">
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteTranslation(record.id);
                            if (selectedTranslation?.id === record.id) {
                              setSelectedTranslation(null);
                            }
                          }}
                          aria-label={`${strings.historyDeleteItem}: ${record.sourceLanguageName} to ${record.targetLanguageName}`}
                          className="min-w-[44px] min-h-[44px] rounded-xl text-slate-400 hover:text-red-700 hover:bg-red-50 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </>
      )}

      {/* ================= SAVED SCAN DETAIL MODAL ================= */}
      {selectedScan && (
        <div
          className="fixed inset-0 z-50 bg-[#071428]/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="saved-scan-detail-title"
        >
          <div className="w-full max-w-2xl max-h-[85vh] rounded-3xl bg-white border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#1A6BFF]">
                  {selectedScan.report.category} ·{' '}
                  {getConfidenceLabel(selectedScan.report.confidenceLevel, strings)} ·{' '}
                  {selectedScan.sourceLabel === 'camera'
                    ? strings.historySourceCamera
                    : strings.historySourceGallery}
                </p>
                <h2
                  id="saved-scan-detail-title"
                  className="mt-1 text-lg sm:text-xl font-bold text-[#071428]"
                >
                  {selectedScan.report.objectName}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {formatHistoryDateTime(selectedScan.timestamp, language)} ·{' '}
                  {language === 'hi' ? 'भाषा' : 'Language'}:{' '}
                  {formatScanLanguageLabel(selectedScan.language, language)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedScan(null)}
                aria-label={strings.scannerClose}
                className="min-w-[42px] min-h-[42px] rounded-xl text-slate-500 hover:bg-slate-100 flex items-center justify-center shrink-0"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              {selectedScan.thumbnailDataUrl && (
                <div className="rounded-2xl overflow-hidden border border-slate-200 bg-[#071428]">
                  <img
                    src={selectedScan.thumbnailDataUrl}
                    alt={selectedScan.report.objectName}
                    className="w-full max-h-56 object-contain"
                  />
                </div>
              )}

              {selectedScan.report.explanation && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {strings.aiSectionExplanation}
                  </h3>
                  <p className="mt-1.5 text-sm sm:text-base text-slate-700 leading-relaxed">
                    {selectedScan.report.explanation}
                  </p>
                </div>
              )}

              {selectedScan.report.characteristics.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {strings.aiSectionCharacteristics}
                  </h3>
                  <ul className="mt-2 space-y-1.5 text-sm text-slate-700 list-disc pl-5">
                    {selectedScan.report.characteristics.map((entry, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {entry}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedScan.report.usefulFacts.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {strings.aiSectionUsefulFacts}
                  </h3>
                  <ul className="mt-2 space-y-1.5 text-sm text-slate-700 list-disc pl-5">
                    {selectedScan.report.usefulFacts.map((fact, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {fact}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedScan.report.confidenceExplanation && (
                <div className="rounded-2xl bg-[#EEF4FF] border border-[#1A6BFF]/15 p-4">
                  <h3 className="text-xs font-semibold text-[#071428]">
                    {strings.aiSectionConfidenceNote}
                  </h3>
                  <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {selectedScan.report.confidenceExplanation}
                  </p>
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-between gap-3 bg-[#F6F8FC]">
              <button
                type="button"
                onClick={() => {
                  onDeleteScan(selectedScan.id);
                  setSelectedScan(null);
                }}
                className="min-h-[42px] px-4 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-xs sm:text-sm font-semibold text-red-700 inline-flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
                <span>{strings.historyDeleteItem}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedScan(null)}
                className="min-h-[42px] px-5 rounded-xl bg-[#071428] hover:bg-[#0D2140] text-white text-xs sm:text-sm font-semibold transition-colors"
              >
                {strings.scannerClose}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= SAVED TRANSLATION DETAIL MODAL ================= */}
      {selectedTranslation && (
        <div
          className="fixed inset-0 z-50 bg-[#071428]/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="saved-translation-detail-title"
        >
          <div className="w-full max-w-xl max-h-[85vh] rounded-3xl bg-white border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p
                  id="saved-translation-detail-title"
                  className="text-xs font-semibold text-[#1A6BFF]"
                >
                  {selectedTranslation.mode.toUpperCase()} · {selectedTranslation.sourceLanguageName}{' '}
                  → {selectedTranslation.targetLanguageName}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatHistoryDateTime(selectedTranslation.timestamp, language)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTranslation(null)}
                aria-label={strings.scannerClose}
                className="min-w-[42px] min-h-[42px] rounded-xl text-slate-500 hover:bg-slate-100 flex items-center justify-center shrink-0"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {strings.historyOriginalLabel} ({selectedTranslation.sourceLanguageName})
                </h3>
                <p className="mt-1.5 text-sm sm:text-base text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {selectedTranslation.sourceText}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[#1A6BFF]">
                  {strings.historyTranslationLabel} ({selectedTranslation.targetLanguageName})
                </h3>
                <p className="mt-1.5 text-base sm:text-lg font-medium text-[#071428] whitespace-pre-wrap leading-relaxed">
                  {selectedTranslation.translatedText}
                </p>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    void handleCopyText(
                      selectedTranslation.translatedText,
                      `modal-${selectedTranslation.id}`
                    )
                  }
                  className="min-h-[42px] px-3.5 rounded-xl bg-[#F6F8FC] hover:bg-slate-100 text-xs sm:text-sm font-semibold text-[#071428] inline-flex items-center gap-1.5 transition-colors"
                >
                  {copiedId === `modal-${selectedTranslation.id}` ? (
                    <Check className="w-4 h-4 text-[#1A6BFF]" aria-hidden="true" />
                  ) : (
                    <Copy className="w-4 h-4 text-slate-500" aria-hidden="true" />
                  )}
                  <span>{strings.translatorCopyBtn}</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void handleShareText(
                      selectedTranslation.translatedText,
                      `share-${selectedTranslation.id}`
                    )
                  }
                  className="min-h-[42px] px-3.5 rounded-xl bg-[#F6F8FC] hover:bg-slate-100 text-xs sm:text-sm font-semibold text-[#071428] inline-flex items-center gap-1.5 transition-colors"
                >
                  <Share2 className="w-4 h-4 text-slate-500" aria-hidden="true" />
                  <span>{strings.translatorShareBtn}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const rec = selectedTranslation;
                    setSelectedTranslation(null);
                    onReuseTranslation(rec);
                  }}
                  className="min-h-[42px] px-4 rounded-xl bg-[#1A6BFF] hover:bg-[#1258DB] text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                  <span>{strings.historyOpenInTranslator}</span>
                </button>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-between gap-3 bg-[#F6F8FC]">
              <button
                type="button"
                onClick={() => {
                  onDeleteTranslation(selectedTranslation.id);
                  setSelectedTranslation(null);
                }}
                className="min-h-[42px] px-4 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-xs sm:text-sm font-semibold text-red-700 inline-flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
                <span>{strings.historyDeleteItem}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTranslation(null)}
                className="min-h-[42px] px-5 rounded-xl bg-[#071428] hover:bg-[#0D2140] text-white text-xs sm:text-sm font-semibold transition-colors"
              >
                {strings.scannerClose}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= CLEAR ALL CONFIRMATION MODAL ================= */}
      {confirmClearTab && (
        <div
          className="fixed inset-0 z-50 bg-[#071428]/65 backdrop-blur-xs flex items-center justify-center p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="clear-history-confirm-title"
          aria-describedby="clear-history-confirm-desc"
        >
          <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2
                  id="clear-history-confirm-title"
                  className="text-base sm:text-lg font-bold text-[#071428]"
                >
                  {confirmClearTab === 'scans'
                    ? strings.historyConfirmClearScansTitle
                    : strings.historyConfirmClearTranslationsTitle}
                </h2>
                <p
                  id="clear-history-confirm-desc"
                  className="mt-1.5 text-sm text-slate-600 leading-relaxed"
                >
                  {confirmClearTab === 'scans'
                    ? strings.historyConfirmClearScansBody
                    : strings.historyConfirmClearTranslationsBody}
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmClearTab(null)}
                className="min-h-[44px] px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold text-[#071428] transition-colors"
              >
                {strings.historyCancelBtn}
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAll}
                className="min-h-[44px] px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
              >
                {strings.historyConfirmDeleteBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
