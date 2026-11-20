import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import type { AppLanguage } from '../domain/models';
import type { AppStrings } from '../data/localization';
import { WorldLensLogo } from '../components/WorldLensLogo';

interface SplashScreenProps {
  language: AppLanguage;
  strings: AppStrings;
  onEnter: () => void;
  onLanguageChange: (language: AppLanguage) => void;
}

export function SplashScreen({
  language,
  strings,
  onEnter,
  onLanguageChange,
}: SplashScreenProps) {
  return (
    <div className="min-h-screen bg-[#071428] text-white flex flex-col justify-between px-6 py-8 sm:px-10 relative overflow-hidden">
      {/* Subtle geometric optical atmosphere */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 45% at 50% 38%, rgba(26, 107, 255, 0.22) 0%, rgba(7, 20, 40, 0) 70%)',
        }}
      />

      {/* Top row: quiet language switcher */}
      <div className="relative z-10 w-full max-w-4xl mx-auto flex items-center justify-between">
        <span className="text-xs font-medium tracking-[0.14em] text-slate-300/80">
          {strings.splashStageNote}
        </span>

        <div
          className="inline-flex items-center gap-1 p-1 rounded-xl bg-white/8"
          role="group"
          aria-label={strings.profileLanguageHeading}
        >
          <button
            type="button"
            onClick={() => onLanguageChange('en')}
            className={`min-h-[36px] px-3 rounded-lg text-xs font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B8EFF] ${
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
            className={`min-h-[36px] px-3 rounded-lg text-xs font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B8EFF] ${
              language === 'hi'
                ? 'bg-white text-[#071428]'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            हिन्दी
          </button>
        </div>
      </div>

      {/* Center focal brand lockup */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center text-center max-w-xl mx-auto my-auto py-12"
      >
        <div className="relative flex items-center justify-center mb-8">
          <div
            aria-hidden="true"
            className="w-36 h-36 rounded-full border border-white/10 flex items-center justify-center"
          >
            <div className="w-28 h-28 rounded-full border border-[#1A6BFF]/40 flex items-center justify-center">
              <WorldLensLogo size={72} variant="on-dark" />
            </div>
          </div>
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold tracking-[0.16em] text-white">
          {strings.brandName}
        </h1>

        <p className="mt-4 text-lg sm:text-xl font-medium text-slate-200 tracking-wide max-w-md leading-relaxed">
          {strings.tagline}
        </p>

        <div className="mt-10 w-full sm:w-auto">
          <button
            type="button"
            onClick={onEnter}
            className="w-full sm:w-auto min-h-[52px] px-8 py-3.5 rounded-2xl bg-[#1A6BFF] hover:bg-[#1258DB] active:scale-[0.98] text-white text-sm font-semibold tracking-wide inline-flex items-center justify-center gap-2.5 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#071428]"
          >
            <span className="whitespace-nowrap">{strings.splashContinue}</span>
            <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
          </button>
        </div>
      </motion.div>

      {/* Subtle footer line */}
      <div className="relative z-10 w-full max-w-4xl mx-auto text-center text-xs text-slate-400">
        WORLDLENS · v1.0.0
      </div>
    </div>
  );
}
