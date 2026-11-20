import { useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Check,
  ChevronRight,
  Cloud,
  CloudOff,
  Code2,
  Globe,
  Info,
  Lock,
  LogIn,
  LogOut,
  RotateCcw,
  Shield,
  Trash2,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import type { AppLanguage } from '../domain/models';
import type { AppStrings } from '../data/localization';
import { APP_BUILD, APP_VERSION } from '../data/localHistoryStore';
import {
  getTopUsageFeature,
  type LocalAiUsageStats,
  type TrackedAiFeature,
} from '../data/usageTracker';

interface ProfileScreenProps {
  language: AppLanguage;
  strings: AppStrings;
  user: User | null;
  authReady: boolean;
  isSigningIn: boolean;
  authError: string | null;
  onSignInWithGoogle: () => void;
  onSignOut: () => void;
  onDismissAuthError: () => void;
  scanHistoryCount: number;
  translationHistoryCount: number;
  historyStorageError?: string | null;
  onDismissStorageError?: () => void;
  usageStats: LocalAiUsageStats;
  onResetUsageStats: () => void;
  onLanguageChange: (language: AppLanguage) => void;
  onClearAllLocalHistory: () => void;
  onOpenAbout: () => void;
  onOpenPrivacyPolicy: () => void;
  onReplaySplash: () => void;
  onOpenAndroidInspector: () => void;
}

export function ProfileScreen({
  language,
  strings,
  user,
  authReady,
  isSigningIn,
  authError,
  onSignInWithGoogle,
  onSignOut,
  onDismissAuthError,
  scanHistoryCount,
  translationHistoryCount,
  historyStorageError,
  onDismissStorageError,
  usageStats,
  onResetUsageStats,
  onLanguageChange,
  onClearAllLocalHistory,
  onOpenAbout,
  onOpenPrivacyPolicy,
  onReplaySplash,
  onOpenAndroidInspector,
}: ProfileScreenProps) {
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [clearedNoticeVisible, setClearedNoticeVisible] = useState(false);
  const totalHistoryCount = scanHistoryCount + translationHistoryCount;
  const isSignedIn = Boolean(user);

  const featureLabels: Record<TrackedAiFeature, string> = {
    vision_scan: language === 'hi' ? 'स्मार्ट स्कैनर' : 'Smart Scanner',
    text_translate: language === 'hi' ? 'टेक्स्ट अनुवादक' : 'Text Translator',
    camera_translate: language === 'hi' ? 'कैमरा अनुवादक' : 'Camera Translator',
    voice_translate: language === 'hi' ? 'वॉइस अनुवादक' : 'Voice Translator',
    conversation_translate: language === 'hi' ? 'वार्तालाप अनुवादक' : 'Conversation',
  };

  const featureKeys: TrackedAiFeature[] = [
    'vision_scan',
    'text_translate',
    'camera_translate',
    'voice_translate',
    'conversation_translate',
  ];

  const totalApiCalls = featureKeys.reduce(
    (sum, key) => sum + usageStats.features[key].apiCalls,
    0
  );
  const totalCacheHits = featureKeys.reduce(
    (sum, key) => sum + usageStats.features[key].cacheHits,
    0
  );
  const totalQuotaErrors = featureKeys.reduce(
    (sum, key) => sum + usageStats.features[key].quotaErrors,
    0
  );
  const topFeature = getTopUsageFeature(usageStats);

  const historySummary = isSignedIn
    ? language === 'hi'
      ? `क्लाउड में सिंक: ${scanHistoryCount} स्कैन · ${translationHistoryCount} अनुवाद (केवल टेक्स्ट)`
      : `Synced to your account: ${scanHistoryCount} scans · ${translationHistoryCount} translations (text-only)`
    : language === 'hi'
      ? `इस डिवाइस पर ${scanHistoryCount} सहेजे गए स्कैन · ${translationHistoryCount} सहेजे गए अनुवाद`
      : `${scanHistoryCount} saved scans · ${translationHistoryCount} saved translations on this device`;

  const clearConfirmBody = isSignedIn
    ? language === 'hi'
      ? `यह आपके Firebase खाते और इस डिवाइस दोनों से सभी ${scanHistoryCount} सहेजे गए स्कैन और ${translationHistoryCount} सहेजे गए अनुवादों को स्थायी रूप से हटा देगा। इसे पूर्ववत नहीं किया जा सकता।`
      : `This will permanently delete all ${scanHistoryCount} saved scans and ${translationHistoryCount} saved translations from both your Firebase account and this device. This action cannot be undone.`
    : language === 'hi'
      ? `यह इस डिवाइस से सभी ${scanHistoryCount} सहेजे गए स्कैन (स्थानीय थंबनेल सहित) और ${translationHistoryCount} सहेजे गए अनुवादों को स्थायी रूप से हटा देगा। इसे पूर्ववत नहीं किया जा सकता।`
      : `This will permanently delete all ${scanHistoryCount} saved scans (including local thumbnails) and ${translationHistoryCount} saved translations from this device. This action cannot be undone.`;

  const userInitial = (user?.displayName || user?.email || 'W').trim().charAt(0).toUpperCase();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#071428]">
          {strings.profileTitle}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {strings.settingsSubtitle}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Account & Cloud Sync, Language Selector, Permissions & Storage */}
        <div className="lg:col-span-7 space-y-6">
          {/* 0. Optional Firebase Account & Cloud Sync */}
          <section className="rounded-3xl bg-white border border-slate-200/90 p-5 sm:p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isSignedIn ? 'bg-[#EEF4FF] text-[#1A6BFF]' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {isSignedIn ? (
                    <Cloud className="w-5 h-5" aria-hidden="true" />
                  ) : (
                    <CloudOff className="w-5 h-5" aria-hidden="true" />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-[#071428]">
                    {strings.settingsCloudAccountTitle}
                  </h2>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">
                    {isSignedIn ? strings.settingsCloudSignedInBadge : strings.settingsCloudGuestStatus}
                  </p>
                </div>
              </div>
            </div>

            {authError && (
              <div
                role="alert"
                className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 flex items-center justify-between gap-3"
              >
                <p className="text-xs sm:text-sm text-red-700">{authError}</p>
                <button
                  type="button"
                  onClick={onDismissAuthError}
                  className="text-xs font-semibold text-red-700 hover:underline shrink-0"
                >
                  {strings.scannerClose}
                </button>
              </div>
            )}

            {isSignedIn && user ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3.5 rounded-2xl bg-[#F6F8FC] border border-slate-200/80 p-3.5">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Account avatar'}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-full object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-[#1A6BFF] text-white font-bold text-sm flex items-center justify-center shrink-0">
                      {userInitial}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#071428] truncate">
                      {user.displayName || strings.profileGuestName}
                    </p>
                    {user.email && (
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    )}
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {strings.settingsCloudSyncActiveBody}
                </p>

                <button
                  type="button"
                  onClick={onSignOut}
                  className="w-full sm:w-auto min-h-[44px] px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold text-[#071428] inline-flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A6BFF]"
                >
                  <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{strings.settingsCloudSignOutBtn}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {strings.settingsCloudGuestBody}
                </p>
                <button
                  type="button"
                  disabled={!authReady || isSigningIn}
                  onClick={onSignInWithGoogle}
                  className="w-full sm:w-auto min-h-[48px] px-5 rounded-xl bg-[#1A6BFF] hover:bg-[#1558D6] disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A6BFF] focus-visible:ring-offset-2"
                >
                  <LogIn className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>
                    {isSigningIn ? strings.settingsCloudSigningInBtn : strings.settingsCloudSignInBtn}
                  </span>
                </button>
              </div>
            )}
          </section>

          {/* 1. Language Selector: English & Hindi */}
          <section className="rounded-3xl bg-white border border-slate-200/90 p-5 sm:p-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EEF4FF] text-[#1A6BFF] flex items-center justify-center shrink-0">
                <Globe className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#071428]">
                  {strings.profileLanguageHeading}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-relaxed">
                  {strings.profileLanguageSubtitle}
                </p>
              </div>
            </div>

            <div
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              role="radiogroup"
              aria-label={strings.profileLanguageHeading}
            >
              {(
                [
                  {
                    id: 'en',
                    title: strings.profileLanguageEnglish,
                    nativeNote: 'English interface & AI replies',
                  },
                  {
                    id: 'hi',
                    title: strings.profileLanguageHindi,
                    nativeNote: 'हिन्दी इंटरफ़ेस व AI उत्तर',
                  },
                ] as const
              ).map((option) => {
                const selected = language === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => onLanguageChange(option.id)}
                    className={`min-h-[68px] p-4 rounded-2xl border text-left flex items-center justify-between gap-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A6BFF] ${
                      selected
                        ? 'border-[#1A6BFF] bg-[#EEF4FF]/70 text-[#071428]'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-[#071428]'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{option.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {option.nativeNote}
                      </p>
                    </div>
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                        selected
                          ? 'bg-[#1A6BFF] text-white'
                          : 'border border-slate-300 bg-white'
                      }`}
                    >
                      {selected && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 2. Permissions & Device Access Overview */}
          <section className="rounded-3xl bg-white border border-slate-200/90 p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EEF4FF] text-[#1A6BFF] flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" aria-hidden="true" />
              </div>
              <h2 className="text-base font-bold text-[#071428]">
                {strings.settingsPermissionsTitle}
              </h2>
            </div>

            <div className="divide-y divide-slate-100">
              <div className="py-2.5 first:pt-0">
                <p className="text-sm font-semibold text-[#071428]">
                  {strings.settingsPermCameraLabel}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  {strings.settingsPermCameraBody}
                </p>
              </div>
              <div className="py-2.5">
                <p className="text-sm font-semibold text-[#071428]">
                  {strings.settingsPermGalleryLabel}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  {strings.settingsPermGalleryBody}
                </p>
              </div>
              <div className="py-2.5 last:pb-0">
                <p className="text-sm font-semibold text-[#071428]">
                  {strings.settingsPermMicLabel}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  {strings.settingsPermMicBody}
                </p>
              </div>
            </div>
          </section>

          {/* 3. Local History Storage & Clear All with Confirmation */}
          <section className="rounded-3xl bg-white border border-slate-200/90 p-5 sm:p-6 space-y-4">
            <div>
              <h2 className="text-base font-bold text-[#071428]">
                {strings.settingsLocalHistoryTitle}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                {historySummary}
              </p>
            </div>

            {historyStorageError && (
              <div
                role="alert"
                className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 flex items-center justify-between gap-3"
              >
                <p className="text-xs sm:text-sm text-red-700">
                  {strings.settingsHistoryErrorNotice}
                </p>
                {onDismissStorageError && (
                  <button
                    type="button"
                    onClick={onDismissStorageError}
                    className="text-xs font-semibold text-red-700 hover:underline shrink-0"
                  >
                    {strings.scannerClose}
                  </button>
                )}
              </div>
            )}

            {!historyStorageError && clearedNoticeVisible && totalHistoryCount === 0 && (
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
              className="w-full min-h-[48px] px-4 rounded-xl border border-red-200 bg-white hover:bg-red-50 disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed text-sm font-semibold text-red-700 inline-flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              <Trash2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{strings.settingsClearAllHistoryBtn}</span>
            </button>
          </section>
        </div>

        {/* Right Column: Privacy Center, About, Tools & App Version */}
        <div className="lg:col-span-5 space-y-6">
          <section className="rounded-3xl bg-white border border-slate-200/90 divide-y divide-slate-100 overflow-hidden">
            <button
              type="button"
              onClick={onOpenPrivacyPolicy}
              className="w-full min-h-[64px] px-5 py-4 hover:bg-[#F6F8FC] text-left flex items-center justify-between gap-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1A6BFF]"
            >
              <span className="flex items-center gap-3.5 min-w-0">
                <Shield className="w-5 h-5 text-[#1A6BFF] shrink-0" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[#071428] truncate">
                    {strings.settingsPrivacyTitle}
                  </span>
                  <span className="block text-xs text-slate-500 mt-0.5 line-clamp-1">
                    {strings.settingsPrivacySubtitle}
                  </span>
                </span>
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={onOpenAbout}
              className="w-full min-h-[64px] px-5 py-4 hover:bg-[#F6F8FC] text-left flex items-center justify-between gap-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1A6BFF]"
            >
              <span className="flex items-center gap-3.5 min-w-0">
                <Info className="w-5 h-5 text-[#1A6BFF] shrink-0" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[#071428] truncate">
                    {strings.settingsAboutTitle}
                  </span>
                  <span className="block text-xs text-slate-500 mt-0.5 line-clamp-1">
                    {strings.settingsAboutSubtitle}
                  </span>
                </span>
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={onReplaySplash}
              className="w-full min-h-[56px] px-5 py-3.5 hover:bg-[#F6F8FC] text-left flex items-center justify-between gap-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1A6BFF]"
            >
              <span className="flex items-center gap-3.5 min-w-0">
                <RotateCcw className="w-5 h-5 text-[#1A6BFF] shrink-0" aria-hidden="true" />
                <span className="text-sm font-semibold text-[#071428] truncate">
                  {strings.profileReplaySplash}
                </span>
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={onOpenAndroidInspector}
              className="w-full min-h-[56px] px-5 py-3.5 hover:bg-[#F6F8FC] text-left flex items-center justify-between gap-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1A6BFF]"
            >
              <span className="flex items-center gap-3.5 min-w-0">
                <Code2 className="w-5 h-5 text-[#1A6BFF] shrink-0" aria-hidden="true" />
                <span className="text-sm font-semibold text-[#071428] truncate">
                  {strings.profileInspectAndroid}
                </span>
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
            </button>
          </section>

          {/* AI Request Usage & Quota Summary */}
          <section className="rounded-3xl bg-white border border-slate-200/90 p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#EEF4FF] text-[#1A6BFF] flex items-center justify-center shrink-0">
                  <BarChart3 className="w-5 h-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-[#071428]">
                    {strings.settingsUsageTitle}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    {strings.settingsUsageSubtitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={totalApiCalls === 0 && totalCacheHits === 0 && totalQuotaErrors === 0}
                onClick={onResetUsageStats}
                className="min-h-[34px] px-3 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-slate-600 shrink-0"
              >
                {strings.settingsUsageResetBtn}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="rounded-2xl bg-[#F6F8FC] border border-slate-200/70 p-3">
                <p className="text-[11px] text-slate-500">
                  {language === 'hi' ? 'API कॉल' : 'API Calls'}
                </p>
                <p className="mt-1 text-lg font-bold text-[#071428] font-mono tabular-nums">
                  {totalApiCalls}
                </p>
              </div>
              <div className="rounded-2xl bg-[#F6F8FC] border border-slate-200/70 p-3">
                <p className="text-[11px] text-slate-500">
                  {language === 'hi' ? 'कैश बचत' : 'Cache Saved'}
                </p>
                <p className="mt-1 text-lg font-bold text-[#1A6BFF] font-mono tabular-nums">
                  {totalCacheHits}
                </p>
              </div>
              <div className="rounded-2xl bg-[#F6F8FC] border border-slate-200/70 p-3">
                <p className="text-[11px] text-slate-500">
                  {language === 'hi' ? 'कोटा त्रुटियाँ' : '429 Limits'}
                </p>
                <p className="mt-1 text-lg font-bold text-slate-700 font-mono tabular-nums">
                  {totalQuotaErrors}
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {featureKeys.map((key) => {
                const rec = usageStats.features[key];
                const isTop = topFeature === key && rec.apiCalls > 0;
                return (
                  <div
                    key={key}
                    className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-2"
                  >
                    <span className="font-medium text-[#071428] truncate">
                      {featureLabels[key]}
                      {isTop ? (language === 'hi' ? ' (शीर्ष)' : ' (Top)') : ''}
                    </span>
                    <span className="font-mono tabular-nums text-slate-500 shrink-0">
                      {rec.apiCalls} {language === 'hi' ? 'कॉल' : 'calls'}
                      {rec.cacheHits > 0 ? ` · ${rec.cacheHits} ${language === 'hi' ? 'कैश' : 'cached'}` : ''}
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="text-[11px] font-mono text-slate-500 truncate">
              {language === 'hi' ? 'मॉडल' : 'Model'}: {usageStats.lastModelUsed || 'gemini-3.1-flash-lite'}
            </p>
          </section>

          {/* App Version Information */}
          <p className="text-center text-xs text-slate-500 font-mono tabular-nums">
            {strings.brandName} · {strings.settingsVersionLabel} {APP_VERSION} (Build {APP_BUILD})
          </p>
        </div>
      </div>

      {/* Clear All Local History Confirmation Dialog */}
      {confirmClearOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#071428]/65 backdrop-blur-xs flex items-center justify-center p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="settings-clear-history-title"
          aria-describedby="settings-clear-history-desc"
        >
          <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2
                  id="settings-clear-history-title"
                  className="text-base sm:text-lg font-bold text-[#071428]"
                >
                  {strings.settingsClearAllConfirmTitle}
                </h2>
                <p
                  id="settings-clear-history-desc"
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
