import { useState } from 'react';
import { AlertTriangle, ArrowLeft, Shield, Trash2 } from 'lucide-react';
import type { AppLanguage } from '../domain/models';
import type { AppStrings } from '../data/localization';

interface PrivacyPolicyScreenProps {
  language: AppLanguage;
  strings: AppStrings;
  scanHistoryCount: number;
  translationHistoryCount: number;
  onClearAllLocalHistory: () => void;
  onBack: () => void;
}

export function PrivacyPolicyScreen({
  language,
  strings,
  scanHistoryCount,
  translationHistoryCount,
  onClearAllLocalHistory,
  onBack,
}: PrivacyPolicyScreenProps) {
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [clearedNoticeVisible, setClearedNoticeVisible] = useState(false);
  const totalHistoryCount = scanHistoryCount + translationHistoryCount;

  const sections = [
    {
      title: strings.privacySection1Title,
      body: strings.privacySection1Body,
    },
    {
      title: strings.privacySection2Title,
      body: strings.privacySection2Body,
    },
    {
      title: strings.privacySection3Title,
      body: strings.privacySection3Body,
    },
    {
      title: strings.privacySection4Title,
      body: strings.privacySection4Body,
    },
  ];

  const currentCountLine =
    language === 'hi'
      ? `इस डिवाइस पर अभी ${scanHistoryCount} स्कैन और ${translationHistoryCount} अनुवाद सहेजे गए हैं।`
      : `Currently stored on this device: ${scanHistoryCount} scans and ${translationHistoryCount} translations.`;

  const clearConfirmBody =
    language === 'hi'
      ? `यह इस डिवाइस से सभी ${scanHistoryCount} सहेजे गए स्कैन (स्थानीय थंबनेल सहित) और ${translationHistoryCount} सहेजे गए अनुवादों को स्थायी रूप से हटा देगा। इसे पूर्ववत नहीं किया जा सकता।`
      : `This will permanently delete all ${scanHistoryCount} saved scans (including local thumbnails) and ${translationHistoryCount} saved translations from this device. This action cannot be undone.`;

  return (
    <div className="space-y-6">
      {/* Header & Back Button */}
      <header className="space-y-2">
        <button
          type="button"
          onClick={onBack}
          aria-label={strings.settingsBackToSettings}
          className="min-h-[44px] px-3 -ml-3 rounded-xl inline-flex items-center gap-2 text-sm font-semibold text-[#071428] hover:bg-slate-200/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A6BFF]"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{strings.settingsBackToSettings}</span>
        </button>

        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#EEF4FF] text-[#1A6BFF] flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#071428]">
              {strings.privacyTitle}
            </h1>
            <p className="mt-1 text-sm text-slate-600 leading-relaxed max-w-2xl">
              {strings.privacyIntro}
            </p>
          </div>
        </div>
      </header>

      {/* Honest Plain-Language Policy Sections */}
      <section className="rounded-3xl bg-white border border-slate-200/90 divide-y divide-slate-100 overflow-hidden">
        {sections.map((section) => (
          <article key={section.title} className="p-5 sm:p-6 space-y-2">
            <h2 className="text-sm sm:text-base font-bold text-[#1A6BFF]">
              {section.title}
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {section.body}
            </p>
          </article>
        ))}
      </section>

      {/* Explicit What Is Stored vs. What Is Not Stored */}
      <section className="rounded-3xl bg-white border border-slate-200/90 p-5 sm:p-6 space-y-4">
        <h2 className="text-sm sm:text-base font-bold text-[#1A6BFF]">
          {strings.privacyStoredHeading}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-[#F6F8FC] border border-slate-200/80 p-4 space-y-2">
            <h3 className="text-sm font-bold text-[#071428]">
              {strings.privacyStoredTitle}
            </h3>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {strings.privacyStoredList}
            </p>
          </div>
          <div className="rounded-2xl bg-[#F6F8FC] border border-slate-200/80 p-4 space-y-2">
            <h3 className="text-sm font-bold text-[#071428]">
              {strings.privacyNotStoredTitle}
            </h3>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {strings.privacyNotStoredList}
            </p>
          </div>
        </div>
      </section>

      {/* How to Clear Local History + Direct Action */}
      <section className="rounded-3xl bg-white border border-slate-200/90 p-5 sm:p-6 space-y-4">
        <div className="space-y-1.5">
          <h2 className="text-sm sm:text-base font-bold text-[#1A6BFF]">
            {strings.privacyHowToClearTitle}
          </h2>
          <p className="text-sm text-slate-700 leading-relaxed">
            {strings.privacyHowToClearBody}
          </p>
          <p className="text-xs text-slate-500 font-medium">{currentCountLine}</p>
        </div>

        {clearedNoticeVisible && totalHistoryCount === 0 && (
          <div
            role="status"
            className="rounded-2xl bg-[#EEF4FF] border border-[#1A6BFF]/20 px-4 py-3 text-xs sm:text-sm text-[#071428]"
          >
            {strings.settingsHistoryClearedNotice}
          </div>
        )}

        <button
          type="button"
          disabled={totalHistoryCount === 0}
          onClick={() => setConfirmClearOpen(true)}
          className="w-full sm:w-auto min-h-[48px] px-5 rounded-xl border border-red-200 bg-white hover:bg-red-50 disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed text-sm font-semibold text-red-700 inline-flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          <Trash2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{strings.settingsClearAllHistoryBtn}</span>
        </button>
      </section>

      {confirmClearOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#071428]/65 backdrop-blur-xs flex items-center justify-center p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="privacy-clear-history-title"
          aria-describedby="privacy-clear-history-desc"
        >
          <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2
                  id="privacy-clear-history-title"
                  className="text-base sm:text-lg font-bold text-[#071428]"
                >
                  {strings.settingsClearAllConfirmTitle}
                </h2>
                <p
                  id="privacy-clear-history-desc"
                  className="mt-1.5 text-sm text-slate-600 leading-relaxed"
                >
                  {clearConfirmBody}
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmClearOpen(false)}
                className="min-h-[44px] px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold text-[#071428] transition-colors"
              >
                {strings.historyCancelBtn}
              </button>
              <button
                type="button"
                onClick={() => {
                  onClearAllLocalHistory();
                  setConfirmClearOpen(false);
                  setClearedNoticeVisible(true);
                }}
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
