import { ArrowLeft, Clock, Languages, ScanLine, ShieldCheck } from 'lucide-react';
import type { AppStrings } from '../data/localization';
import { APP_BUILD, APP_VERSION } from '../data/localHistoryStore';
import { WorldLensLogo } from '../components/WorldLensLogo';

interface AboutWorldLensScreenProps {
  strings: AppStrings;
  onBack: () => void;
}

export function AboutWorldLensScreen({ strings, onBack }: AboutWorldLensScreenProps) {
  const capabilities = [
    {
      icon: ScanLine,
      title: strings.aboutFeatureScannerTitle,
      body: strings.aboutFeatureScannerBody,
    },
    {
      icon: Languages,
      title: strings.aboutFeatureTranslatorTitle,
      body: strings.aboutFeatureTranslatorBody,
    },
    {
      icon: Clock,
      title: strings.aboutFeatureHistoryTitle,
      body: strings.aboutFeatureHistoryBody,
    },
  ];

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

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#071428]">
          {strings.aboutTitle}
        </h1>
      </header>

      {/* Brand Hero Card */}
      <section className="rounded-3xl bg-[#071428] text-white p-6 sm:p-8 space-y-5">
        <div className="flex items-center gap-4">
          <WorldLensLogo size={48} variant="on-dark" className="shrink-0" />
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold tracking-[0.12em] text-white">
              {strings.brandName}
            </h2>
            <p className="text-xs sm:text-sm text-[#4B8EFF] mt-0.5">
              {strings.tagline}
            </p>
          </div>
        </div>

        <p className="text-sm text-slate-200 leading-relaxed max-w-2xl">
          {strings.aboutSummary}
        </p>

        <p className="pt-3 border-t border-white/10 text-xs font-mono text-slate-300 tabular-nums">
          {strings.settingsVersionLabel} {APP_VERSION} · Build {APP_BUILD}
        </p>
      </section>

      {/* Core Capabilities */}
      <section className="rounded-3xl bg-white border border-slate-200/90 p-5 sm:p-6 space-y-5">
        <h2 className="text-base font-bold text-[#071428]">
          {strings.aboutFeaturesHeading}
        </h2>

        <div className="space-y-4">
          {capabilities.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#EEF4FF] text-[#1A6BFF] flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-[#071428]">
                    {item.title}
                  </h3>
                  <p className="mt-0.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {item.body}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Responsible AI Use Notice */}
      <section className="rounded-3xl bg-[#EEF4FF] border border-[#1A6BFF]/20 p-5 sm:p-6 flex items-start gap-3.5">
        <ShieldCheck className="w-5 h-5 text-[#1A6BFF] shrink-0 mt-0.5" aria-hidden="true" />
        <div className="min-w-0 space-y-1">
          <h2 className="text-sm font-bold text-[#071428]">
            {strings.aboutResponsibleAiTitle}
          </h2>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            {strings.aboutResponsibleAiBody}
          </p>
        </div>
      </section>

      {/* Contact & Support Placeholder (Clearly Marked Not Configured) */}
      <section className="rounded-3xl bg-white border border-slate-200/90 p-5 sm:p-6 space-y-1.5">
        <h2 className="text-sm sm:text-base font-bold text-[#071428]">
          {strings.aboutSupportTitle}
        </h2>
        <p className="text-xs sm:text-sm font-semibold text-slate-500">
          {strings.aboutSupportStatus}
        </p>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          {strings.aboutSupportBody}
        </p>
      </section>
    </div>
  );
}
