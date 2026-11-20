import {
  ArrowUpRight,
  Camera,
  ChevronRight,
  Clock,
  Image as ImageIcon,
  ScanLine,
} from 'lucide-react';
import type {
  AppLanguage,
  LocalScanHistoryItem,
  ScannerMode,
} from '../domain/models';
import type { AppStrings } from '../data/localization';
import { formatHistoryDateTime } from '../data/localHistoryStore';

interface HomeScreenProps {
  language: AppLanguage;
  strings: AppStrings;
  recentScans: LocalScanHistoryItem[];
  onOpenScanner: (mode: ScannerMode) => void;
  onOpenHistory: () => void;
}

export function HomeScreen({
  language,
  strings,
  recentScans,
  onOpenScanner,
  onOpenHistory,
}: HomeScreenProps) {
  return (
    <div className="space-y-8">
      {/* Greeting & Tagline */}
      <header className="space-y-2">
        <p className="text-sm font-medium text-[#1A6BFF]">
          {strings.tagline}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#071428]">
          {strings.homeGreeting}
        </h1>
        <p className="text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed">
          {strings.homeIntro}
        </p>
      </header>

      {/* Primary Focal Anchor: AI Smart Scanner + Secondary Actions */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <button
          type="button"
          onClick={() => onOpenScanner('smart')}
          className="lg:col-span-7 text-left rounded-3xl bg-[#071428] text-white p-6 sm:p-8 flex flex-col justify-between gap-6 hover:bg-[#0D2140] active:scale-[0.99] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A6BFF] focus-visible:ring-offset-2"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#1A6BFF] flex items-center justify-center shrink-0">
              <ScanLine className="w-6 h-6 text-white" aria-hidden="true" />
            </div>
            <ArrowUpRight className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {strings.homeSmartScannerTitle}
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed max-w-md">
              {strings.homeSmartScannerSubtitle}
            </p>
          </div>

          <div className="pt-2">
            <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1A6BFF] text-white text-sm font-semibold whitespace-nowrap">
              {strings.homeSmartScannerCta}
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </span>
          </div>
        </button>

        {/* Secondary Actions: Take Photo & Upload from Gallery */}
        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
          <button
            type="button"
            onClick={() => onOpenScanner('photo')}
            className="text-left rounded-2xl bg-white border border-slate-200/90 p-5 flex items-center gap-4 hover:border-[#1A6BFF]/50 active:scale-[0.99] transition-all duration-150 min-h-[88px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A6BFF]"
          >
            <div className="w-12 h-12 rounded-xl bg-[#F0F5FF] text-[#1A6BFF] flex items-center justify-center shrink-0">
              <Camera className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-[#071428] truncate">
                {strings.homeTakePhotoTitle}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5 line-clamp-2">
                {strings.homeTakePhotoSubtitle}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => onOpenScanner('gallery')}
            className="text-left rounded-2xl bg-white border border-slate-200/90 p-5 flex items-center gap-4 hover:border-[#1A6BFF]/50 active:scale-[0.99] transition-all duration-150 min-h-[88px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A6BFF]"
          >
            <div className="w-12 h-12 rounded-xl bg-[#F0F5FF] text-[#1A6BFF] flex items-center justify-center shrink-0">
              <ImageIcon className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-[#071428] truncate">
                {strings.homeGalleryTitle}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5 line-clamp-2">
                {strings.homeGallerySubtitle}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* Real Local Recent Scans Section (Zero fake sample data) */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-[#071428]">
              {strings.homeRecentHeading}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {strings.homeRecentDemoCaption}
            </p>
          </div>

          {recentScans.length > 0 && (
            <button
              type="button"
              onClick={onOpenHistory}
              className="min-h-[40px] px-2 text-xs font-semibold text-[#1A6BFF] hover:text-[#1258DB] transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A6BFF] rounded-lg"
            >
              {strings.homeViewAllHistory}
            </button>
          )}
        </div>

        {recentScans.length === 0 ? (
          <div className="rounded-2xl bg-white border border-slate-200/90 p-8 sm:p-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#F0F5FF] text-[#1A6BFF] flex items-center justify-center mx-auto mb-4">
              <Clock className="w-5 h-5" aria-hidden="true" />
            </div>
            <h3 className="text-base font-semibold text-[#071428]">
              {strings.homeRecentEmptyTitle}
            </h3>
            <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              {strings.homeRecentEmptyBody}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentScans.map((scan) => {
              const dateText = formatHistoryDateTime(scan.timestamp, language);
              const sourceLabel =
                scan.sourceLabel === 'camera'
                  ? strings.historySourceCamera
                  : strings.historySourceGallery;

              return (
                <button
                  key={scan.id}
                  type="button"
                  onClick={onOpenHistory}
                  className="text-left rounded-2xl bg-white border border-slate-200/90 p-5 hover:border-[#1A6BFF]/50 active:scale-[0.99] transition-all duration-150 flex flex-col justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A6BFF]"
                >
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-[#1A6BFF] truncate">
                      {scan.report.category} · {sourceLabel}
                    </p>
                    <h3 className="text-base font-semibold text-[#071428] leading-snug line-clamp-1">
                      {scan.report.objectName}
                    </h3>
                    {scan.report.explanation && (
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {scan.report.explanation}
                      </p>
                    )}
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="truncate">{dateText}</span>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
