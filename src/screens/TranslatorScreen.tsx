import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  Camera,
  Check,
  ChevronDown,
  Clock,
  Copy,
  Image as ImageIcon,
  Languages,
  Loader2,
  MessagesSquare,
  Mic,
  MicOff,
  RotateCcw,
  Search,
  Send,
  Share2,
  Trash2,
  Type as TypeIcon,
  Volume2,
  X,
} from 'lucide-react';
import type {
  AppLanguage,
  CameraTranslationOutput,
  ConversationTurn,
  LocalTranslationRecord,
  SelectedScanImage,
  TextTranslationOutput,
  TranslationErrorType,
  TranslatorTab,
} from '../domain/models';
import type { AppStrings } from '../data/localization';
import {
  AUTO_DETECT_LANGUAGE,
  TRANSLATOR_LANGUAGES,
  findTranslatorLanguage,
  type TranslatorLanguage,
} from '../data/translatorLanguages';
import { decodeAndResizeImageUri } from '../utils/imageEncoder';
import {
  MAX_TRANSLATION_INPUT_CHARS,
  TRANSLATION_CHUNK_SIZE_CHARS,
  resolveSwappedLanguages,
  validateTranslationInput,
} from '../utils/translationTextPolicy';
import {
  clearTranslationHistory,
  deleteTranslationHistoryItem,
  formatHistoryDateTime,
  loadTranslationHistory,
  saveTranslationHistoryItem,
} from '../data/localHistoryStore';
import {
  recordAiUsageEvent,
  type TrackedAiFeature,
} from '../data/usageTracker';

const TEXT_TRANSLATE_TIMEOUT_MS = 28_000;
const CAMERA_TRANSLATE_TIMEOUT_MS = 32_000;
const TRANSLATION_CACHE_TTL_MS = 10 * 60 * 1000;
const TRANSLATION_CACHE_MAX_ENTRIES = 50;

interface TranslatorScreenProps {
  language: AppLanguage;
  strings: AppStrings;
  scannerSelectedImage?: SelectedScanImage | null;
  translationHistory?: LocalTranslationRecord[];
  quotaCooldownSeconds?: number;
  onQuotaExceeded?: (retryAfterSeconds?: number) => void;
  onUsageUpdated?: () => void;
  onSaveTranslation?: (record: Omit<LocalTranslationRecord, 'id' | 'timestamp'>) => void;
  onDeleteTranslation?: (id: string) => void;
  onClearTranslations?: () => void;
  prefillTranslation?: LocalTranslationRecord | null;
  onConsumePrefill?: () => void;
}

interface TranslatorError {
  type: TranslationErrorType;
  detail?: string;
}

type LanguagePickerTarget =
  | 'textSource'
  | 'textTarget'
  | 'cameraTarget'
  | 'voiceSource'
  | 'voiceTarget'
  | 'convA'
  | 'convB';

interface BrowserSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<{
    isFinal?: boolean;
    0?: { transcript?: string };
  }>;
}

type SpeechRecognitionCtor = new () => BrowserSpeechRecognition;

const VALID_TRANSLATION_ERRORS = new Set<TranslationErrorType>([
  'EMPTY_INPUT',
  'TEXT_TOO_LONG',
  'NETWORK',
  'QUOTA_EXCEEDED',
  'UNSUPPORTED_LANGUAGE',
  'INVALID_IMAGE',
  'AI_UNAVAILABLE',
  'UNKNOWN',
]);

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

export function TranslatorScreen({
  language,
  strings,
  scannerSelectedImage = null,
  translationHistory: externalHistory,
  quotaCooldownSeconds = 0,
  onQuotaExceeded,
  onUsageUpdated,
  onSaveTranslation,
  onDeleteTranslation,
  onClearTranslations,
  prefillTranslation,
  onConsumePrefill,
}: TranslatorScreenProps) {
  const [activeTab, setActiveTab] = useState<TranslatorTab>('text');
  const [pickerTarget, setPickerTarget] = useState<LanguagePickerTarget | null>(null);
  const [pickerQuery, setPickerQuery] = useState('');
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [micExplained, setMicExplained] = useState(false);
  const [pendingMicAction, setPendingMicAction] = useState<(() => void) | null>(null);

  // --- Text Translator State ---
  const [sourceLang, setSourceLang] = useState<TranslatorLanguage>(AUTO_DETECT_LANGUAGE);
  const [targetLang, setTargetLang] = useState<TranslatorLanguage>(() =>
    findTranslatorLanguage(language === 'hi' ? 'en' : 'hi')
  );
  const [inputText, setInputText] = useState('');
  const [textResult, setTextResult] = useState<TextTranslationOutput | null>(null);
  const [isTranslatingText, setIsTranslatingText] = useState(false);
  const [textError, setTextError] = useState<TranslatorError | null>(null);

  // --- Camera Translator State ---
  const [cameraTargetLang, setCameraTargetLang] = useState<TranslatorLanguage>(() =>
    findTranslatorLanguage(language === 'hi' ? 'hi' : 'en')
  );
  const [cameraImage, setCameraImage] = useState<SelectedScanImage | null>(null);
  const [cameraImageOwned, setCameraImageOwned] = useState(false);
  const [cameraResult, setCameraResult] = useState<CameraTranslationOutput | null>(null);
  const [isTranslatingCamera, setIsTranslatingCamera] = useState(false);
  const [cameraStage, setCameraStage] = useState<'idle' | 'compressing' | 'translating'>('idle');
  const [cameraError, setCameraError] = useState<TranslatorError | null>(null);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);

  // --- Voice Translator State ---
  const [voiceSourceLang, setVoiceSourceLang] = useState<TranslatorLanguage>(() =>
    findTranslatorLanguage('hi')
  );
  const [voiceTargetLang, setVoiceTargetLang] = useState<TranslatorLanguage>(() =>
    findTranslatorLanguage('en')
  );
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceResult, setVoiceResult] = useState<TextTranslationOutput | null>(null);
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [isTranslatingVoice, setIsTranslatingVoice] = useState(false);
  const [voiceError, setVoiceError] = useState<TranslatorError | null>(null);

  // --- Conversation Translator State ---
  const [personALang, setPersonALang] = useState<TranslatorLanguage>(() => findTranslatorLanguage('en'));
  const [personBLang, setPersonBLang] = useState<TranslatorLanguage>(() => findTranslatorLanguage('hi'));
  const [conversationTurns, setConversationTurns] = useState<ConversationTurn[]>([]);
  const [draftA, setDraftA] = useState('');
  const [draftB, setDraftB] = useState('');
  const [listeningSpeaker, setListeningSpeaker] = useState<'A' | 'B' | null>(null);
  const [isTranslatingConv, setIsTranslatingConv] = useState(false);
  const [convError, setConvError] = useState<TranslatorError | null>(null);

  // --- Local History State ---
  const [internalHistory, setInternalHistory] = useState<LocalTranslationRecord[]>(() =>
    externalHistory ?? loadTranslationHistory()
  );
  const historyRecords = externalHistory ?? internalHistory;
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Refs for camera, speech cleanup, synchronous in-flight locks, and bounded session caches
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const fallbackCameraInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const textInFlightRef = useRef<boolean>(false);
  const cameraInFlightRef = useRef<boolean>(false);
  const voiceInFlightRef = useRef<boolean>(false);
  const convInFlightRef = useRef<boolean>(false);
  const textCacheRef = useRef<
    Map<string, { data: TextTranslationOutput; expiresAt: number }>
  >(new Map());
  const cameraCacheRef = useRef<
    Map<string, { data: CameraTranslationOutput; expiresAt: number }>
  >(new Map());

  const speechSupported = useMemo(() => getSpeechRecognitionCtor() !== null, []);

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const stopSpeechRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop errors
      }
      recognitionRef.current = null;
    }
    setIsListeningVoice(false);
    setListeningSpeaker(null);
  }, []);

  useEffect(() => {
    return () => {
      stopCameraStream();
      stopSpeechRecognition();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [stopCameraStream, stopSpeechRecognition]);

  useEffect(() => {
    const uriToRevoke = cameraImageOwned ? cameraImage?.uri : undefined;
    return () => {
      if (uriToRevoke && uriToRevoke.startsWith('blob:')) {
        URL.revokeObjectURL(uriToRevoke);
      }
    };
  }, [cameraImage?.uri, cameraImageOwned]);

  const appendHistory = useCallback(
    (record: Omit<LocalTranslationRecord, 'id' | 'timestamp'>) => {
      if (onSaveTranslation) {
        onSaveTranslation(record);
        return;
      }
      setInternalHistory(saveTranslationHistoryItem(record));
    },
    [onSaveTranslation]
  );

  useEffect(() => {
    if (!prefillTranslation) return;
    setSourceLang(findTranslatorLanguage(prefillTranslation.sourceLanguageCode));
    setTargetLang(findTranslatorLanguage(prefillTranslation.targetLanguageCode));
    setInputText(prefillTranslation.sourceText);
    setTextResult({
      sourceText: prefillTranslation.sourceText,
      translatedText: prefillTranslation.translatedText,
      detectedSourceLanguage: prefillTranslation.sourceLanguageName,
      targetLanguageName: prefillTranslation.targetLanguageName,
      modelName: 'gemini-3.1-flash-lite',
    });
    setTextError(null);
    setActiveTab('text');
    onConsumePrefill?.();
  }, [onConsumePrefill, prefillTranslation]);

  const showTempNotice = useCallback((msg: string) => {
    setStatusNotice(msg);
  }, []);

  const copyText = useCallback(
    async (text: string, markerId?: string) => {
      try {
        await navigator.clipboard.writeText(text);
        if (markerId) {
          setCopiedId(markerId);
          window.setTimeout(() => setCopiedId((curr) => (curr === markerId ? null : curr)), 1600);
        }
        showTempNotice(strings.translatorCopiedNotice);
      } catch {
        showTempNotice(
          language === 'hi'
            ? 'क्लिपबोर्ड पर कॉपी नहीं हो सका।'
            : 'Unable to copy to clipboard in this browser.'
        );
      }
    },
    [language, showTempNotice, strings.translatorCopiedNotice]
  );

  const shareTranslation = useCallback(
    async (text: string) => {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          await navigator.share({ text, title: strings.translatorTitle });
          return;
        } catch {
          // User cancelled share sheet; no error needed
          return;
        }
      }
      await copyText(text);
    },
    [copyText, strings.translatorTitle]
  );

  const speakText = useCallback(
    (text: string, speechLocaleTag: string, langName: string) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        showTempNotice(
          language === 'hi'
            ? 'इस ब्राउज़र में Text-to-Speech उपलब्ध नहीं है।'
            : 'Text-to-Speech is not supported in this browser.'
        );
        return;
      }

      const synth = window.speechSynthesis;
      synth.cancel();

      const voices = synth.getVoices();
      const basePrefix = speechLocaleTag.split('-')[0].toLowerCase();
      const matchingVoice =
        voices.find((v) => v.lang.toLowerCase() === speechLocaleTag.toLowerCase()) ??
        voices.find((v) => v.lang.toLowerCase().startsWith(`${basePrefix}-`) || v.lang.toLowerCase() === basePrefix);

      if (voices.length > 0 && !matchingVoice) {
        showTempNotice(
          language === 'hi'
            ? `${langName} के लिए वॉइस पैक इस डिवाइस पर इंस्टॉल नहीं है।`
            : `No installed Text-to-Speech voice pack found for ${langName} on this device.`
        );
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      if (matchingVoice) {
        utterance.voice = matchingVoice;
        utterance.lang = matchingVoice.lang;
      } else if (speechLocaleTag) {
        utterance.lang = speechLocaleTag;
      }
      utterance.onerror = () => {
        showTempNotice(
          language === 'hi'
            ? `${langName} के लिए ऑडियो प्लेबैक उपलब्ध नहीं हो सका।`
            : `Audio playback could not start for ${langName}.`
        );
      };
      synth.speak(utterance);
    },
    [language, showTempNotice]
  );

  const callTextTranslateApi = useCallback(
    async (
      text: string,
      src: TranslatorLanguage,
      tgt: TranslatorLanguage,
      featureMode: 'text' | 'voice' | 'conversation' = 'text'
    ): Promise<{ ok: true; data: TextTranslationOutput } | { ok: false; error: TranslatorError }> => {
      const trackedFeature: TrackedAiFeature =
        featureMode === 'voice'
          ? 'voice_translate'
          : featureMode === 'conversation'
            ? 'conversation_translate'
            : 'text_translate';

      if (quotaCooldownSeconds > 0) {
        return { ok: false, error: { type: 'QUOTA_EXCEEDED' } };
      }

      // Zero-cost local short-circuit when source and target are explicitly the same language
      if (src.code !== AUTO_DETECT_LANGUAGE.code && src.code === tgt.code) {
        recordAiUsageEvent({
          feature: trackedFeature,
          cached: true,
          latencyMs: 0,
          modelName: 'local-passthrough',
        });
        onUsageUpdated?.();
        return {
          ok: true,
          data: {
            sourceText: text,
            translatedText: text,
            detectedSourceLanguage: src.name,
            targetLanguageName: tgt.name,
            modelName: 'local-passthrough',
            cached: true,
          },
        };
      }

      // Check bounded client session cache to avoid redundant Gemini requests
      const cacheKey = `${src.code}|${tgt.code}|${text}`;
      const cachedEntry = textCacheRef.current.get(cacheKey);
      if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
        recordAiUsageEvent({
          feature: trackedFeature,
          cached: true,
          latencyMs: 0,
          modelName: cachedEntry.data.modelName,
        });
        onUsageUpdated?.();
        return {
          ok: true,
          data: { ...cachedEntry.data, cached: true },
        };
      }
      if (cachedEntry) {
        textCacheRef.current.delete(cacheKey);
      }

      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return { ok: false, error: { type: 'NETWORK' } };
      }

      const startedAt = Date.now();
      const controller = new AbortController();
      let timedOut = false;
      const timeoutId = window.setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, TEXT_TRANSLATE_TIMEOUT_MS);

      try {
        const res = await fetch('/api/translate/text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            sourceLanguage: { code: src.code, name: src.name },
            targetLanguage: { code: tgt.code, name: tgt.name },
            featureMode,
          }),
          signal: controller.signal,
        });

        const payload = (await res.json().catch(() => ({}))) as {
          detectedLanguage?: string;
          translatedText?: string;
          modelName?: string;
          cached?: boolean;
          errorType?: string;
          detail?: string;
          retryAfterSeconds?: number;
        };

        const latencyMs = Date.now() - startedAt;

        if (!res.ok || !payload.translatedText) {
          const mapped: TranslationErrorType =
            payload.errorType && VALID_TRANSLATION_ERRORS.has(payload.errorType as TranslationErrorType)
              ? (payload.errorType as TranslationErrorType)
              : res.status === 429
                ? 'QUOTA_EXCEEDED'
                : res.status === 422
                  ? 'UNSUPPORTED_LANGUAGE'
                  : res.status === 503
                    ? 'AI_UNAVAILABLE'
                    : 'UNKNOWN';

          const isQuota = mapped === 'QUOTA_EXCEEDED' || res.status === 429;
          if (isQuota) {
            onQuotaExceeded?.(payload.retryAfterSeconds ?? 60);
          }

          recordAiUsageEvent({
            feature: trackedFeature,
            cached: false,
            quotaError: isQuota,
            latencyMs,
          });
          onUsageUpdated?.();

          return { ok: false, error: { type: mapped, detail: payload.detail } };
        }

        const resolvedModel = payload.modelName || 'gemini-3.1-flash-lite';
        const data: TextTranslationOutput = {
          sourceText: text,
          translatedText: payload.translatedText,
          detectedSourceLanguage: payload.detectedLanguage || src.name,
          targetLanguageName: tgt.name,
          modelName: resolvedModel,
          cached: Boolean(payload.cached),
        };

        if (textCacheRef.current.size >= TRANSLATION_CACHE_MAX_ENTRIES) {
          const oldest = textCacheRef.current.keys().next().value;
          if (oldest) textCacheRef.current.delete(oldest);
        }
        textCacheRef.current.set(cacheKey, {
          data,
          expiresAt: Date.now() + TRANSLATION_CACHE_TTL_MS,
        });

        recordAiUsageEvent({
          feature: trackedFeature,
          cached: Boolean(payload.cached),
          latencyMs,
          modelName: resolvedModel,
        });
        onUsageUpdated?.();

        return { ok: true, data };
      } catch (err) {
        const isNetwork = timedOut || err instanceof TypeError;
        return {
          ok: false,
          error: {
            type: isNetwork ? 'NETWORK' : 'UNKNOWN',
            detail: timedOut
              ? language === 'hi'
                ? 'अनुरोध का समय समाप्त हो गया। कृपया नेटवर्क जांचें और पुनः प्रयास करें।'
                : 'Translation request timed out. Please check your connection and try again.'
              : err instanceof Error
                ? err.message
                : undefined,
          },
        };
      } finally {
        window.clearTimeout(timeoutId);
      }
    },
    [language, onQuotaExceeded, onUsageUpdated, quotaCooldownSeconds]
  );

  // --- Text Translator Handlers ---
  const handleSwapTextLanguages = () => {
    const { nextSource, nextTarget } = resolveSwappedLanguages(
      sourceLang,
      targetLang,
      textResult?.detectedSourceLanguage
    );
    setSourceLang(nextSource);
    setTargetLang(nextTarget);
    if (textResult?.translatedText) {
      setInputText(textResult.translatedText);
      setTextResult(null);
    }
    setTextError(null);
  };

  const handleTranslateText = async () => {
    if (textInFlightRef.current || isTranslatingText) return;
    if (quotaCooldownSeconds > 0) {
      setTextError({ type: 'QUOTA_EXCEEDED' });
      return;
    }

    const validation = validateTranslationInput(inputText);
    if (validation.status === 'empty') {
      setTextError({ type: 'EMPTY_INPUT' });
      return;
    }
    if (validation.status === 'too_long') {
      setTextError({
        type: 'TEXT_TOO_LONG',
        detail:
          language === 'hi'
            ? `टेक्स्ट बहुत लंबा है (${validation.actualLength} अक्षर)। अधिकतम सीमा ${validation.maxLength} अक्षर है। आपका टेक्स्ट सुरक्षित रखा गया है।`
            : `Text is too long (${validation.actualLength} characters). Maximum supported length is ${validation.maxLength} characters. Your text has been preserved.`,
      });
      return;
    }

    textInFlightRef.current = true;
    setIsTranslatingText(true);
    setTextError(null);
    setStatusNotice(null);

    try {
      const outcome = await callTextTranslateApi(
        validation.cleanedText,
        sourceLang,
        targetLang,
        'text'
      );
      if (outcome.ok) {
        setTextResult(outcome.data);
        appendHistory({
          mode: 'text',
          sourceLanguageCode: sourceLang.code,
          sourceLanguageName: outcome.data.detectedSourceLanguage,
          targetLanguageCode: targetLang.code,
          targetLanguageName: targetLang.name,
          sourceText: outcome.data.sourceText,
          translatedText: outcome.data.translatedText,
        });
      } else {
        // Preserve user's inputText cleanly on failure
        setTextError(outcome.error);
      }
    } finally {
      textInFlightRef.current = false;
      setIsTranslatingText(false);
    }
  };

  // --- Camera Translator Handlers ---
  const handleUseScannerImage = () => {
    if (!scannerSelectedImage) return;
    setCameraImageOwned(false);
    setCameraImage(scannerSelectedImage);
    setCameraResult(null);
    setCameraError(null);
    setStatusNotice(
      language === 'hi'
        ? 'स्कैनर की वर्तमान फ़ोटो अनुवाद के लिए लोड हो गई है।'
        : 'Current Scanner photo loaded for text translation.'
    );
  };

  const handleCameraFileSelected = (file: File | undefined, source: 'gallery' | 'camera') => {
    if (!file) {
      showTempNotice(
        source === 'camera' ? strings.scannerCameraCancelledTitle : strings.scannerCancelledTitle
      );
      return;
    }
    if (!file.type.startsWith('image/')) {
      setCameraError({ type: 'INVALID_IMAGE', detail: strings.scannerErrorBody });
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setCameraImageOwned(true);
    setCameraImage({ uri: objectUrl, name: file.name, source });
    setCameraResult(null);
    setCameraError(null);
    setStatusNotice(null);
  };

  const handleOpenCameraCapture = async () => {
    setCameraError(null);
    setStatusNotice(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      fallbackCameraInputRef.current?.click();
      return;
    }
    setCameraModalOpen(true);
    setCameraStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
    } catch {
      stopCameraStream();
      setCameraModalOpen(false);
      showTempNotice(strings.scannerCameraUnavailableBody);
    } finally {
      setCameraStarting(false);
    }
  };

  const handleSnapCameraFrame = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;

    const maxWidth = 960;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        stopCameraStream();
        setCameraModalOpen(false);
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        setCameraImageOwned(true);
        setCameraImage({
          uri: url,
          name: `camera-translate-${Date.now()}.jpg`,
          source: 'camera',
          dimensions: { width: canvas.width, height: canvas.height },
        });
        setCameraResult(null);
        setCameraError(null);
      },
      'image/jpeg',
      0.88
    );
  };

  const handleTranslateCameraImage = async () => {
    if (!cameraImage || cameraInFlightRef.current || isTranslatingCamera) return;
    if (quotaCooldownSeconds > 0) {
      setCameraError({ type: 'QUOTA_EXCEEDED' });
      return;
    }

    const cacheKey = `${cameraImage.uri}|${cameraTargetLang.code}`;
    const cachedEntry = cameraCacheRef.current.get(cacheKey);
    if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
      setCameraError(null);
      setCameraResult({ ...cachedEntry.data, cached: true });
      recordAiUsageEvent({
        feature: 'camera_translate',
        cached: true,
        latencyMs: 0,
        modelName: cachedEntry.data.modelName,
      });
      onUsageUpdated?.();
      return;
    }
    if (cachedEntry) {
      cameraCacheRef.current.delete(cacheKey);
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setCameraError({ type: 'NETWORK' });
      return;
    }

    cameraInFlightRef.current = true;
    setIsTranslatingCamera(true);
    setCameraStage('compressing');
    setCameraError(null);
    setCameraResult(null);
    setStatusNotice(null);

    const startedAt = Date.now();
    const controller = new AbortController();
    let timedOut = false;
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, CAMERA_TRANSLATE_TIMEOUT_MS);

    try {
      let encoded;
      try {
        encoded = await decodeAndResizeImageUri(cameraImage.uri, 'ocr');
      } catch {
        setCameraError({ type: 'INVALID_IMAGE' });
        return;
      }

      setCameraStage('translating');

      const res = await fetch('/api/translate/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: encoded.imageBase64,
          mimeType: encoded.mimeType,
          targetLanguage: { code: cameraTargetLang.code, name: cameraTargetLang.name },
        }),
        signal: controller.signal,
      });

      const payload = (await res.json().catch(() => ({}))) as Partial<CameraTranslationOutput> & {
        errorType?: string;
        detail?: string;
        retryAfterSeconds?: number;
      };

      const latencyMs = Date.now() - startedAt;

      if (!res.ok || typeof payload.hasReadableText !== 'boolean') {
        const mapped: TranslationErrorType =
          payload.errorType && VALID_TRANSLATION_ERRORS.has(payload.errorType as TranslationErrorType)
            ? (payload.errorType as TranslationErrorType)
            : res.status === 429
              ? 'QUOTA_EXCEEDED'
              : res.status === 400
                ? 'INVALID_IMAGE'
                : res.status === 503
                  ? 'AI_UNAVAILABLE'
                  : 'UNKNOWN';

        const isQuota = mapped === 'QUOTA_EXCEEDED' || res.status === 429;
        if (isQuota) {
          onQuotaExceeded?.(payload.retryAfterSeconds ?? 60);
        }

        recordAiUsageEvent({
          feature: 'camera_translate',
          cached: false,
          quotaError: isQuota,
          latencyMs,
        });
        onUsageUpdated?.();

        setCameraError({ type: mapped, detail: payload.detail });
        return;
      }

      const resolvedModel = payload.modelName ?? 'gemini-3.1-flash-lite';
      const output: CameraTranslationOutput = {
        hasReadableText: payload.hasReadableText,
        detectedSourceLanguage: payload.detectedSourceLanguage ?? null,
        extractedText: payload.extractedText ?? '',
        translatedText: payload.translatedText ?? '',
        readabilityNote: payload.readabilityNote ?? null,
        targetLanguageName: payload.targetLanguageName ?? cameraTargetLang.name,
        modelName: resolvedModel,
        cached: Boolean(payload.cached),
      };

      if (cameraCacheRef.current.size >= TRANSLATION_CACHE_MAX_ENTRIES) {
        const oldest = cameraCacheRef.current.keys().next().value;
        if (oldest) cameraCacheRef.current.delete(oldest);
      }
      cameraCacheRef.current.set(cacheKey, {
        data: output,
        expiresAt: Date.now() + TRANSLATION_CACHE_TTL_MS,
      });

      recordAiUsageEvent({
        feature: 'camera_translate',
        cached: Boolean(payload.cached),
        latencyMs,
        modelName: resolvedModel,
      });
      onUsageUpdated?.();

      setCameraResult(output);

      if (output.hasReadableText && output.translatedText.trim()) {
        appendHistory({
          mode: 'camera',
          sourceLanguageCode: 'auto',
          sourceLanguageName: output.detectedSourceLanguage || 'Detected text',
          targetLanguageCode: cameraTargetLang.code,
          targetLanguageName: cameraTargetLang.name,
          sourceText: output.extractedText,
          translatedText: output.translatedText,
        });
      }
    } catch (err) {
      setCameraError({
        type: timedOut || err instanceof TypeError ? 'NETWORK' : 'UNKNOWN',
        detail: timedOut
          ? language === 'hi'
            ? 'इमेज अनुवाद का समय समाप्त हो गया। कृपया पुनः प्रयास करें।'
            : 'Image translation timed out. Please check your connection and try again.'
          : err instanceof Error
            ? err.message
            : undefined,
      });
    } finally {
      window.clearTimeout(timeoutId);
      cameraInFlightRef.current = false;
      setIsTranslatingCamera(false);
      setCameraStage('idle');
    }
  };

  // --- Voice Translator Handlers ---
  const handleTranslateVoiceText = useCallback(
    async (transcriptText: string, autoSpeak = false) => {
      if (voiceInFlightRef.current) return;
      if (quotaCooldownSeconds > 0) {
        setVoiceError({ type: 'QUOTA_EXCEEDED' });
        return;
      }
      const cleaned = transcriptText.trim();
      if (!cleaned) return;
      voiceInFlightRef.current = true;
      setIsTranslatingVoice(true);
      setVoiceError(null);
      try {
        const outcome = await callTextTranslateApi(
          cleaned,
          voiceSourceLang,
          voiceTargetLang,
          'voice'
        );
        if (outcome.ok) {
          setVoiceResult(outcome.data);
          appendHistory({
            mode: 'voice',
            sourceLanguageCode: voiceSourceLang.code,
            sourceLanguageName: outcome.data.detectedSourceLanguage,
            targetLanguageCode: voiceTargetLang.code,
            targetLanguageName: voiceTargetLang.name,
            sourceText: outcome.data.sourceText,
            translatedText: outcome.data.translatedText,
          });
          if (autoSpeak) {
            speakText(outcome.data.translatedText, voiceTargetLang.speechLocaleTag, voiceTargetLang.name);
          }
        } else {
          setVoiceError(outcome.error);
        }
      } finally {
        voiceInFlightRef.current = false;
        setIsTranslatingVoice(false);
      }
    },
    [
      appendHistory,
      callTextTranslateApi,
      quotaCooldownSeconds,
      speakText,
      voiceSourceLang,
      voiceTargetLang,
    ]
  );

  const startSpeechCapture = (
    localeTag: string,
    onPartial: (text: string) => void,
    onComplete: (finalTranscript: string) => void,
    onStopState: () => void
  ) => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      showTempNotice(strings.translatorVoiceUnsupportedNotice);
      onStopState();
      return;
    }

    stopSpeechRecognition();
    setStatusNotice(null);

    try {
      const rec = new Ctor();
      rec.lang = localeTag || 'en-US';
      rec.continuous = false;
      rec.interimResults = true;

      let latestTranscript = '';

      rec.onresult = (event) => {
        let combined = '';
        for (let i = 0; i < event.results.length; i += 1) {
          combined += event.results[i]?.[0]?.transcript ?? '';
        }
        latestTranscript = combined.trim();
        if (latestTranscript) {
          onPartial(latestTranscript);
        }
      };

      rec.onerror = (event) => {
        const code = event.error ?? 'unknown';
        const message =
          code === 'not-allowed' || code === 'service-not-allowed'
            ? language === 'hi'
              ? 'माइक्रोफ़ोन अनुमति अस्वीकार की गई। वॉइस इनपुट के लिए माइक्रोफ़ोन सक्षम करें।'
              : 'Microphone permission was denied. Enable microphone access to use voice input.'
            : code === 'language-not-supported'
              ? language === 'hi'
                ? 'चयनित भाषा इस ब्राउज़र के स्पीच रिकग्निशन में समर्थित नहीं है।'
                : 'Selected speech language is not supported by this browser speech recognizer.'
              : code === 'no-speech'
                ? language === 'hi'
                  ? 'कोई आवाज़ नहीं पहचानी गई। कृपया फिर से बोलें।'
                  : 'No speech detected. Please speak clearly and try again.'
                : language === 'hi'
                  ? `वॉइस इनपुट पूरा नहीं हो सका (${code})।`
                  : `Speech recognition error (${code}).`;
        showTempNotice(message);
        onStopState();
      };

      rec.onend = () => {
        recognitionRef.current = null;
        onStopState();
        if (latestTranscript) {
          onComplete(latestTranscript);
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch {
      showTempNotice(strings.translatorVoiceUnsupportedNotice);
      onStopState();
    }
  };

  const beginVoiceListening = () => {
    setIsListeningVoice(true);
    startSpeechCapture(
      voiceSourceLang.speechLocaleTag,
      (partial) => setVoiceTranscript(partial),
      (finalText) => {
        setVoiceTranscript(finalText);
        void handleTranslateVoiceText(finalText, true);
      },
      () => setIsListeningVoice(false)
    );
  };

  const handleToggleVoiceListening = () => {
    if (isListeningVoice) {
      stopSpeechRecognition();
      return;
    }
    if (!micExplained) {
      setPendingMicAction(() => beginVoiceListening);
      return;
    }
    beginVoiceListening();
  };

  // --- Conversation Translator Handlers ---
  const handleSendConversationTurn = useCallback(
    async (isPersonA: boolean, text: string, autoSpeak = false) => {
      if (convInFlightRef.current) return;
      if (quotaCooldownSeconds > 0) {
        setConvError({ type: 'QUOTA_EXCEEDED' });
        return;
      }
      const cleaned = text.trim();
      if (!cleaned) return;
      const src = isPersonA ? personALang : personBLang;
      const tgt = isPersonA ? personBLang : personALang;

      convInFlightRef.current = true;
      setIsTranslatingConv(true);
      setConvError(null);
      try {
        const outcome = await callTextTranslateApi(cleaned, src, tgt, 'conversation');

        if (outcome.ok) {
          const turn: ConversationTurn = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            speakerLabel: isPersonA ? strings.translatorConvPersonA : strings.translatorConvPersonB,
            isPersonA,
            sourceLanguageCode: src.code,
            sourceLanguageName: src.name,
            targetLanguageCode: tgt.code,
            targetLanguageName: tgt.name,
            targetSpeechLocale: tgt.speechLocaleTag,
            originalText: outcome.data.sourceText,
            translatedText: outcome.data.translatedText,
          };
          setConversationTurns((prev) => [...prev, turn]);
          appendHistory({
            mode: 'conversation',
            sourceLanguageCode: src.code,
            sourceLanguageName: src.name,
            targetLanguageCode: tgt.code,
            targetLanguageName: tgt.name,
            sourceText: outcome.data.sourceText,
            translatedText: outcome.data.translatedText,
          });
          if (autoSpeak) {
            speakText(outcome.data.translatedText, tgt.speechLocaleTag, tgt.name);
          }
        } else {
          setConvError(outcome.error);
        }
      } finally {
        convInFlightRef.current = false;
        setIsTranslatingConv(false);
      }
    },
    [
      appendHistory,
      callTextTranslateApi,
      personALang,
      personBLang,
      quotaCooldownSeconds,
      speakText,
      strings.translatorConvPersonA,
      strings.translatorConvPersonB,
    ]
  );

  const beginConversationMic = (speaker: 'A' | 'B') => {
    const isPersonA = speaker === 'A';
    const lang = isPersonA ? personALang : personBLang;
    setListeningSpeaker(speaker);
    startSpeechCapture(
      lang.speechLocaleTag,
      (partial) => {
        if (isPersonA) setDraftA(partial);
        else setDraftB(partial);
      },
      (finalText) => {
        if (isPersonA) setDraftA('');
        else setDraftB('');
        void handleSendConversationTurn(isPersonA, finalText, true);
      },
      () => setListeningSpeaker(null)
    );
  };

  const handleToggleConversationMic = (speaker: 'A' | 'B') => {
    if (listeningSpeaker === speaker) {
      stopSpeechRecognition();
      return;
    }
    if (!micExplained) {
      setPendingMicAction(() => () => beginConversationMic(speaker));
      return;
    }
    beginConversationMic(speaker);
  };

  // --- History Handlers ---
  const handleReuseRecord = (rec: LocalTranslationRecord) => {
    setSourceLang(findTranslatorLanguage(rec.sourceLanguageCode));
    setTargetLang(findTranslatorLanguage(rec.targetLanguageCode));
    setInputText(rec.sourceText);
    setTextResult({
      sourceText: rec.sourceText,
      translatedText: rec.translatedText,
      detectedSourceLanguage: rec.sourceLanguageName,
      targetLanguageName: rec.targetLanguageName,
      modelName: 'gemini-3.1-flash-lite',
    });
    setTextError(null);
    setActiveTab('text');
  };

  const handleDeleteRecord = (id: string) => {
    if (onDeleteTranslation) {
      onDeleteTranslation(id);
      return;
    }
    setInternalHistory(deleteTranslationHistoryItem(id));
  };

  const handleClearHistory = () => {
    if (onClearTranslations) {
      onClearTranslations();
    } else {
      setInternalHistory(clearTranslationHistory());
    }
    setConfirmClearOpen(false);
  };

  // --- Picker helpers ---
  const pickerOptions = useMemo(() => {
    const includeAuto = pickerTarget === 'textSource';
    const base = includeAuto ? [AUTO_DETECT_LANGUAGE, ...TRANSLATOR_LANGUAGES] : TRANSLATOR_LANGUAGES;
    const q = pickerQuery.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.nativeName.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q)
    );
  }, [pickerQuery, pickerTarget]);

  const activePickerCode = useMemo(() => {
    switch (pickerTarget) {
      case 'textSource':
        return sourceLang.code;
      case 'textTarget':
        return targetLang.code;
      case 'cameraTarget':
        return cameraTargetLang.code;
      case 'voiceSource':
        return voiceSourceLang.code;
      case 'voiceTarget':
        return voiceTargetLang.code;
      case 'convA':
        return personALang.code;
      case 'convB':
        return personBLang.code;
      default:
        return '';
    }
  }, [
    cameraTargetLang.code,
    personALang.code,
    personBLang.code,
    pickerTarget,
    sourceLang.code,
    targetLang.code,
    voiceSourceLang.code,
    voiceTargetLang.code,
  ]);

  const handleSelectPickerLanguage = (chosen: TranslatorLanguage) => {
    switch (pickerTarget) {
      case 'textSource':
        setSourceLang(chosen);
        setTextError(null);
        break;
      case 'textTarget':
        setTargetLang(chosen);
        setTextError(null);
        break;
      case 'cameraTarget':
        setCameraTargetLang(chosen);
        setCameraError(null);
        break;
      case 'voiceSource':
        setVoiceSourceLang(chosen);
        setVoiceError(null);
        break;
      case 'voiceTarget':
        setVoiceTargetLang(chosen);
        setVoiceError(null);
        break;
      case 'convA':
        setPersonALang(chosen);
        setConvError(null);
        break;
      case 'convB':
        setPersonBLang(chosen);
        setConvError(null);
        break;
      default:
        break;
    }
    setPickerTarget(null);
    setPickerQuery('');
  };

  const renderErrorBox = (err: TranslatorError, onRetry?: () => void) => {
    const isValidationOnly = err.type === 'EMPTY_INPUT' || err.type === 'TEXT_TOO_LONG';

    const title =
      err.type === 'EMPTY_INPUT'
        ? language === 'hi'
          ? 'अनुवाद के लिए टेक्स्ट लिखें'
          : 'Enter Text to Translate'
        : err.type === 'TEXT_TOO_LONG'
          ? language === 'hi'
            ? 'टेक्स्ट की लंबाई सीमा से अधिक है'
            : 'Text Exceeds Maximum Length'
          : err.type === 'NETWORK'
            ? strings.aiErrorNetworkTitle
            : err.type === 'QUOTA_EXCEEDED'
              ? strings.aiErrorQuotaTitle
              : err.type === 'UNSUPPORTED_LANGUAGE'
                ? strings.translatorErrorUnsupportedTitle
                : err.type === 'INVALID_IMAGE'
                  ? strings.aiErrorInvalidImageTitle
                  : err.type === 'AI_UNAVAILABLE'
                    ? strings.aiErrorUnavailableTitle
                    : strings.aiErrorUnknownTitle;

    const body =
      err.detail ||
      (err.type === 'EMPTY_INPUT'
        ? language === 'hi'
          ? 'कृपया अनुवाद करने के लिए कुछ टेक्स्ट टाइप या पेस्ट करें।'
          : 'Please type or paste text before tapping Translate.'
        : err.type === 'TEXT_TOO_LONG'
          ? language === 'hi'
            ? `कृपया टेक्स्ट को ${MAX_TRANSLATION_INPUT_CHARS} अक्षरों के भीतर रखें। आपका टेक्स्ट सुरक्षित है।`
            : `Please keep text within ${MAX_TRANSLATION_INPUT_CHARS.toLocaleString()} characters. Your text has been preserved.`
          : err.type === 'NETWORK'
            ? strings.aiErrorNetworkBody
            : err.type === 'QUOTA_EXCEEDED'
              ? strings.aiErrorQuotaBody
              : err.type === 'UNSUPPORTED_LANGUAGE'
                ? strings.translatorErrorUnsupportedBody
                : err.type === 'INVALID_IMAGE'
                  ? strings.aiErrorInvalidImageBody
                  : err.type === 'AI_UNAVAILABLE'
                    ? strings.aiErrorUnavailableBody
                    : strings.aiErrorUnknownBody);

    return (
      <div
        role="alert"
        className="rounded-2xl bg-red-50/80 border border-red-200 p-4 flex items-start gap-3"
      >
        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-red-900">{title}</p>
          <p className="text-xs text-red-800/85 mt-1 leading-relaxed">{body}</p>
          {!isValidationOnly && (
            <p className="text-[11px] text-red-700/80 mt-1.5">
              {language === 'hi'
                ? 'आपका लिखा हुआ टेक्स्ट सुरक्षित रखा गया है।'
                : 'Your entered text has been preserved.'}
            </p>
          )}
          {quotaCooldownSeconds > 0 && err.type === 'QUOTA_EXCEEDED' && (
            <p className="text-[11px] font-medium text-amber-800 mt-1.5">
              {strings.aiQuotaCooldownHint} ({quotaCooldownSeconds}s)
            </p>
          )}
          {onRetry && !isValidationOnly && (
            <button
              type="button"
              disabled={quotaCooldownSeconds > 0}
              onClick={onRetry}
              className="mt-3 min-h-[38px] px-3.5 rounded-xl bg-white border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold text-red-800 hover:bg-red-100/60 transition-colors"
            >
              {quotaCooldownSeconds > 0
                ? `${strings.aiTryAgain} (${quotaCooldownSeconds}s)`
                : strings.aiTryAgain}
            </button>
          )}
        </div>
      </div>
    );
  };

  const modeTabs: Array<{ id: TranslatorTab; label: string; icon: typeof TypeIcon }> = [
    { id: 'text', label: strings.translatorTabText, icon: TypeIcon },
    { id: 'camera', label: strings.translatorTabCamera, icon: Camera },
    { id: 'voice', label: strings.translatorTabVoice, icon: Mic },
    { id: 'conversation', label: strings.translatorTabConversation, icon: MessagesSquare },
    { id: 'history', label: strings.translatorTabHistory, icon: Clock },
  ];

  const sourceDisplayName =
    sourceLang.code === AUTO_DETECT_LANGUAGE.code ? strings.translatorAutoDetect : sourceLang.name;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <section className="rounded-3xl bg-[#071428] text-white p-6 sm:p-8 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#4B8EFF]">
              {strings.brandName}
            </p>
            <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight">
              {strings.translatorTitle}
            </h1>
            <p className="mt-2 text-sm text-slate-300 max-w-2xl leading-relaxed">
              {strings.translatorSubtitle}
            </p>
          </div>
          <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-[#1A6BFF]/20 border border-[#4B8EFF]/30 items-center justify-center shrink-0">
            <Languages className="w-6 h-6 text-[#4B8EFF]" aria-hidden="true" />
          </div>
        </div>

        {/* Interactive Mode Switcher */}
        <div
          className="mt-6 flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1"
          role="tablist"
          aria-label={strings.translatorTitle}
        >
          {modeTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  stopSpeechRecognition();
                  setActiveTab(tab.id);
                }}
                className={`min-h-[44px] px-4 rounded-xl text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B8EFF] ${
                  active
                    ? 'bg-[#1A6BFF] text-white'
                    : 'bg-white/10 text-slate-200 hover:bg-white/15'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{tab.label}</span>
                {tab.id === 'history' && historyRecords.length > 0 && (
                  <span className="text-xs opacity-80">({historyRecords.length})</span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Inline Status Notice */}
      {statusNotice && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-2xl bg-[#EEF4FF] border border-[#1A6BFF]/20 px-4 py-3 flex items-center justify-between gap-3"
        >
          <p className="text-xs sm:text-sm text-[#071428] leading-snug">{statusNotice}</p>
          <button
            type="button"
            onClick={() => setStatusNotice(null)}
            aria-label={strings.scannerClose}
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-slate-600 hover:bg-white/70 shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* ================= TAB 1: TEXT TRANSLATOR ================= */}
      {activeTab === 'text' && (
        <section className="space-y-4">
          {/* Language Pair Bar */}
          <div className="rounded-2xl bg-white border border-slate-200 p-2 flex items-center gap-2 shadow-xs">
            <button
              type="button"
              onClick={() => setPickerTarget('textSource')}
              aria-label={
                language === 'hi'
                  ? `स्रोत भाषा: ${sourceDisplayName}`
                  : `Source language: ${sourceDisplayName}`
              }
              className="flex-1 min-h-[48px] px-3 sm:px-4 rounded-xl hover:bg-[#F6F8FC] text-left flex items-center justify-between gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A6BFF]"
            >
              <span className="text-sm font-semibold text-[#071428] truncate">
                {sourceDisplayName}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={handleSwapTextLanguages}
              aria-label={strings.translatorSwap}
              className="min-w-[48px] min-h-[48px] rounded-xl bg-[#EEF4FF] text-[#1A6BFF] hover:bg-[#1A6BFF] hover:text-white flex items-center justify-center transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A6BFF]"
            >
              <ArrowLeftRight className="w-4 h-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => setPickerTarget('textTarget')}
              aria-label={
                language === 'hi'
                  ? `लक्ष्य भाषा: ${targetLang.name}`
                  : `Target language: ${targetLang.name}`
              }
              className="flex-1 min-h-[48px] px-3 sm:px-4 rounded-xl hover:bg-[#F6F8FC] text-left flex items-center justify-between gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A6BFF]"
            >
              <span className="text-sm font-semibold text-[#1A6BFF] truncate">
                {targetLang.name}
              </span>
              <ChevronDown className="w-4 h-4 text-[#1A6BFF]/70 shrink-0" aria-hidden="true" />
            </button>
          </div>

          {/* Input Card */}
          {(() => {
            const charCount = inputText.length;
            const isOverLimit = charCount > MAX_TRANSLATION_INPUT_CHARS;
            const isLongText =
              charCount > TRANSLATION_CHUNK_SIZE_CHARS && !isOverLimit;

            return (
              <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 space-y-3.5 shadow-xs">
                <textarea
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    if (textError) setTextError(null);
                  }}
                  rows={5}
                  aria-label={strings.translatorTextPlaceholder}
                  aria-invalid={isOverLimit}
                  placeholder={strings.translatorTextPlaceholder}
                  className={`w-full rounded-xl border bg-[#F6F8FC] px-4 py-3 text-sm sm:text-base text-[#071428] placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 resize-y ${
                    isOverLimit
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-slate-200 focus:ring-[#1A6BFF]'
                  }`}
                />

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span
                    className={
                      isOverLimit
                        ? 'font-semibold text-red-600'
                        : isLongText
                          ? 'text-[#1A6BFF] font-medium'
                          : 'text-slate-500'
                    }
                  >
                    {isOverLimit
                      ? language === 'hi'
                        ? `अधिकतम ${MAX_TRANSLATION_INPUT_CHARS.toLocaleString()} अक्षरों की सीमा पार हो गई है।`
                        : `Exceeds ${MAX_TRANSLATION_INPUT_CHARS.toLocaleString()}-character limit.`
                      : isLongText
                        ? language === 'hi'
                          ? 'लंबा टेक्स्ट सुरक्षित खंडों में अनुवादित किया जाएगा।'
                          : 'Long text will be translated safely in sections.'
                        : language === 'hi'
                          ? 'अर्थ, संदर्भ और फ़ॉर्मेटिंग सुरक्षित रखी जाती है'
                          : 'Preserves meaning, context, and formatting'}
                  </span>
                  <span
                    className={`font-mono tabular-nums ${
                      isOverLimit ? 'font-semibold text-red-600' : 'text-slate-500'
                    }`}
                  >
                    {charCount.toLocaleString()} / {MAX_TRANSLATION_INPUT_CHARS.toLocaleString()}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void handleTranslateText()}
                    disabled={isTranslatingText || isOverLimit || quotaCooldownSeconds > 0}
                    className="flex-1 sm:flex-none min-h-[48px] px-6 rounded-xl bg-[#1A6BFF] hover:bg-[#1258DB] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
                  >
                    {isTranslatingText ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        <span>{strings.translatorTranslatingBtn}</span>
                      </>
                    ) : (
                      <>
                        <Languages className="w-4 h-4" aria-hidden="true" />
                        <span>
                          {quotaCooldownSeconds > 0
                            ? `${strings.translatorTranslateBtn} (${quotaCooldownSeconds}s)`
                            : strings.translatorTranslateBtn}
                        </span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setInputText('');
                      setTextResult(null);
                      setTextError(null);
                    }}
                    disabled={!inputText && !textResult && !textError}
                    className="min-h-[48px] px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-sm font-semibold text-slate-700 inline-flex items-center gap-2 transition-colors whitespace-nowrap"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                    <span>{strings.translatorClearBtn}</span>
                  </button>
                </div>
              </div>
            );
          })()}

          {textError && renderErrorBox(textError, () => void handleTranslateText())}

          {/* Output Card */}
          {textResult && (
            <div className="rounded-2xl bg-white border border-[#1A6BFF]/25 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-[#1A6BFF]">
                  {strings.translatorDetectedPrefix}: {textResult.detectedSourceLanguage} ·{' '}
                  {textResult.targetLanguageName}
                </p>
                {textResult.cached && (
                  <p className="text-xs text-slate-500">{strings.aiCachedResultBadge}</p>
                )}
              </div>

              <p className="text-base sm:text-lg leading-relaxed text-[#071428] whitespace-pre-wrap">
                {textResult.translatedText}
              </p>

              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void copyText(textResult.translatedText, 'text-result')}
                  className="min-h-[42px] px-3.5 rounded-xl bg-[#F6F8FC] hover:bg-slate-100 text-xs sm:text-sm font-semibold text-[#071428] inline-flex items-center gap-1.5 transition-colors"
                >
                  {copiedId === 'text-result' ? (
                    <Check className="w-4 h-4 text-[#1A6BFF]" aria-hidden="true" />
                  ) : (
                    <Copy className="w-4 h-4 text-slate-500" aria-hidden="true" />
                  )}
                  <span>{strings.translatorCopyBtn}</span>
                </button>

                <button
                  type="button"
                  onClick={() => void shareTranslation(textResult.translatedText)}
                  className="min-h-[42px] px-3.5 rounded-xl bg-[#F6F8FC] hover:bg-slate-100 text-xs sm:text-sm font-semibold text-[#071428] inline-flex items-center gap-1.5 transition-colors"
                >
                  <Share2 className="w-4 h-4 text-slate-500" aria-hidden="true" />
                  <span>{strings.translatorShareBtn}</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    speakText(textResult.translatedText, targetLang.speechLocaleTag, targetLang.name)
                  }
                  className="min-h-[42px] px-3.5 rounded-xl bg-[#F6F8FC] hover:bg-slate-100 text-xs sm:text-sm font-semibold text-[#071428] inline-flex items-center gap-1.5 transition-colors"
                >
                  <Volume2 className="w-4 h-4 text-slate-500" aria-hidden="true" />
                  <span>{strings.translatorListenBtn}</span>
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ================= TAB 2: CAMERA TRANSLATOR ================= */}
      {activeTab === 'camera' && (
        <section className="space-y-4">
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              handleCameraFileSelected(e.target.files?.[0], 'gallery');
              e.target.value = '';
            }}
          />
          <input
            ref={fallbackCameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              handleCameraFileSelected(e.target.files?.[0], 'camera');
              e.target.value = '';
            }}
          />

          {/* Target Language Selector */}
          <div className="rounded-2xl bg-white border border-slate-200 px-4 py-3 flex items-center justify-between gap-4 shadow-xs">
            <span className="text-sm font-medium text-slate-600">
              {strings.translatorCameraTargetLabel}
            </span>
            <button
              type="button"
              onClick={() => setPickerTarget('cameraTarget')}
              className="min-h-[42px] px-4 rounded-xl bg-[#EEF4FF] text-[#1A6BFF] text-sm font-semibold inline-flex items-center gap-2 hover:bg-[#1A6BFF] hover:text-white transition-colors"
            >
              <span>{cameraTargetLang.name}</span>
              <ChevronDown className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {/* Image Preview & Capture Controls */}
          <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 space-y-4 shadow-xs">
            <div className="w-full aspect-[4/3] max-h-[380px] rounded-2xl bg-[#071428] overflow-hidden flex items-center justify-center">
              {cameraImage ? (
                <img
                  src={cameraImage.uri}
                  alt={cameraImage.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center px-6 py-8 max-w-md">
                  <Camera className="w-9 h-9 text-[#4B8EFF] mx-auto" aria-hidden="true" />
                  <p className="mt-3 text-base font-semibold text-white">
                    {strings.translatorCameraEmptyTitle}
                  </p>
                  <p className="mt-1.5 text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {strings.translatorCameraEmptyBody}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => void handleOpenCameraCapture()}
                className="min-h-[46px] px-4 rounded-xl border border-slate-200 bg-white hover:bg-[#F6F8FC] text-sm font-semibold text-[#071428] inline-flex items-center justify-center gap-2 transition-colors"
              >
                <Camera className="w-4 h-4 text-[#1A6BFF]" aria-hidden="true" />
                <span>{cameraImage ? strings.scannerRetakeCta : strings.scannerTakePhotoCta}</span>
              </button>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="min-h-[46px] px-4 rounded-xl border border-slate-200 bg-white hover:bg-[#F6F8FC] text-sm font-semibold text-[#071428] inline-flex items-center justify-center gap-2 transition-colors"
              >
                <ImageIcon className="w-4 h-4 text-[#1A6BFF]" aria-hidden="true" />
                <span>{cameraImage ? strings.scannerChangeImage : strings.scannerGalleryCta}</span>
              </button>
            </div>

            {scannerSelectedImage && cameraImage?.uri !== scannerSelectedImage.uri && (
              <button
                type="button"
                onClick={handleUseScannerImage}
                className="w-full min-h-[46px] px-4 rounded-xl bg-[#EEF4FF] hover:bg-[#1A6BFF]/15 border border-[#1A6BFF]/25 text-sm font-semibold text-[#071428] inline-flex items-center justify-center gap-2 transition-colors"
              >
                <ImageIcon className="w-4 h-4 text-[#1A6BFF]" aria-hidden="true" />
                <span>
                  {language === 'hi'
                    ? 'वर्तमान स्कैनर फ़ोटो उपयोग करें'
                    : 'Use current Scanner photo'}
                </span>
              </button>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void handleTranslateCameraImage()}
                disabled={!cameraImage || isTranslatingCamera || quotaCooldownSeconds > 0}
                className="flex-1 min-h-[46px] px-5 rounded-xl bg-[#1A6BFF] hover:bg-[#1258DB] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
              >
                {isTranslatingCamera ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>
                      {cameraStage === 'compressing'
                        ? strings.aiCompressingTitle
                        : strings.translatorCameraExtractingBtn}
                    </span>
                  </>
                ) : (
                  <>
                    <Languages className="w-4 h-4" aria-hidden="true" />
                    <span>
                      {quotaCooldownSeconds > 0
                        ? `${strings.translatorCameraExtractBtn} (${quotaCooldownSeconds}s)`
                        : strings.translatorCameraExtractBtn}
                    </span>
                  </>
                )}
              </button>

              {cameraImage && (
                <button
                  type="button"
                  onClick={() => {
                    setCameraImage(null);
                    setCameraImageOwned(false);
                    setCameraResult(null);
                    setCameraError(null);
                  }}
                  className="min-h-[46px] px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  {strings.scannerRemoveImage}
                </button>
              )}
            </div>
          </div>

          {cameraError && renderErrorBox(cameraError, () => void handleTranslateCameraImage())}

          {cameraResult && !cameraResult.hasReadableText && (
            <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-1.5">
              <p className="text-sm font-semibold text-[#071428]">
                {strings.translatorCameraUnreadableTitle}
              </p>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {cameraResult.readabilityNote || strings.translatorCameraUnreadableBody}
              </p>
            </div>
          )}

          {cameraResult && cameraResult.hasReadableText && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-3 shadow-xs">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {strings.translatorCameraOriginalHeading}
                  {cameraResult.detectedSourceLanguage ? ` · ${cameraResult.detectedSourceLanguage}` : ''}
                </p>
                <p className="text-sm leading-relaxed text-[#071428] whitespace-pre-wrap">
                  {cameraResult.extractedText}
                </p>
              </div>

              <div className="rounded-2xl bg-white border border-[#1A6BFF]/25 p-5 space-y-3 shadow-xs">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#1A6BFF]">
                  {strings.translatorCameraTranslatedHeading} · {cameraResult.targetLanguageName}
                </p>
                <p className="text-sm sm:text-base leading-relaxed text-[#071428] whitespace-pre-wrap font-medium">
                  {cameraResult.translatedText}
                </p>
                {cameraResult.readabilityNote && (
                  <div className="rounded-xl bg-[#EEF4FF] border border-[#1A6BFF]/20 p-3 space-y-0.5">
                    <p className="text-xs font-semibold text-[#071428]">
                      {language === 'hi' ? 'अनिश्चितता / पठनीयता नोट' : 'Image Text Uncertainty Note'}
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {cameraResult.readabilityNote}
                    </p>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void copyText(cameraResult.translatedText, 'camera-result')}
                    className="min-h-[40px] px-3.5 rounded-xl bg-[#F6F8FC] hover:bg-slate-100 text-xs font-semibold text-[#071428] inline-flex items-center gap-1.5"
                  >
                    {copiedId === 'camera-result' ? (
                      <Check className="w-3.5 h-3.5 text-[#1A6BFF]" aria-hidden="true" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                    )}
                    <span>{strings.translatorCopyBtn}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void shareTranslation(cameraResult.translatedText)}
                    className="min-h-[40px] px-3.5 rounded-xl bg-[#F6F8FC] hover:bg-slate-100 text-xs font-semibold text-[#071428] inline-flex items-center gap-1.5"
                  >
                    <Share2 className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                    <span>{strings.translatorShareBtn}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      speakText(
                        cameraResult.translatedText,
                        cameraTargetLang.speechLocaleTag,
                        cameraTargetLang.name
                      )
                    }
                    className="min-h-[40px] px-3.5 rounded-xl bg-[#F6F8FC] hover:bg-slate-100 text-xs font-semibold text-[#071428] inline-flex items-center gap-1.5"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                    <span>{strings.translatorListenBtn}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCameraImage(null);
                      setCameraImageOwned(false);
                      setCameraResult(null);
                      setCameraError(null);
                    }}
                    className="min-h-[40px] px-3.5 rounded-xl bg-[#F6F8FC] hover:bg-slate-100 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                    <span>{strings.translatorClearBtn}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ================= TAB 3: VOICE TRANSLATOR ================= */}
      {activeTab === 'voice' && (
        <section className="space-y-4">
          <div className="rounded-2xl bg-white border border-slate-200 p-2 flex items-center gap-2 shadow-xs">
            <button
              type="button"
              onClick={() => setPickerTarget('voiceSource')}
              className="flex-1 min-h-[46px] px-3 sm:px-4 rounded-xl hover:bg-[#F6F8FC] text-left flex items-center justify-between gap-2"
            >
              <span className="text-sm font-semibold text-[#071428] truncate">
                {voiceSourceLang.name}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => {
                setVoiceSourceLang(voiceTargetLang);
                setVoiceTargetLang(voiceSourceLang);
              }}
              aria-label={strings.translatorSwap}
              className="min-w-[44px] min-h-[44px] rounded-xl bg-[#EEF4FF] text-[#1A6BFF] hover:bg-[#1A6BFF] hover:text-white flex items-center justify-center shrink-0"
            >
              <ArrowLeftRight className="w-4 h-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => setPickerTarget('voiceTarget')}
              className="flex-1 min-h-[46px] px-3 sm:px-4 rounded-xl hover:bg-[#F6F8FC] text-left flex items-center justify-between gap-2"
            >
              <span className="text-sm font-semibold text-[#1A6BFF] truncate">
                {voiceTargetLang.name}
              </span>
              <ChevronDown className="w-4 h-4 text-[#1A6BFF]/70 shrink-0" aria-hidden="true" />
            </button>
          </div>

          {!speechSupported && (
            <div className="rounded-2xl bg-[#EEF4FF] border border-[#1A6BFF]/20 p-4 text-xs sm:text-sm text-[#071428] leading-relaxed">
              {strings.translatorVoiceUnsupportedNotice}
            </div>
          )}

          <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-4 shadow-xs">
            <div className="flex flex-col items-center text-center py-2">
              <button
                type="button"
                onClick={handleToggleVoiceListening}
                disabled={!speechSupported || isTranslatingVoice || quotaCooldownSeconds > 0}
                className={`min-h-[54px] px-7 rounded-2xl text-sm font-semibold inline-flex items-center gap-2.5 transition-colors disabled:opacity-45 ${
                  isListeningVoice
                    ? 'bg-[#071428] text-white'
                    : 'bg-[#1A6BFF] hover:bg-[#1258DB] text-white'
                }`}
              >
                {isListeningVoice ? (
                  <>
                    <MicOff className="w-5 h-5" aria-hidden="true" />
                    <span>{strings.translatorVoiceStopSpeak}</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5" aria-hidden="true" />
                    <span>{strings.translatorVoiceTapSpeak}</span>
                  </>
                )}
              </button>
              {isListeningVoice && (
                <p className="mt-2.5 text-xs font-medium text-[#1A6BFF]">
                  {strings.translatorVoiceListening} ({voiceSourceLang.name})
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="voice-transcript-input"
                className="block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                {strings.translatorVoiceTranscriptLabel}
              </label>
              <textarea
                id="voice-transcript-input"
                value={voiceTranscript}
                onChange={(e) => setVoiceTranscript(e.target.value)}
                rows={3}
                placeholder={strings.translatorVoiceTranscriptPlaceholder}
                className="w-full rounded-xl border border-slate-200 bg-[#F6F8FC] px-4 py-3 text-sm text-[#071428] placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1A6BFF]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void handleTranslateVoiceText(voiceTranscript, false)}
                disabled={!voiceTranscript.trim() || isTranslatingVoice || quotaCooldownSeconds > 0}
                className="flex-1 sm:flex-none min-h-[44px] px-5 rounded-xl bg-[#1A6BFF] hover:bg-[#1258DB] disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
              >
                {isTranslatingVoice ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>{strings.translatorTranslatingBtn}</span>
                  </>
                ) : (
                  <span>
                    {quotaCooldownSeconds > 0
                      ? `${strings.translatorTranslateBtn} (${quotaCooldownSeconds}s)`
                      : strings.translatorTranslateBtn}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setVoiceTranscript('');
                  setVoiceResult(null);
                  setVoiceError(null);
                }}
                className="min-h-[44px] px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {strings.translatorClearBtn}
              </button>
            </div>
          </div>

          {voiceError &&
            renderErrorBox(voiceError, () => void handleTranslateVoiceText(voiceTranscript, false))}

          {voiceResult && (
            <div className="rounded-2xl bg-white border border-[#1A6BFF]/25 p-5 space-y-4 shadow-xs">
              <p className="text-xs font-semibold text-[#1A6BFF]">
                {voiceResult.targetLanguageName}
              </p>
              <p className="text-base sm:text-lg text-[#071428] leading-relaxed whitespace-pre-wrap">
                {voiceResult.translatedText}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() =>
                    speakText(
                      voiceResult.translatedText,
                      voiceTargetLang.speechLocaleTag,
                      voiceTargetLang.name
                    )
                  }
                  className="min-h-[42px] px-4 rounded-xl bg-[#071428] hover:bg-[#0D2140] text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2"
                >
                  <Volume2 className="w-4 h-4" aria-hidden="true" />
                  <span>{strings.translatorVoiceReadAloud}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void copyText(voiceResult.translatedText, 'voice-result')}
                  className="min-h-[42px] px-4 rounded-xl bg-[#F6F8FC] hover:bg-slate-100 text-xs sm:text-sm font-semibold text-[#071428] inline-flex items-center gap-1.5"
                >
                  <Copy className="w-4 h-4 text-slate-500" aria-hidden="true" />
                  <span>{strings.translatorCopyBtn}</span>
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ================= TAB 4: CONVERSATION TRANSLATOR ================= */}
      {activeTab === 'conversation' && (
        <section className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Person A Card */}
            <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {strings.translatorConvPersonA}
                </span>
                <button
                  type="button"
                  onClick={() => setPickerTarget('convA')}
                  className="min-h-[38px] px-3 rounded-xl bg-[#EEF4FF] text-[#1A6BFF] text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <span>{personALang.name}</span>
                  <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleToggleConversationMic('A')}
                disabled={!speechSupported || isTranslatingConv || quotaCooldownSeconds > 0}
                className={`w-full min-h-[44px] rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-45 ${
                  listeningSpeaker === 'A'
                    ? 'bg-[#071428] text-white'
                    : 'bg-[#1A6BFF] hover:bg-[#1258DB] text-white'
                }`}
              >
                {listeningSpeaker === 'A' ? (
                  <MicOff className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Mic className="w-4 h-4" aria-hidden="true" />
                )}
                <span>
                  {listeningSpeaker === 'A' ? strings.translatorConvStop : strings.translatorConvSpeak}{' '}
                  ({personALang.name})
                </span>
              </button>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!draftA.trim() || isTranslatingConv || quotaCooldownSeconds > 0) return;
                  const msg = draftA;
                  setDraftA('');
                  void handleSendConversationTurn(true, msg, false);
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={draftA}
                  onChange={(e) => setDraftA(e.target.value)}
                  placeholder={strings.translatorConvTypePlaceholder}
                  className="flex-1 min-h-[42px] px-3.5 rounded-xl border border-slate-200 bg-[#F6F8FC] text-sm text-[#071428] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1A6BFF]"
                />
                <button
                  type="submit"
                  disabled={!draftA.trim() || isTranslatingConv || quotaCooldownSeconds > 0}
                  aria-label="Send Person A"
                  className="min-w-[42px] min-h-[42px] rounded-xl bg-[#071428] text-white disabled:opacity-40 flex items-center justify-center shrink-0"
                >
                  <Send className="w-4 h-4" aria-hidden="true" />
                </button>
              </form>
            </div>

            {/* Person B Card */}
            <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {strings.translatorConvPersonB}
                </span>
                <button
                  type="button"
                  onClick={() => setPickerTarget('convB')}
                  className="min-h-[38px] px-3 rounded-xl bg-slate-100 text-[#071428] text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <span>{personBLang.name}</span>
                  <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleToggleConversationMic('B')}
                disabled={!speechSupported || isTranslatingConv || quotaCooldownSeconds > 0}
                className={`w-full min-h-[44px] rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-45 ${
                  listeningSpeaker === 'B'
                    ? 'bg-[#1A6BFF] text-white'
                    : 'bg-[#071428] hover:bg-[#0D2140] text-white'
                }`}
              >
                {listeningSpeaker === 'B' ? (
                  <MicOff className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Mic className="w-4 h-4" aria-hidden="true" />
                )}
                <span>
                  {listeningSpeaker === 'B' ? strings.translatorConvStop : strings.translatorConvSpeak}{' '}
                  ({personBLang.name})
                </span>
              </button>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!draftB.trim() || isTranslatingConv || quotaCooldownSeconds > 0) return;
                  const msg = draftB;
                  setDraftB('');
                  void handleSendConversationTurn(false, msg, false);
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={draftB}
                  onChange={(e) => setDraftB(e.target.value)}
                  placeholder={strings.translatorConvTypePlaceholder}
                  className="flex-1 min-h-[42px] px-3.5 rounded-xl border border-slate-200 bg-[#F6F8FC] text-sm text-[#071428] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1A6BFF]"
                />
                <button
                  type="submit"
                  disabled={!draftB.trim() || isTranslatingConv || quotaCooldownSeconds > 0}
                  aria-label="Send Person B"
                  className="min-w-[42px] min-h-[42px] rounded-xl bg-[#1A6BFF] text-white disabled:opacity-40 flex items-center justify-center shrink-0"
                >
                  <Send className="w-4 h-4" aria-hidden="true" />
                </button>
              </form>
            </div>
          </div>

          {convError && renderErrorBox(convError)}

          {isTranslatingConv && (
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600 px-1">
              <Loader2 className="w-4 h-4 animate-spin text-[#1A6BFF]" aria-hidden="true" />
              <span>{strings.translatorTranslatingBtn}</span>
            </div>
          )}

          {conversationTurns.length === 0 ? (
            <div className="rounded-2xl bg-white border border-slate-200 p-6 space-y-1.5">
              <p className="text-sm font-semibold text-[#071428]">
                {strings.translatorConvEmptyTitle}
              </p>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {strings.translatorConvEmptyBody}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {strings.translatorTabConversation} ({conversationTurns.length})
                </span>
                <button
                  type="button"
                  onClick={() => setConversationTurns([])}
                  className="text-xs font-semibold text-slate-500 hover:text-[#071428]"
                >
                  {strings.translatorConvClear}
                </button>
              </div>

              {conversationTurns.map((turn) => (
                <div
                  key={turn.id}
                  className={`rounded-2xl border p-4 space-y-2 ${
                    turn.isPersonA
                      ? 'bg-white border-slate-200'
                      : 'bg-[#EEF4FF]/70 border-[#1A6BFF]/20'
                  }`}
                >
                  <p className="text-xs font-semibold text-[#1A6BFF]">
                    {turn.speakerLabel} · {turn.sourceLanguageName} → {turn.targetLanguageName}
                  </p>
                  <p className="text-sm text-slate-600">{turn.originalText}</p>
                  <p className="text-base font-medium text-[#071428]">{turn.translatedText}</p>
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        speakText(turn.translatedText, turn.targetSpeechLocale, turn.targetLanguageName)
                      }
                      className="min-h-[36px] px-3 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-[#071428] inline-flex items-center gap-1.5 hover:bg-slate-50"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-[#1A6BFF]" aria-hidden="true" />
                      <span>{strings.translatorListenBtn}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ================= TAB 5: LOCAL TRANSLATION HISTORY ================= */}
      {activeTab === 'history' && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs sm:text-sm text-slate-500">
              {strings.translatorHistoryLocalNotice}
            </p>
            {historyRecords.length > 0 && (
              <button
                type="button"
                onClick={() => setConfirmClearOpen(true)}
                className="min-h-[38px] px-3.5 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-xs font-semibold text-red-700"
              >
                {strings.translatorHistoryClearAll}
              </button>
            )}
          </div>

          {historyRecords.length === 0 ? (
            <div className="rounded-2xl bg-white border border-slate-200 p-6 space-y-1.5">
              <p className="text-sm font-semibold text-[#071428]">
                {strings.translatorHistoryEmptyTitle}
              </p>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {strings.translatorHistoryEmptyBody}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {historyRecords.map((rec) => (
                <article
                  key={rec.id}
                  className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 space-y-2.5 shadow-xs"
                >
                  <div>
                    <p className="text-xs font-semibold text-[#1A6BFF]">
                      {rec.mode.toUpperCase()} · {rec.sourceLanguageName} → {rec.targetLanguageName}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {formatHistoryDateTime(rec.timestamp, language)}
                    </p>
                  </div>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap line-clamp-3">
                    {rec.sourceText}
                  </p>
                  <p className="text-sm sm:text-base font-medium text-[#071428] whitespace-pre-wrap">
                    {rec.translatedText}
                  </p>
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void copyText(rec.translatedText, rec.id)}
                      className="min-h-[38px] px-3 rounded-xl bg-[#F6F8FC] hover:bg-slate-100 text-xs font-semibold text-[#071428] inline-flex items-center gap-1.5"
                    >
                      {copiedId === rec.id ? (
                        <Check className="w-3.5 h-3.5 text-[#1A6BFF]" aria-hidden="true" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                      )}
                      <span>{strings.translatorCopyBtn}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReuseRecord(rec)}
                      className="min-h-[38px] px-3 rounded-xl bg-[#EEF4FF] hover:bg-[#1A6BFF] hover:text-white text-xs font-semibold text-[#1A6BFF] inline-flex items-center gap-1.5 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{strings.translatorHistoryReuse}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRecord(rec.id)}
                      className="min-h-[38px] px-3 rounded-xl hover:bg-red-50 text-xs font-semibold text-red-700 inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{strings.translatorHistoryDelete}</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ================= LIVE CAMERA CAPTURE MODAL ================= */}
      {cameraModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#071428]/75 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={strings.scannerCameraModalTitle}
        >
          <div className="w-full max-w-lg rounded-3xl bg-white overflow-hidden shadow-2xl border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#071428]">{strings.scannerCameraModalTitle}</h2>
              <button
                type="button"
                onClick={() => {
                  stopCameraStream();
                  setCameraModalOpen(false);
                }}
                aria-label={strings.scannerClose}
                className="min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <div className="bg-[#071428] aspect-[4/3] relative flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain"
              />
              {cameraStarting && (
                <div
                  role="status"
                  aria-live="polite"
                  className="absolute inset-0 flex items-center justify-center bg-[#071428]/80 text-white text-xs font-medium"
                >
                  <Loader2 className="w-5 h-5 animate-spin mr-2" aria-hidden="true" />
                  <span>{strings.scannerStartingCamera}</span>
                </div>
              )}
            </div>
            <div className="p-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  stopCameraStream();
                  setCameraModalOpen(false);
                  fallbackCameraInputRef.current?.click();
                }}
                className="min-h-[44px] px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {strings.scannerCameraFallbackPicker}
              </button>
              <button
                type="button"
                onClick={handleSnapCameraFrame}
                disabled={cameraStarting}
                className="min-h-[44px] px-5 rounded-xl bg-[#1A6BFF] hover:bg-[#1258DB] text-white text-sm font-semibold inline-flex items-center gap-2"
              >
                <Camera className="w-4 h-4" aria-hidden="true" />
                <span>{strings.scannerCameraSnapButton}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= SEARCHABLE 105+ LANGUAGE PICKER MODAL ================= */}
      {pickerTarget && (
        <div
          className="fixed inset-0 z-50 bg-[#071428]/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={strings.translatorPickerTitle}
        >
          <div className="w-full max-w-md max-h-[80vh] rounded-3xl bg-white border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
              <h2 className="text-base font-bold text-[#071428]">
                {strings.translatorPickerTitle} ({TRANSLATOR_LANGUAGES.length}+)
              </h2>
              <button
                type="button"
                onClick={() => {
                  setPickerTarget(null);
                  setPickerQuery('');
                }}
                aria-label={strings.scannerClose}
                className="min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="p-3 border-b border-slate-100">
              <div className="relative">
                <Search
                  className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={pickerQuery}
                  onChange={(e) => setPickerQuery(e.target.value)}
                  placeholder={strings.translatorPickerSearch}
                  autoFocus
                  className="w-full min-h-[44px] pl-10 pr-4 rounded-xl border border-slate-200 bg-[#F6F8FC] text-sm text-[#071428] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1A6BFF]"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {pickerOptions.length === 0 ? (
                <p className="px-3.5 py-6 text-center text-xs sm:text-sm text-slate-500">
                  {language === 'hi'
                    ? `"${pickerQuery}" के लिए कोई समर्थित भाषा नहीं मिली।`
                    : `No supported language matches "${pickerQuery}".`}
                </p>
              ) : (
                pickerOptions.map((lang) => {
                  const selected = lang.code === activePickerCode;
                  const displayName =
                    lang.code === AUTO_DETECT_LANGUAGE.code
                      ? strings.translatorAutoDetect
                      : lang.name;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => handleSelectPickerLanguage(lang)}
                      className={`w-full min-h-[46px] px-3.5 py-2 rounded-xl text-left flex items-center justify-between gap-3 transition-colors ${
                        selected
                          ? 'bg-[#EEF4FF] text-[#1A6BFF]'
                          : 'hover:bg-slate-50 text-[#071428]'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{displayName}</p>
                        {lang.nativeName !== lang.name && (
                          <p className="text-xs text-slate-500 truncate">{lang.nativeName}</p>
                        )}
                      </div>
                      <span className="text-xs font-mono text-slate-400 shrink-0">{lang.code}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= CLEAR ALL TRANSLATIONS CONFIRMATION MODAL ================= */}
      {confirmClearOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#071428]/65 backdrop-blur-xs flex items-center justify-center p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="translator-clear-confirm-title"
        >
          <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2
                  id="translator-clear-confirm-title"
                  className="text-base sm:text-lg font-bold text-[#071428]"
                >
                  {strings.historyConfirmClearTranslationsTitle}
                </h2>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                  {strings.historyConfirmClearTranslationsBody}
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
                onClick={handleClearHistory}
                className="min-h-[44px] px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
              >
                {strings.historyConfirmDeleteBtn}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ================= MICROPHONE PERMISSION EXPLANATION MODAL ================= */}
      {pendingMicAction && (
        <div
          className="fixed inset-0 z-50 bg-[#071428]/65 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mic-permission-title"
          aria-describedby="mic-permission-body"
        >
          <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EEF4FF] text-[#1A6BFF] flex items-center justify-center shrink-0">
                <Mic className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2
                  id="mic-permission-title"
                  className="text-base sm:text-lg font-bold text-[#071428]"
                >
                  {strings.permissionMicTitle}
                </h2>
                <p
                  id="mic-permission-body"
                  className="mt-1.5 text-sm text-slate-600 leading-relaxed"
                >
                  {strings.permissionMicBody}
                </p>
              </div>
            </div>
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPendingMicAction(null)}
                className="min-h-[44px] px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold text-[#071428] transition-colors"
              >
                {strings.permissionNotNow}
              </button>
              <button
                type="button"
                onClick={() => {
                  const action = pendingMicAction;
                  setMicExplained(true);
                  setPendingMicAction(null);
                  action();
                }}
                className="min-h-[44px] px-4 rounded-xl bg-[#1A6BFF] hover:bg-[#1258DB] text-white text-sm font-semibold transition-colors"
              >
                {strings.permissionContinue}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
