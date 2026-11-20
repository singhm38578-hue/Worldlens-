import type { ReactNode } from 'react';
import {
  ArrowLeft,
  Clock,
  Home,
  Languages,
  ScanLine,
  Settings,
  WifiOff,
} from 'lucide-react';
import type { AppLanguage, ScreenRoute } from '../domain/models';
import type { AppStrings } from '../data/localization';
import { WorldLensLogo } from './WorldLensLogo';

interface AppShellProps {
  activeScreen: ScreenRoute;
  language: AppLanguage;
  strings: AppStrings;
  isOnline?: boolean;
  onNavigate: (route: ScreenRoute) => void;
  onLanguageChange: (language: AppLanguage) => void;
  onBackFromResult?: () => void;
  children: ReactNode;
}

export function AppShell({
  activeScreen,
  language,
  strings,
  isOnline = true,
  onNavigate,
  onLanguageChange,
  onBackFromResult,
  children,
}: AppShellProps) {
  const navItems: Array<{
    route: ScreenRoute;
    label: string;
    icon: typeof Home;
  }> = [
    { route: 'home', label: strings.navHome, icon: Home },
    { route: 'scanner', label: strings.navScanner, icon: ScanLine },
    { route: 'translator', label: strings.navTranslator, icon: Languages },
    { route: 'history', label: strings.navHistory, icon: Clock },
    { route: 'profile', label: strings.navProfile, icon: Settings },
  ];

  const isResultScreen = activeScreen === 'result' || activeScreen === 'ai-result';
  const isSettingsSubScreen = activeScreen === 'about' || activeScreen === 'privacy';
  const showMobileBack = (isResultScreen || isSettingsSubScreen) && Boolean(onBackFromResult);

  const screenTitle =
    activeScreen === 'home'
      ? strings.brandName
      : activeScreen === 'scanner'
        ? strings.scannerTitle
        : activeScreen === 'translator'
          ? strings.translatorTitle
          : activeScreen === 'result'
            ? strings.resultTitle
            : activeScreen === 'ai-result'
              ? strings.aiResultTitle
              : activeScreen === 'history'
                ? strings.historyTitle
                : activeScreen === 'about'
                  ? strings.aboutTitle
                  : activeScreen === 'privacy'
                    ? strings.privacyTitle
                    : strings.profileTitle;

  const isRouteActive = (route: ScreenRoute) =>
    activeScreen === route ||
    (isResultScreen && route === 'scanner') ||
    (isSettingsSubScreen && route === 'profile');

  return (
    <div className="min-h-screen bg-[#F6F8FC] text-[#071428] flex flex-col lg:flex-row">
      {/* Desktop Left Navigation Rail */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 bg-[#071428] text-white border-r border-white/10 lg:sticky lg:top-0 lg:h-screen">
        <div className="px-6 pt-7 pb-6">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="flex items-center gap-3 text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B8EFF] rounded-xl"
          >
            <WorldLensLogo size={36} variant="on-dark" />
            <span className="text-base font-bold tracking-[0.12em] text-white whitespace-nowrap shrink-0">
              {strings.brandName}
            </span>
          </button>
          <p className="mt-3 text-xs leading-relaxed text-slate-300/80">
            {strings.tagline}
          </p>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-1" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isRouteActive(item.route);

            return (
              <button
                key={item.route}
                type="button"
                onClick={() => onNavigate(item.route)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full min-h-[46px] px-4 rounded-xl flex items-center gap-3 text-sm font-medium transition-colors duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B8EFF] ${
                  isActive
                    ? 'bg-[#1A6BFF] text-white'
                    : 'text-slate-300 hover:bg-white/8 hover:text-white'
                }`}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div
            className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-white/8"
            role="group"
            aria-label={strings.profileLanguageHeading}
          >
            <button
              type="button"
              onClick={() => onLanguageChange('en')}
              aria-pressed={language === 'en'}
              className={`min-h-[36px] rounded-lg text-xs font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B8EFF] ${
                language === 'en'
                  ? 'bg-white text-[#071428]'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => onLanguageChange('hi')}
              aria-pressed={language === 'hi'}
              className={`min-h-[36px] rounded-lg text-xs font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B8EFF] ${
                language === 'hi'
                  ? 'bg-white text-[#071428]'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              हिन्दी
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Compact Top App Bar (48px height to respect 15% sticky cap) */}
      <header className="lg:hidden sticky top-0 z-30 h-12 px-4 bg-white/95 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {showMobileBack && onBackFromResult ? (
            <button
              type="button"
              onClick={onBackFromResult}
              aria-label={isSettingsSubScreen ? strings.settingsBackToSettings : strings.resultBack}
              className="min-w-[44px] min-h-[44px] -ml-2 flex items-center justify-center text-[#071428] rounded-xl hover:bg-slate-100 active:scale-[0.97] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A6BFF]"
            >
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            </button>
          ) : (
            <WorldLensLogo size={28} variant="on-light" className="shrink-0" />
          )}
          <span className="text-sm font-bold tracking-[0.06em] text-[#071428] truncate">
            {screenTitle}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onLanguageChange(language === 'en' ? 'hi' : 'en')}
          className="min-h-[40px] px-3 rounded-lg text-xs font-semibold text-[#071428] hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A6BFF]"
          aria-label={strings.profileLanguageHeading}
        >
          {language === 'en' ? 'हिन्दी' : 'English'}
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full pb-24 lg:pb-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-10 space-y-5">
          {!isOnline && (
            <div
              role="status"
              aria-live="polite"
              className="rounded-2xl bg-[#071428] text-white px-4 py-3.5 flex items-start gap-3 border border-white/10"
            >
              <WifiOff className="w-5 h-5 text-[#4B8EFF] shrink-0 mt-0.5" aria-hidden="true" />
              <div className="min-w-0 text-xs sm:text-sm leading-relaxed">
                <span className="font-semibold text-white">{strings.offlineBannerTitle}</span>
                <span className="mx-2 text-slate-400" aria-hidden="true">
                  ·
                </span>
                <span className="text-slate-300">{strings.offlineBannerBody}</span>
              </div>
            </div>
          )}

          {children}
        </div>
      </main>

      {/* Mobile Fixed Thumb-Zone Bottom Tab Bar (64px height, compact 320-360dp friendly) */}
      <nav
        aria-label="Mobile bottom navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 pb-safe"
      >
        <div className="grid grid-cols-5 h-16 max-w-lg mx-auto px-0.5 sm:px-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isRouteActive(item.route);

            return (
              <button
                key={item.route}
                type="button"
                onClick={() => onNavigate(item.route)}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.label}
                className={`min-h-[48px] min-w-0 px-0.5 flex flex-col items-center justify-center gap-1 rounded-xl transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A6BFF] ${
                  isActive
                    ? 'text-[#1A6BFF]'
                    : 'text-slate-500 hover:text-[#071428]'
                }`}
              >
                <Icon
                  className="w-[20px] h-[20px] shrink-0"
                  strokeWidth={isActive ? 2.4 : 1.9}
                  aria-hidden="true"
                />
                <span className="text-[10px] sm:text-[11px] font-semibold tracking-tight truncate max-w-full leading-none">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

