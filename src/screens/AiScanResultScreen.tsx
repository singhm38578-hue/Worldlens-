import { AlertCircle, ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import type {
  AiAnalysisState,
  ScanAnalysisError,
  SelectedScanImage,
} from '../domain/models';
import type { AppStrings } from '../data/localization';

interface AiScanResultScreenProps {
  strings: AppStrings;
  selectedImage: SelectedScanImage | null;
  analysisState: AiAnalysisState;
  onBack: () => void;
  onTryAgain: () => void;
}

function getErrorCopy(
  errorType: ScanAnalysisError,
  strings: AppStrings
): { title: string; body: string } {
  switch (errorType) {
    case 'NETWORK':
      return {
        title: strings.aiErrorNetworkTitle,
        body: strings.aiErrorNetworkBody,
      };
    case 'QUOTA_EXCEEDED':
      return {
        title: strings.aiErrorQuotaTitle,
        body: strings.aiErrorQuotaBody,
      };
    case 'INVALID_IMAGE':
      return {
        title: strings.aiErrorInvalidImageTitle,
        body: strings.aiErrorInvalidImageBody,
      };
    case 'AI_UNAVAILABLE':
      return {
        title: strings.aiErrorUnavailableTitle,
        body: strings.aiErrorUnavailableBody,
      };
    default:
      return {
        title: strings.aiErrorUnknownTitle,
        body: strings.aiErrorUnknownBody,
      };
  }
}

export function AiScanResultScreen({
  strings,
  selectedImage,
  analysisState,
  onBack,
  onTryAgain,
}: AiScanResultScreenProps) {
  const imageCaption = selectedImage
    ? selectedImage.source === 'camera'
      ? selectedImage.dimensions
        ? `${strings.scannerSelectedCameraLabel} · ${selectedImage.dimensions.width}×${selectedImage.dimensions.height}`
        : `${strings.scannerSelectedCameraLabel} · ${selectedImage.name}`
      : `${strings.scannerSelectedGalleryLabel} · ${selectedImage.name}`
    : '';

  return (
    <div className="space-y-6">
      {/* Desktop Back Bar */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="hidden lg:inline-flex items-center gap-2 min-h-[42px] px-3 -ml-3 rounded-xl text-sm font-semibold text-[#071428] hover:bg-slate-200/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A6BFF]"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>{strings.aiResultBackToScanner}</span>
        </button>

        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#071428]">
          {strings.aiResultTitle}
        </h1>
      </div>

      {/* 2-Column Split on Desktop, Stacked on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Actual Selected Photo */}
        {selectedImage && (
          <figure className="lg:col-span-5 rounded-3xl bg-[#071428] border border-slate-900/10 overflow-hidden">
            <div className="aspect-[4/3] w-full bg-[#050E1E] flex items-center justify-center p-3">
              <img
                src={selectedImage.uri}
                alt={selectedImage.name}
                className="max-w-full max-h-full w-auto h-auto object-contain rounded-2xl"
              />
            </div>
            <figcaption className="px-5 py-3.5 bg-[#0D2140] border-t border-white/10 text-xs font-mono text-slate-300 truncate">
              {imageCaption}
            </figcaption>
          </figure>
        )}

        {/* Right: Loading / Real Gemini Response / Error Card */}
        <section className="lg:col-span-7">
          {(analysisState.status === 'idle' ||
            analysisState.status === 'loading') && (
            <div
              role="status"
              aria-live="polite"
              className="rounded-3xl bg-white border border-slate-200/90 px-6 py-14 text-center"
            >
              <Loader2
                className="w-9 h-9 text-[#1A6BFF] animate-spin mx-auto"
                aria-hidden="true"
              />
              <h2 className="mt-5 text-lg font-bold text-[#071428]">
                {strings.aiLoadingTitle}
              </h2>
              <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                {strings.aiLoadingBody}
              </p>
            </div>
          )}

          {analysisState.status === 'success' && (() => {
            const { report } = analysisState;
            const confidenceLabel =
              report.confidenceLevel === 'high'
                ? strings.aiConfidenceHigh
                : report.confidenceLevel === 'moderate'
                  ? strings.aiConfidenceModerate
                  : report.confidenceLevel === 'low'
                    ? strings.aiConfidenceLow
                    : strings.aiConfidenceUncertain;

            return (
              <div className="rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-8 space-y-6">
                <div className="pb-4 border-b border-slate-100 space-y-2">
                  <p className="text-xs font-semibold text-[#1A6BFF]">
                    {report.category} · {confidenceLabel} · {analysisState.modelName}
                  </p>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#071428]">
                    {report.objectName}
                  </h2>
                </div>

                {report.explanation && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {strings.aiSectionExplanation}
                    </h3>
                    <p className="text-sm sm:text-[15px] leading-relaxed text-slate-800 whitespace-pre-wrap">
                      {report.explanation}
                    </p>
                  </div>
                )}

                {report.characteristics.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {strings.aiSectionCharacteristics}
                    </h3>
                    <ul className="space-y-1.5 text-sm text-slate-700 leading-relaxed list-disc pl-5">
                      {report.characteristics.map((item, idx) => (
                        <li key={`char-${idx}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {report.usefulFacts.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {strings.aiSectionUsefulFacts}
                    </h3>
                    <ul className="space-y-1.5 text-sm text-slate-700 leading-relaxed list-disc pl-5">
                      {report.usefulFacts.map((fact, idx) => (
                        <li key={`fact-${idx}`}>{fact}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {report.confidenceExplanation && (
                  <div className="rounded-2xl bg-[#EEF4FF] border border-[#1A6BFF]/20 p-4 space-y-1">
                    <h3 className="text-xs font-semibold text-[#071428]">
                      {strings.aiSectionConfidenceNote}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                      {report.confidenceExplanation}
                    </p>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={onTryAgain}
                    className="flex-1 min-h-[48px] px-5 rounded-xl bg-white border border-slate-200 hover:border-[#1A6BFF]/60 text-[#071428] text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A6BFF]"
                  >
                    <RefreshCw className="w-4 h-4 text-[#1A6BFF] shrink-0" aria-hidden="true" />
                    <span>{strings.aiTryAgain}</span>
                  </button>
                  <button
                    type="button"
                    onClick={onBack}
                    className="flex-1 min-h-[48px] px-5 rounded-xl bg-[#1A6BFF] hover:bg-[#1258DB] text-white text-sm font-semibold transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A6BFF] focus-visible:ring-offset-2"
                  >
                    {strings.aiNewScan}
                  </button>
                </div>
              </div>
            );
          })()}

          {analysisState.status === 'error' && (() => {
            const copy = getErrorCopy(analysisState.errorType, strings);
            return (
              <div
                role="alert"
                className="rounded-3xl bg-white border border-red-200 p-6 sm:p-8 space-y-4"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle
                    className="w-6 h-6 text-red-600 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-[#071428]">
                      {copy.title}
                    </h2>
                    <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                      {copy.body}
                    </p>
                    {analysisState.detail && (
                      <p className="mt-2 text-xs font-mono text-slate-500 break-words">
                        {analysisState.detail}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-3 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={onTryAgain}
                    className="flex-1 min-h-[48px] px-5 rounded-xl bg-[#1A6BFF] hover:bg-[#1258DB] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A6BFF] focus-visible:ring-offset-2"
                  >
                    <RefreshCw className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{strings.aiTryAgain}</span>
                  </button>
                  <button
                    type="button"
                    onClick={onBack}
                    className="flex-1 min-h-[48px] px-5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-[#071428] text-sm font-semibold transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A6BFF]"
                  >
                    {strings.aiResultBackToScanner}
                  </button>
                </div>
              </div>
            );
          })()}
        </section>
      </div>
    </div>
  );
}
