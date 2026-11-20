import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  AlertCircle,
  Camera,
  Image as ImageIcon,
  Info,
  Loader2,
  RefreshCw,
  RotateCcw,
  ScanLine,
  Trash2,
  X,
} from 'lucide-react';
import type { SelectedScanImage } from '../domain/models';
import type { AppStrings } from '../data/localization';
import { validateImageFile } from '../utils/imageEncoder';

interface ScannerScreenProps {
  strings: AppStrings;
  selectedImage: SelectedScanImage | null;
  isAnalyzing: boolean;
  onImageSelected: (image: SelectedScanImage | null) => void;
  onScanImage: () => void;
}

type PickerFeedback =
  | 'none'
  | 'gallery-cancelled'
  | 'camera-cancelled'
  | 'camera-denied'
  | 'camera-unavailable'
  | 'unsupported-format'
  | 'file-too-large'
  | 'error';

export function ScannerScreen({
  strings,
  selectedImage,
  isAnalyzing,
  onImageSelected,
  onScanImage,
}: ScannerScreenProps) {
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraFallbackInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [feedback, setFeedback] = useState<PickerFeedback>('none');
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraStreamError, setCameraStreamError] = useState<'none' | 'denied' | 'unavailable'>('none');

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  useEffect(() => {
    const galleryInput = galleryInputRef.current;
    const cameraInput = cameraFallbackInputRef.current;

    const handleGalleryCancel = () => setFeedback('gallery-cancelled');
    const handleCameraCancel = () => setFeedback('camera-cancelled');

    galleryInput?.addEventListener('cancel', handleGalleryCancel);
    cameraInput?.addEventListener('cancel', handleCameraCancel);

    return () => {
      galleryInput?.removeEventListener('cancel', handleGalleryCancel);
      cameraInput?.removeEventListener('cancel', handleCameraCancel);
    };
  }, []);

  const openGalleryPicker = () => {
    const input = galleryInputRef.current;
    if (!input) {
      setFeedback('error');
      return;
    }
    try {
      input.value = '';
      input.click();
    } catch {
      setFeedback('error');
    }
  };

  const openCameraFallbackInput = () => {
    stopCameraStream();
    setCameraModalOpen(false);
    const input = cameraFallbackInputRef.current;
    if (!input) {
      setFeedback('camera-unavailable');
      return;
    }
    try {
      input.value = '';
      input.click();
    } catch {
      setFeedback('camera-unavailable');
    }
  };

  const launchCameraCapture = async () => {
    setFeedback('none');
    setCameraStreamError('none');

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function'
    ) {
      openCameraFallbackInput();
      return;
    }

    setCameraModalOpen(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
        setCameraReady(true);
      }
    } catch (err) {
      stopCameraStream();
      const errName = err instanceof DOMException || err instanceof Error ? err.name : '';
      const denied =
        errName === 'NotAllowedError' ||
        errName === 'PermissionDeniedError' ||
        errName === 'SecurityError';
      setCameraStreamError(denied ? 'denied' : 'unavailable');
    }
  };

  const handleCloseCameraModal = () => {
    stopCameraStream();
    setCameraModalOpen(false);
    setFeedback(
      cameraStreamError === 'denied'
        ? 'camera-denied'
        : cameraStreamError === 'unavailable'
          ? 'camera-unavailable'
          : 'camera-cancelled'
    );
  };

  const handleSnapCameraFrame = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraStreamError('unavailable');
      return;
    }

    // Capture full-resolution camera frame (capped at 1600px on longest edge for memory safety)
    const maxCaptureDim = 1600;
    const scale = Math.min(1, maxCaptureDim / Math.max(video.videoWidth, video.videoHeight));
    const width = Math.round(video.videoWidth * scale);
    const height = Math.round(video.videoHeight * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setFeedback('camera-unavailable');
      stopCameraStream();
      setCameraModalOpen(false);
      return;
    }

    ctx.drawImage(video, 0, 0, width, height);
    canvas.toBlob(
      (blob) => {
        stopCameraStream();
        setCameraModalOpen(false);

        if (!blob) {
          setFeedback('camera-unavailable');
          return;
        }

        const uri = URL.createObjectURL(blob);
        setImageLoadFailed(false);
        setFeedback('none');
        onImageSelected({
          uri,
          name: `camera-preview-${width}x${height}.jpg`,
          source: 'camera',
          dimensions: { width, height },
        });
      },
      'image/jpeg',
      0.9
    );
  };

  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>,
    source: 'gallery' | 'camera'
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      setFeedback(source === 'camera' ? 'camera-cancelled' : 'gallery-cancelled');
      return;
    }

    const validation = validateImageFile(file);
    if (!validation.ok) {
      setFeedback(
        validation.reason === 'unsupported-format'
          ? 'unsupported-format'
          : validation.reason === 'file-too-large'
            ? 'file-too-large'
            : 'error'
      );
      return;
    }

    try {
      const objectUrl = URL.createObjectURL(file);
      setImageLoadFailed(false);
      setFeedback('none');
      onImageSelected({
        uri: objectUrl,
        name: file.name,
        source,
      });
    } catch {
      setFeedback('error');
    }
  };

  const handleRemoveImage = () => {
    onImageSelected(null);
    setImageLoadFailed(false);
    setFeedback('none');
  };

  const canScan = selectedImage !== null && !imageLoadFailed && !isAnalyzing;

  const selectedCaption =
    selectedImage && !imageLoadFailed
      ? selectedImage.source === 'camera'
        ? selectedImage.dimensions
          ? `${strings.scannerSelectedCameraLabel} · ${selectedImage.dimensions.width}×${selectedImage.dimensions.height}`
          : `${strings.scannerSelectedCameraLabel} · ${selectedImage.name}`
        : `${strings.scannerSelectedGalleryLabel} · ${selectedImage.name}`
      : strings.scannerPlaceholderLabel;

  return (
    <div className="space-y-6">
      {/* Hidden native inputs: Gallery picker & mobile system camera capture fallback */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/bmp,image/gif"
        onChange={(e) => handleFileChange(e, 'gallery')}
        className="sr-only"
        aria-label={strings.scannerGalleryCta}
      />
      <input
        ref={cameraFallbackInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        capture="environment"
        onChange={(e) => handleFileChange(e, 'camera')}
        className="sr-only"
        aria-label={strings.scannerTakePhotoCta}
      />

      {/* Header */}
      <header className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#071428]">
          {strings.scannerTitle}
        </h1>
        <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
          {strings.scannerSubtitle}
        </p>
      </header>

      {/* Shared Image Preview / Friendly Empty State */}
      <section className="rounded-3xl bg-[#071428] text-white overflow-hidden border border-slate-900/10">
        <div className="relative aspect-[4/3] sm:aspect-[16/10] w-full bg-[#050E1E] flex items-center justify-center p-3 sm:p-5">
          {selectedImage && !imageLoadFailed ? (
            <img
              src={selectedImage.uri}
              alt={selectedImage.name}
              onError={() => {
                setImageLoadFailed(true);
                setFeedback('error');
              }}
              className="max-w-full max-h-full w-auto h-auto object-contain rounded-2xl"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-center px-6 max-w-md">
              <div className="w-16 h-16 rounded-2xl bg-[#0D2140] border border-white/10 flex items-center justify-center mb-4">
                {imageLoadFailed ? (
                  <AlertCircle className="w-7 h-7 text-[#4B8EFF]" aria-hidden="true" />
                ) : (
                  <Camera className="w-7 h-7 text-[#4B8EFF]" aria-hidden="true" />
                )}
              </div>
              <h2 className="text-base sm:text-lg font-semibold text-white">
                {imageLoadFailed
                  ? strings.scannerErrorTitle
                  : strings.scannerEmptyTitle}
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                {imageLoadFailed
                  ? strings.scannerErrorBody
                  : strings.scannerEmptyBody}
              </p>
            </div>
          )}
        </div>

        {/* Selected image metadata bar */}
        <div className="px-5 py-3.5 bg-[#0D2140] border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
          <span className="truncate font-mono">{selectedCaption}</span>
        </div>
      </section>

      {/* Take Photo & Gallery (before selection) OR Retake, Change Image & Remove Image (after selection) */}
      <section className="space-y-3">
        {!selectedImage ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={launchCameraCapture}
              className="w-full min-h-[52px] px-5 rounded-2xl bg-white border border-slate-200 hover:border-[#1A6BFF]/60 text-[#071428] text-sm font-semibold inline-flex items-center justify-center gap-2.5 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A6BFF]"
            >
              <Camera className="w-5 h-5 text-[#1A6BFF] shrink-0" aria-hidden="true" />
              <span>{strings.scannerTakePhotoCta}</span>
            </button>

            <button
              type="button"
              onClick={openGalleryPicker}
              className="w-full min-h-[52px] px-5 rounded-2xl bg-white border border-slate-200 hover:border-[#1A6BFF]/60 text-[#071428] text-sm font-semibold inline-flex items-center justify-center gap-2.5 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A6BFF]"
            >
              <ImageIcon className="w-5 h-5 text-[#1A6BFF] shrink-0" aria-hidden="true" />
              <span>{strings.scannerGalleryCta}</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={launchCameraCapture}
              className="min-h-[48px] px-4 rounded-xl bg-white border border-slate-200 hover:border-[#1A6BFF]/60 text-[#071428] text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A6BFF]"
            >
              <RotateCcw className="w-4 h-4 text-[#1A6BFF] shrink-0" aria-hidden="true" />
              <span className="truncate">{strings.scannerRetakeCta}</span>
            </button>

            <button
              type="button"
              onClick={openGalleryPicker}
              className="min-h-[48px] px-4 rounded-xl bg-white border border-slate-200 hover:border-[#1A6BFF]/60 text-[#071428] text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A6BFF]"
            >
              <RefreshCw className="w-4 h-4 text-[#1A6BFF] shrink-0" aria-hidden="true" />
              <span className="truncate">{strings.scannerChangeImage}</span>
            </button>

            <button
              type="button"
              onClick={handleRemoveImage}
              className="min-h-[48px] px-4 rounded-xl bg-white border border-slate-200 hover:border-red-300 text-red-700 text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              <Trash2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{strings.scannerRemoveImage}</span>
            </button>
          </div>
        )}

        {/* Primary Scan Button — Enabled ONLY when a valid image is selected */}
        <button
          type="button"
          disabled={!canScan}
          onClick={() => {
            if (canScan) {
              setFeedback('none');
              onScanImage();
            }
          }}
          className="w-full min-h-[54px] px-6 rounded-2xl bg-[#1A6BFF] hover:bg-[#1258DB] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed active:scale-[0.99] text-white text-sm font-semibold inline-flex items-center justify-center gap-2.5 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A6BFF] focus-visible:ring-offset-2"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin shrink-0" aria-hidden="true" />
              <span className="whitespace-nowrap">{strings.scannerAnalyzingButton}</span>
            </>
          ) : (
            <>
              <ScanLine className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span className="whitespace-nowrap">{strings.scannerScanButton}</span>
            </>
          )}
        </button>
      </section>

      {/* Safe Cancellation, Error & Honest AI-Readiness Notices */}
      {feedback === 'gallery-cancelled' && (
        <div
          role="status"
          className="rounded-2xl bg-white border border-slate-200 px-5 py-4 flex items-start gap-3"
        >
          <Info className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-xs sm:text-sm leading-relaxed">
            <span className="font-semibold text-[#071428]">
              {strings.scannerCancelledTitle}
            </span>
            <span className="mx-2 text-slate-400" aria-hidden="true">
              ·
            </span>
            <span className="text-slate-600">{strings.scannerCancelledBody}</span>
          </div>
        </div>
      )}

      {feedback === 'camera-cancelled' && (
        <div
          role="status"
          className="rounded-2xl bg-white border border-slate-200 px-5 py-4 flex items-start gap-3"
        >
          <Info className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-xs sm:text-sm leading-relaxed">
            <span className="font-semibold text-[#071428]">
              {strings.scannerCameraCancelledTitle}
            </span>
            <span className="mx-2 text-slate-400" aria-hidden="true">
              ·
            </span>
            <span className="text-slate-600">{strings.scannerCameraCancelledBody}</span>
          </div>
        </div>
      )}

      {feedback === 'camera-denied' && (
        <div
          role="alert"
          className="rounded-2xl bg-red-50 border border-red-200 px-5 py-4 flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-xs sm:text-sm leading-relaxed">
            <span className="font-semibold text-red-900">
              {strings.scannerCameraDeniedTitle}
            </span>
            <span className="mx-2 text-red-300" aria-hidden="true">
              ·
            </span>
            <span className="text-red-800">{strings.scannerCameraDeniedBody}</span>
          </div>
        </div>
      )}

      {feedback === 'camera-unavailable' && (
        <div
          role="alert"
          className="rounded-2xl bg-red-50 border border-red-200 px-5 py-4 flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-xs sm:text-sm leading-relaxed">
            <span className="font-semibold text-red-900">
              {strings.scannerCameraUnavailableTitle}
            </span>
            <span className="mx-2 text-red-300" aria-hidden="true">
              ·
            </span>
            <span className="text-red-800">{strings.scannerCameraUnavailableBody}</span>
          </div>
        </div>
      )}

      {feedback === 'unsupported-format' && (
        <div
          role="alert"
          className="rounded-2xl bg-red-50 border border-red-200 px-5 py-4 flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-xs sm:text-sm leading-relaxed">
            <span className="font-semibold text-red-900">
              {strings.scannerUnsupportedFormatTitle}
            </span>
            <span className="mx-2 text-red-300" aria-hidden="true">
              ·
            </span>
            <span className="text-red-800">{strings.scannerUnsupportedFormatBody}</span>
          </div>
        </div>
      )}

      {feedback === 'file-too-large' && (
        <div
          role="alert"
          className="rounded-2xl bg-red-50 border border-red-200 px-5 py-4 flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-xs sm:text-sm leading-relaxed">
            <span className="font-semibold text-red-900">
              {strings.scannerFileTooLargeTitle}
            </span>
            <span className="mx-2 text-red-300" aria-hidden="true">
              ·
            </span>
            <span className="text-red-800">{strings.scannerFileTooLargeBody}</span>
          </div>
        </div>
      )}

      {feedback === 'error' && (
        <div
          role="alert"
          className="rounded-2xl bg-red-50 border border-red-200 px-5 py-4 flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-xs sm:text-sm leading-relaxed">
            <span className="font-semibold text-red-900">
              {strings.scannerErrorTitle}
            </span>
            <span className="mx-2 text-red-300" aria-hidden="true">
              ·
            </span>
            <span className="text-red-800">{strings.scannerErrorBody}</span>
          </div>
        </div>
      )}

      {feedback === 'none' && (
        <p className="text-xs text-slate-500 leading-relaxed">
          {strings.permissionCameraExplain}
        </p>
      )}

      {/* Browser Live Camera Capture Sheet */}
      {cameraModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#071428]/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="camera-capture-modal-title"
        >
          <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden border border-slate-200 shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
              <div>
                <h2
                  id="camera-capture-modal-title"
                  className="text-base font-bold text-[#071428]"
                >
                  {strings.scannerCameraModalTitle}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {strings.scannerCameraModalHint}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseCameraModal}
                aria-label={strings.scannerClose}
                className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-[#071428]"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="relative bg-[#050E1E] aspect-[4/3] w-full flex items-center justify-center overflow-hidden">
              {cameraStreamError !== 'none' ? (
                <div className="p-6 text-center max-w-sm">
                  <AlertCircle className="w-8 h-8 text-[#4B8EFF] mx-auto mb-3" aria-hidden="true" />
                  <p className="text-sm font-semibold text-white">
                    {cameraStreamError === 'denied'
                      ? strings.scannerCameraDeniedTitle
                      : strings.scannerCameraUnavailableTitle}
                  </p>
                  <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
                    {cameraStreamError === 'denied'
                      ? strings.scannerCameraDeniedBody
                      : strings.scannerCameraUnavailableBody}
                  </p>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-full h-full object-contain"
                  />
                  {!cameraReady && (
                    <div
                      role="status"
                      aria-live="polite"
                      className="absolute inset-0 flex items-center justify-center bg-[#050E1E]/80 text-white text-xs font-medium"
                    >
                      <Loader2 className="w-5 h-5 animate-spin mr-2" aria-hidden="true" />
                      <span>{strings.scannerStartingCamera}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-4 flex flex-col sm:flex-row gap-2.5 bg-white">
              {cameraStreamError === 'none' && (
                <button
                  type="button"
                  disabled={!cameraReady}
                  onClick={handleSnapCameraFrame}
                  className="flex-1 min-h-[48px] px-5 rounded-xl bg-[#1A6BFF] hover:bg-[#1258DB] disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
                >
                  <Camera className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{strings.scannerCameraSnapButton}</span>
                </button>
              )}

              <button
                type="button"
                onClick={openCameraFallbackInput}
                className="flex-1 min-h-[48px] px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-[#071428] text-sm font-semibold transition-colors whitespace-nowrap"
              >
                {strings.scannerCameraFallbackPicker}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
