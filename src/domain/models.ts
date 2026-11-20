export type AppLanguage = 'en' | 'hi';

export type ScreenRoute =
  | 'splash'
  | 'home'
  | 'scanner'
  | 'translator'
  | 'result'
  | 'ai-result'
  | 'history'
  | 'profile'
  | 'about'
  | 'privacy';

export type TranslatorTab = 'text' | 'camera' | 'voice' | 'conversation' | 'history';

export type TranslationErrorType =
  | 'EMPTY_INPUT'
  | 'TEXT_TOO_LONG'
  | 'NETWORK'
  | 'QUOTA_EXCEEDED'
  | 'UNSUPPORTED_LANGUAGE'
  | 'INVALID_IMAGE'
  | 'AI_UNAVAILABLE'
  | 'UNKNOWN';

export interface TextTranslationOutput {
  sourceText: string;
  translatedText: string;
  detectedSourceLanguage: string;
  targetLanguageName: string;
  modelName: string;
}

export interface CameraTranslationOutput {
  hasReadableText: boolean;
  detectedSourceLanguage: string | null;
  extractedText: string;
  translatedText: string;
  readabilityNote: string | null;
  targetLanguageName: string;
  modelName: string;
}

export interface ConversationTurn {
  id: string;
  speakerLabel: string;
  isPersonA: boolean;
  sourceLanguageCode: string;
  sourceLanguageName: string;
  targetLanguageCode: string;
  targetLanguageName: string;
  targetSpeechLocale: string;
  originalText: string;
  translatedText: string;
}

export interface LocalTranslationRecord {
  id: string;
  mode: 'text' | 'camera' | 'voice' | 'conversation';
  sourceLanguageCode: string;
  sourceLanguageName: string;
  targetLanguageCode: string;
  targetLanguageName: string;
  sourceText: string;
  translatedText: string;
  timestamp: number;
}

export type ScannerMode = 'smart' | 'photo' | 'gallery';

export type ScanImageSource = 'gallery' | 'camera';

export interface SelectedScanImage {
  uri: string;
  name: string;
  source: ScanImageSource;
  dimensions?: {
    width: number;
    height: number;
  };
}

export type ScanAnalysisError =
  | 'NETWORK'
  | 'QUOTA_EXCEEDED'
  | 'INVALID_IMAGE'
  | 'AI_UNAVAILABLE'
  | 'UNKNOWN';

export type VisualConfidenceLevel = 'high' | 'moderate' | 'low' | 'uncertain';

export interface VisualRecognitionReport {
  objectName: string;
  category: string;
  explanation: string;
  characteristics: string[];
  usefulFacts: string[];
  confidenceLevel: VisualConfidenceLevel;
  confidenceExplanation: string;
}

export type HistoryTab = 'scans' | 'translations';

/**
 * Local on-device persisted scan record.
 * Stores structured recognition text, user-selected language, timestamp, and an optional
 * compact local thumbnail strictly on-device — never uploaded to any server.
 */
export interface LocalScanHistoryItem {
  id: string;
  report: VisualRecognitionReport;
  language: AppLanguage;
  modelName: string;
  sourceLabel: ScanImageSource;
  timestamp: number;
  thumbnailDataUrl?: string;
}

export type AiAnalysisState =
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'success';
      report: VisualRecognitionReport;
      modelName: string;
      language: AppLanguage;
    }
  | {
      status: 'error';
      errorType: ScanAnalysisError;
      detail?: string;
    };

export interface LocalizedText {
  en: string;
  hi: string;
}

