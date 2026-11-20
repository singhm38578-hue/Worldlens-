import type { AppLanguage } from '../domain/models';

export interface AppStrings {
  brandName: string;
  tagline: string;
  splashContinue: string;
  splashStageNote: string;

  navHome: string;
  navScanner: string;
  navTranslator: string;
  navHistory: string;
  navProfile: string;

  homeGreeting: string;
  homeIntro: string;
  homeSmartScannerTitle: string;
  homeSmartScannerSubtitle: string;
  homeSmartScannerCta: string;
  homeTakePhotoTitle: string;
  homeTakePhotoSubtitle: string;
  homeGalleryTitle: string;
  homeGallerySubtitle: string;
  homeRecentHeading: string;
  homeRecentDemoCaption: string;
  homeViewAllHistory: string;
  homeToggleEmpty: string;
  homeRestoreDemo: string;
  homeRecentEmptyTitle: string;
  homeRecentEmptyBody: string;

  scannerTitle: string;
  scannerSubtitle: string;
  scannerPlaceholderLabel: string;
  scannerPlaceholderNotice: string;
  scannerEmptyTitle: string;
  scannerEmptyBody: string;
  scannerTakePhotoCta: string;
  scannerGalleryCta: string;
  scannerRetakeCta: string;
  scannerChangeImage: string;
  scannerRemoveImage: string;
  scannerScanButton: string;
  scannerSelectedCameraLabel: string;
  scannerSelectedGalleryLabel: string;
  scannerCancelledTitle: string;
  scannerCancelledBody: string;
  scannerCameraCancelledTitle: string;
  scannerCameraCancelledBody: string;
  scannerCameraUnavailableTitle: string;
  scannerCameraUnavailableBody: string;
  scannerCameraDeniedTitle: string;
  scannerCameraDeniedBody: string;
  scannerCameraModalTitle: string;
  scannerCameraModalHint: string;
  scannerCameraSnapButton: string;
  scannerCameraFallbackPicker: string;
  scannerErrorTitle: string;
  scannerErrorBody: string;
  scannerUnsupportedFormatTitle: string;
  scannerUnsupportedFormatBody: string;
  scannerFileTooLargeTitle: string;
  scannerFileTooLargeBody: string;
  scannerReadyTitle: string;
  scannerReadyBody: string;
  scannerAnalyzingButton: string;
  scannerClose: string;

  aiResultTitle: string;
  aiResultBackToScanner: string;
  aiResultPoweredBy: string;
  aiLoadingTitle: string;
  aiLoadingBody: string;
  aiTryAgain: string;
  aiNewScan: string;
  aiErrorNetworkTitle: string;
  aiErrorNetworkBody: string;
  aiErrorQuotaTitle: string;
  aiErrorQuotaBody: string;
  aiErrorInvalidImageTitle: string;
  aiErrorInvalidImageBody: string;
  aiErrorUnavailableTitle: string;
  aiErrorUnavailableBody: string;
  aiErrorUnknownTitle: string;
  aiErrorUnknownBody: string;
  aiSectionExplanation: string;
  aiSectionCharacteristics: string;
  aiSectionUsefulFacts: string;
  aiSectionConfidenceNote: string;
  aiConfidenceHigh: string;
  aiConfidenceModerate: string;
  aiConfidenceLow: string;
  aiConfidenceUncertain: string;

  resultTitle: string;
  resultBack: string;
  resultDemoBannerTitle: string;
  resultDemoBannerBody: string;
  resultConfidenceHeading: string;
  resultConfidenceDemoNote: string;
  resultExplanationHeading: string;
  resultContextHeading: string;
  resultKeyFactsHeading: string;
  resultFollowUpHeading: string;
  resultFollowUpPlaceholder: string;
  resultFollowUpSend: string;
  resultFollowUpNotConnectedTitle: string;
  resultFollowUpNotConnectedBody: string;
  resultSwitchSample: string;

  historyTitle: string;
  historySubtitle: string;
  historyPrivacyNotice: string;
  historyTabScans: string;
  historyTabTranslations: string;
  historyEmptyScansTitle: string;
  historyEmptyScansBody: string;
  historyEmptyTranslationsTitle: string;
  historyEmptyTranslationsBody: string;
  historyEmptyActionScanner: string;
  historyEmptyActionTranslator: string;
  historyClearAll: string;
  historyConfirmClearScansTitle: string;
  historyConfirmClearScansBody: string;
  historyConfirmClearTranslationsTitle: string;
  historyConfirmClearTranslationsBody: string;
  historyConfirmDeleteBtn: string;
  historyCancelBtn: string;
  historyOpenResultHint: string;
  historyDeleteItem: string;
  historySourceCamera: string;
  historySourceGallery: string;
  historyOpenInTranslator: string;
  historyOriginalLabel: string;
  historyTranslationLabel: string;

  profileTitle: string;
  profileGuestName: string;
  profileGuestSubtitle: string;
  profileSignInAction: string;
  profileSignInNotConnected: string;
  profileLanguageHeading: string;
  profileLanguageSubtitle: string;
  profileLanguageEnglish: string;
  profileLanguageHindi: string;
  profileReadinessHeading: string;
  profileReadinessSubtitle: string;
  profileReadinessGeminiTitle: string;
  profileReadinessGeminiState: string;
  profileReadinessCameraTitle: string;
  profileReadinessCameraState: string;
  profileReadinessAuthTitle: string;
  profileReadinessAuthState: string;
  profileReadinessFirestoreTitle: string;
  profileReadinessFirestoreState: string;
  profileActionsHeading: string;
  profileReplaySplash: string;
  profileInspectAndroid: string;

  androidModalTitle: string;
  androidModalSubtitle: string;
  androidCopyCode: string;
  androidCopied: string;

  demoMarker: string;
  sampleConfidenceUnit: string;

  translatorTitle: string;
  translatorSubtitle: string;
  translatorTabText: string;
  translatorTabCamera: string;
  translatorTabVoice: string;
  translatorTabConversation: string;
  translatorTabHistory: string;
  translatorAutoDetect: string;
  translatorSwap: string;
  translatorTextPlaceholder: string;
  translatorTranslateBtn: string;
  translatorTranslatingBtn: string;
  translatorClearBtn: string;
  translatorCopyBtn: string;
  translatorCopiedNotice: string;
  translatorShareBtn: string;
  translatorListenBtn: string;
  translatorDetectedPrefix: string;
  translatorCameraTargetLabel: string;
  translatorCameraEmptyTitle: string;
  translatorCameraEmptyBody: string;
  translatorCameraExtractBtn: string;
  translatorCameraExtractingBtn: string;
  translatorCameraOriginalHeading: string;
  translatorCameraTranslatedHeading: string;
  translatorCameraUnreadableTitle: string;
  translatorCameraUnreadableBody: string;
  translatorVoiceTapSpeak: string;
  translatorVoiceStopSpeak: string;
  translatorVoiceListening: string;
  translatorVoiceTranscriptLabel: string;
  translatorVoiceTranscriptPlaceholder: string;
  translatorVoiceUnsupportedNotice: string;
  translatorVoiceReadAloud: string;
  translatorConvPersonA: string;
  translatorConvPersonB: string;
  translatorConvSpeak: string;
  translatorConvStop: string;
  translatorConvTypePlaceholder: string;
  translatorConvEmptyTitle: string;
  translatorConvEmptyBody: string;
  translatorConvClear: string;
  translatorHistoryLocalNotice: string;
  translatorHistoryEmptyTitle: string;
  translatorHistoryEmptyBody: string;
  translatorHistoryReuse: string;
  translatorHistoryDelete: string;
  translatorHistoryClearAll: string;
  translatorPickerTitle: string;
  translatorPickerSearch: string;
  translatorErrorUnsupportedTitle: string;
  translatorErrorUnsupportedBody: string;

  settingsSubtitle: string;
  settingsPermissionsTitle: string;
  settingsPermCameraLabel: string;
  settingsPermCameraBody: string;
  settingsPermGalleryLabel: string;
  settingsPermGalleryBody: string;
  settingsPermMicLabel: string;
  settingsPermMicBody: string;
  settingsLocalHistoryTitle: string;
  settingsClearAllHistoryBtn: string;
  settingsClearAllConfirmTitle: string;
  settingsHistoryClearedNotice: string;
  settingsHistoryErrorNotice: string;
  settingsAboutTitle: string;
  settingsAboutSubtitle: string;
  settingsPrivacyTitle: string;
  settingsPrivacySubtitle: string;
  settingsVersionLabel: string;
  settingsBackToSettings: string;

  aboutTitle: string;
  aboutSummary: string;
  aboutFeaturesHeading: string;
  aboutFeatureScannerTitle: string;
  aboutFeatureScannerBody: string;
  aboutFeatureTranslatorTitle: string;
  aboutFeatureTranslatorBody: string;
  aboutFeatureHistoryTitle: string;
  aboutFeatureHistoryBody: string;
  aboutResponsibleAiTitle: string;
  aboutResponsibleAiBody: string;
  aboutSupportTitle: string;
  aboutSupportStatus: string;
  aboutSupportBody: string;

  privacyTitle: string;
  privacyIntro: string;
  privacySection1Title: string;
  privacySection1Body: string;
  privacySection2Title: string;
  privacySection2Body: string;
  privacySection3Title: string;
  privacySection3Body: string;
  privacySection4Title: string;
  privacySection4Body: string;
  privacyStoredHeading: string;
  privacyStoredTitle: string;
  privacyStoredList: string;
  privacyNotStoredTitle: string;
  privacyNotStoredList: string;
  privacyHowToClearTitle: string;
  privacyHowToClearBody: string;

  offlineBannerTitle: string;
  offlineBannerBody: string;
  scannerStartingCamera: string;
  permissionCameraExplain: string;
  permissionMicTitle: string;
  permissionMicBody: string;
  permissionContinue: string;
  permissionNotNow: string;

  settingsCloudAccountTitle: string;
  settingsCloudGuestStatus: string;
  settingsCloudGuestBody: string;
  settingsCloudSignInBtn: string;
  settingsCloudSigningInBtn: string;
  settingsCloudSignedInBadge: string;
  settingsCloudSyncActiveBody: string;
  settingsCloudSignOutBtn: string;
  settingsCloudSyncErrorNotice: string;
  historyCloudSyncNotice: string;
}

export const STRINGS: Record<AppLanguage, AppStrings> = {
  en: {
    brandName: 'WORLDLENS',
    tagline: 'See the World. Understand Everything.',
    splashContinue: 'Enter WorldLens',
    splashStageNote: 'WORLDLENS · v1.0.0',

    navHome: 'Home',
    navScanner: 'Scanner',
    navTranslator: 'Translator',
    navHistory: 'History',
    navProfile: 'Settings',

    homeGreeting: 'Welcome to WorldLens',
    homeIntro: 'Point your lens at landmarks, plants, artifacts, or everyday objects.',
    homeSmartScannerTitle: 'AI Smart Scanner',
    homeSmartScannerSubtitle: 'Capture a photo or pick one from your gallery for careful Gemini visual identification.',
    homeSmartScannerCta: 'Launch Scanner',
    homeTakePhotoTitle: 'Take Photo',
    homeTakePhotoSubtitle: 'Capture with device camera',
    homeGalleryTitle: 'Upload from Gallery',
    homeGallerySubtitle: 'Select an image from device',
    homeRecentHeading: 'Recent Scans',
    homeRecentDemoCaption: 'Saved locally on this device',
    homeViewAllHistory: 'History',
    homeToggleEmpty: 'Show empty state',
    homeRestoreDemo: 'Load demo samples',
    homeRecentEmptyTitle: 'No recent scans on this device',
    homeRecentEmptyBody: 'Run a scan with Smart Scanner and your saved discoveries will appear in History on this device.',

    scannerTitle: 'Smart Scanner',
    scannerSubtitle: 'Capture a photo with your camera or choose an image from your gallery for visual analysis.',
    scannerPlaceholderLabel: 'Camera & Photo Picker · No broad storage permissions required',
    scannerPlaceholderNotice: 'Camera and gallery access is requested only when you tap Take Photo or Gallery. Images are resized locally before being sent over HTTPS for AI analysis.',
    scannerEmptyTitle: 'No image selected yet',
    scannerEmptyBody: 'Tap Take Photo to launch your camera or Gallery to choose an image from your device.',
    scannerTakePhotoCta: 'Take Photo',
    scannerGalleryCta: 'Gallery',
    scannerRetakeCta: 'Retake',
    scannerChangeImage: 'Change Image',
    scannerRemoveImage: 'Remove Image',
    scannerScanButton: 'Scan',
    scannerSelectedCameraLabel: 'Camera photo',
    scannerSelectedGalleryLabel: 'Gallery image',
    scannerCancelledTitle: 'Gallery selection cancelled',
    scannerCancelledBody: 'No new image was chosen. You can tap Gallery or Take Photo anytime.',
    scannerCameraCancelledTitle: 'Camera capture cancelled',
    scannerCameraCancelledBody: 'No photo was captured. Tap Take Photo or Retake whenever you are ready.',
    scannerCameraUnavailableTitle: 'Camera unavailable',
    scannerCameraUnavailableBody: 'Could not access a live camera in this session. You can use the device photo capture fallback or select an image from Gallery.',
    scannerCameraDeniedTitle: 'Camera permission denied',
    scannerCameraDeniedBody: 'Camera access was denied in your browser or device settings. Allow camera access to take photos, or choose an image from Gallery instead.',
    scannerCameraModalTitle: 'Camera Capture',
    scannerCameraModalHint: 'Frame your subject clearly and tap Capture Photo.',
    scannerCameraSnapButton: 'Capture Photo',
    scannerCameraFallbackPicker: 'Use system camera / file picker',
    scannerErrorTitle: 'Unable to load selected image',
    scannerErrorBody: 'The selected file appears empty or unreadable. Please take a photo or choose a valid JPEG, PNG, WebP, or HEIC image.',
    scannerUnsupportedFormatTitle: 'Unsupported file format',
    scannerUnsupportedFormatBody: 'Please select a standard JPEG, PNG, WebP, HEIC/HEIF, or BMP photo. Vector, video, and document files are not supported.',
    scannerFileTooLargeTitle: 'Image file is too large',
    scannerFileTooLargeBody: 'Please choose an image smaller than 25 MB, or capture a new photo with your camera.',
    scannerReadyTitle: 'Image ready for Gemini AI (Not connected yet)',
    scannerReadyBody: 'Your image is stored in shared selected-image state and ready for future secure Gemini API integration. Gemini and Firebase are not connected yet, so no AI result has been generated.',
    scannerAnalyzingButton: 'Analyzing...',
    scannerClose: 'Close',

    aiResultTitle: 'Visual Analysis',
    aiResultBackToScanner: 'Back to Scanner',
    aiResultPoweredBy: 'Gemini visual analysis',
    aiLoadingTitle: 'Analyzing image with WorldLens AI...',
    aiLoadingBody: 'Decoding image safely and sending it to Gemini for careful visual identification.',
    aiTryAgain: 'Try Again',
    aiNewScan: 'New Scan',
    aiErrorNetworkTitle: 'Network connection failed',
    aiErrorNetworkBody: 'Could not reach the AI service over the network. Check your internet connection and tap Try Again.',
    aiErrorQuotaTitle: 'AI quota limit reached',
    aiErrorQuotaBody: 'The Gemini API request quota was temporarily exceeded. Please wait a moment and try again.',
    aiErrorInvalidImageTitle: 'Invalid or unreadable image',
    aiErrorInvalidImageBody: 'WorldLens could not decode this image safely. Try retaking the photo or choosing another JPEG, PNG, or WebP image.',
    aiErrorUnavailableTitle: 'AI service unavailable',
    aiErrorUnavailableBody: 'The Gemini visual intelligence service is currently unavailable or not configured on this environment.',
    aiErrorUnknownTitle: 'Analysis could not be completed',
    aiErrorUnknownBody: 'An unexpected error occurred while analyzing your image. Tap Try Again to retry.',
    aiSectionExplanation: 'Explanation',
    aiSectionCharacteristics: 'Key Characteristics',
    aiSectionUsefulFacts: 'Useful Facts',
    aiSectionConfidenceNote: 'Confidence & Uncertainty Explanation',
    aiConfidenceHigh: 'High confidence',
    aiConfidenceModerate: 'Moderate confidence',
    aiConfidenceLow: 'Low confidence',
    aiConfidenceUncertain: 'Uncertain identification',

    resultTitle: 'Scan Result',
    resultBack: 'Back',
    resultDemoBannerTitle: 'Demo sample preview',
    resultDemoBannerBody: 'This result displays static sample data to demonstrate the layout. Gemini AI visual analysis is not active yet.',
    resultConfidenceHeading: 'Sample confidence indicator',
    resultConfidenceDemoNote: 'Illustrative demo value only · Not produced by a live AI model',
    resultExplanationHeading: 'Detailed explanation',
    resultContextHeading: 'Cultural & practical context',
    resultKeyFactsHeading: 'Reference specifications',
    resultFollowUpHeading: 'Ask a follow-up question',
    resultFollowUpPlaceholder: 'Ask about architecture, origin, or care details...',
    resultFollowUpSend: 'Ask',
    resultFollowUpNotConnectedTitle: 'AI follow-up is not yet connected',
    resultFollowUpNotConnectedBody: 'Your question was recorded locally in the prototype UI. Real answers will stream here once Gemini AI is integrated in Stage 2.',
    resultSwitchSample: 'Try another demo sample',

    historyTitle: 'History',
    historySubtitle: 'Your local Scan History and Translation History',
    historyPrivacyNotice: 'Saved locally on this device · Private photos are never uploaded to cloud storage',
    historyTabScans: 'Scans',
    historyTabTranslations: 'Translations',
    historyEmptyScansTitle: 'No saved scans yet',
    historyEmptyScansBody: 'Successful visual scans are saved automatically on this device with date and time so you can revisit them anytime.',
    historyEmptyTranslationsTitle: 'No saved translations yet',
    historyEmptyTranslationsBody: 'Your Text, Camera, Voice, and Conversation translations are saved locally on this device with date and time.',
    historyEmptyActionScanner: 'Open Scanner',
    historyEmptyActionTranslator: 'Open Translator',
    historyClearAll: 'Clear All',
    historyConfirmClearScansTitle: 'Clear all scan history?',
    historyConfirmClearScansBody: 'This will permanently delete all saved scan results from this device. This action cannot be undone.',
    historyConfirmClearTranslationsTitle: 'Clear all translation history?',
    historyConfirmClearTranslationsBody: 'This will permanently delete all saved translations from this device. This action cannot be undone.',
    historyConfirmDeleteBtn: 'Clear All',
    historyCancelBtn: 'Cancel',
    historyOpenResultHint: 'Tap to open full scan report',
    historyDeleteItem: 'Delete',
    historySourceCamera: 'Camera',
    historySourceGallery: 'Gallery',
    historyOpenInTranslator: 'Open in Translator',
    historyOriginalLabel: 'Original',
    historyTranslationLabel: 'Translation',

    profileTitle: 'Settings',
    profileGuestName: 'Guest Explorer',
    profileGuestSubtitle: 'Local prototype session · Account login not yet connected',
    profileSignInAction: 'Sign in (Stage 2)',
    profileSignInNotConnected: 'Firebase Authentication is planned for Stage 2. No login session or cloud account is active in this UI prototype.',
    profileLanguageHeading: 'Language',
    profileLanguageSubtitle: 'Choose your preferred interface language across all screens.',
    profileLanguageEnglish: 'English',
    profileLanguageHindi: 'हिन्दी (Hindi)',
    profileReadinessHeading: 'Integration readiness',
    profileReadinessSubtitle: 'Clean repository contracts prepared without hardcoded API keys.',
    profileReadinessGeminiTitle: 'Gemini Visual Intelligence',
    profileReadinessGeminiState: 'Interface prepared · Not connected',
    profileReadinessCameraTitle: 'CameraX & Gallery Picker',
    profileReadinessCameraState: 'Placeholder UI · Not connected',
    profileReadinessAuthTitle: 'Firebase Authentication',
    profileReadinessAuthState: 'Contract prepared · Not connected',
    profileReadinessFirestoreTitle: 'Cloud Firestore History',
    profileReadinessFirestoreState: 'Contract prepared · Not connected',
    profileActionsHeading: 'Prototype tools',
    profileReplaySplash: 'Replay Splash Screen',
    profileInspectAndroid: 'Inspect Android Kotlin & Compose Source',

    androidModalTitle: 'Android Kotlin & Jetpack Compose Project',
    androidModalSubtitle: 'Generated clean-architecture source files located in /android',
    androidCopyCode: 'Copy file',
    androidCopied: 'Copied',

    demoMarker: 'Demo sample',
    sampleConfidenceUnit: 'sample match',

    translatorTitle: 'Global AI Translator',
    translatorSubtitle: 'Text, camera, voice, and two-person conversation translation across 105+ languages.',
    translatorTabText: 'Text',
    translatorTabCamera: 'Camera',
    translatorTabVoice: 'Voice',
    translatorTabConversation: 'Conversation',
    translatorTabHistory: 'History',
    translatorAutoDetect: 'Auto-detect',
    translatorSwap: 'Swap languages',
    translatorTextPlaceholder: 'Enter or paste text to translate (preserves tone, context, and line breaks)...',
    translatorTranslateBtn: 'Translate',
    translatorTranslatingBtn: 'Translating...',
    translatorClearBtn: 'Clear',
    translatorCopyBtn: 'Copy',
    translatorCopiedNotice: 'Copied to clipboard.',
    translatorShareBtn: 'Share',
    translatorListenBtn: 'Listen',
    translatorDetectedPrefix: 'Detected',
    translatorCameraTargetLabel: 'Translate visible text to',
    translatorCameraEmptyTitle: 'No image selected for text translation',
    translatorCameraEmptyBody: 'Take a photo of a sign, menu, or page—or choose one from your gallery to extract and translate legible text.',
    translatorCameraExtractBtn: 'Extract & Translate',
    translatorCameraExtractingBtn: 'Extracting & translating...',
    translatorCameraOriginalHeading: 'Original extracted text',
    translatorCameraTranslatedHeading: 'Translated text',
    translatorCameraUnreadableTitle: 'No clearly readable text found',
    translatorCameraUnreadableBody: 'WorldLens never fabricates unreadable or blurred text. Try capturing a clearer, well-lit image.',
    translatorVoiceTapSpeak: 'Tap to Speak',
    translatorVoiceStopSpeak: 'Stop Listening',
    translatorVoiceListening: 'Listening for speech...',
    translatorVoiceTranscriptLabel: 'Recognized speech',
    translatorVoiceTranscriptPlaceholder: 'Spoken words will appear here, or you can type directly if speech recognition is unavailable.',
    translatorVoiceUnsupportedNotice: 'Live speech recognition is unavailable in this browser or language. You can still type text below to translate and listen with Text-to-Speech.',
    translatorVoiceReadAloud: 'Read Aloud',
    translatorConvPersonA: 'Person A',
    translatorConvPersonB: 'Person B',
    translatorConvSpeak: 'Speak',
    translatorConvStop: 'Stop',
    translatorConvTypePlaceholder: 'Type message...',
    translatorConvEmptyTitle: 'Two-person conversation ready',
    translatorConvEmptyBody: 'Pick two languages above and use either speaker microphone or quick text input. Original and translated turns appear below.',
    translatorConvClear: 'Clear conversation',
    translatorHistoryLocalNotice: 'Saved locally on this device · Cloud sync is not active',
    translatorHistoryEmptyTitle: 'No local translation history yet',
    translatorHistoryEmptyBody: 'Your recent Text, Camera, Voice, and Conversation translations are stored locally on this device for quick copying or reuse.',
    translatorHistoryReuse: 'Reuse',
    translatorHistoryDelete: 'Delete',
    translatorHistoryClearAll: 'Clear all',
    translatorPickerTitle: 'Select Language',
    translatorPickerSearch: 'Search 105+ languages by name or code...',
    translatorErrorUnsupportedTitle: 'Unsupported language pair',
    translatorErrorUnsupportedBody: 'The selected language cannot be reliably translated right now.',

    settingsSubtitle: 'Language, permissions, privacy center, local storage, and app info.',
    settingsPermissionsTitle: 'Permissions & Device Access',
    settingsPermCameraLabel: 'Camera',
    settingsPermCameraBody: 'Requested on demand only when you tap Take Photo — no persistent background camera access.',
    settingsPermGalleryLabel: 'Gallery / Photos',
    settingsPermGalleryBody: 'Uses Android Photo Picker / file picker so only the single image you choose is accessed.',
    settingsPermMicLabel: 'Microphone',
    settingsPermMicBody: 'Requested only when you actively tap Speak in Voice or Conversation Translator.',
    settingsLocalHistoryTitle: 'Local History',
    settingsClearAllHistoryBtn: 'Clear All History',
    settingsClearAllConfirmTitle: 'Clear all local history?',
    settingsHistoryClearedNotice: 'All local scan and translation history has been cleared from this device.',
    settingsHistoryErrorNotice: 'Could not update local storage. Please try again.',
    settingsAboutTitle: 'About WorldLens',
    settingsAboutSubtitle: 'App details, version info, responsible AI, and support status',
    settingsPrivacyTitle: 'Privacy Center',
    settingsPrivacySubtitle: 'Image processing, Gemini AI, what is stored, and history controls',
    settingsVersionLabel: 'Version',
    settingsBackToSettings: 'Back to Settings',

    aboutTitle: 'About WorldLens',
    aboutSummary:
      'WorldLens helps you identify visible objects, plants, animals, products, and places, and translate text, camera signs, voice, and conversations across 105+ languages.',
    aboutFeaturesHeading: 'Core Capabilities',
    aboutFeatureScannerTitle: 'Smart Visual Scanner',
    aboutFeatureScannerBody:
      'Capture a photo with your camera or pick one from your gallery to receive careful Gemini-powered visual identification with clear uncertainty notes.',
    aboutFeatureTranslatorTitle: 'Global AI Translator',
    aboutFeatureTranslatorBody:
      'Translate text, camera images, spoken phrases, and two-person conversations while preserving context and tone.',
    aboutFeatureHistoryTitle: 'On-Device Local History',
    aboutFeatureHistoryBody:
      'Successful scan reports and translations are stored locally on your device so you can review or delete them anytime.',
    aboutResponsibleAiTitle: 'Responsible & Honest AI',
    aboutResponsibleAiBody:
      'WorldLens never invents unreadable text or pretends to be certain when an image is unclear. AI results are informational only and must not be used for medical, electrical, or mechanical safety decisions.',
    aboutSupportTitle: 'Contact & Support',
    aboutSupportStatus: 'Support contact: Not configured yet',
    aboutSupportBody:
      'No support email address or help URL is configured for this pre-release build yet. Configure an official support contact before public release.',

    privacyTitle: 'Privacy Center',
    privacyIntro:
      'Only actual implemented behavior is described below. WorldLens does not make privacy promises it cannot enforce on third-party AI servers.',
    privacySection1Title: '1. Camera & Gallery Images',
    privacySection1Body:
      'Camera photos are held temporarily in app-private cache (or in-memory browser session on web) while you preview or scan them, and cleared when removed or replaced. Gallery images are opened via Android Photo Picker / file picker so broad photo-library permissions are never requested.',
    privacySection2Title: '2. Sending Images & Text to Gemini AI',
    privacySection2Body:
      'Yes — when you explicitly tap Scan, Translate, or Extract & Translate, your chosen image (resized locally) or text is transmitted over HTTPS (cleartext HTTP is disabled on Android) to Google Gemini AI (via Firebase AI Logic on Android or the server proxy on web). Nothing is sent until you trigger an action. Requests are governed by Google and Firebase terms and privacy policies. Avoid submitting sensitive IDs, financial cards, passwords, or private medical documents.',
    privacySection3Title: '3. Local History & Optional Firebase Cloud Sync',
    privacySection3Body:
      'In Guest Mode, completed scan reports (with an optional compact local thumbnail) and translations are saved strictly on your device (browser local storage on web; Room SQLite with allowBackup=false on Android) and are never uploaded.\nIf you optionally sign in with Google in Settings, WorldLens uses Firebase Authentication and Cloud Firestore to sync your language preference, text-only scan reports, and translations privately to your own account. Private camera/gallery photos and image thumbnails are never uploaded to Cloud Firestore.',
    privacySection4Title: '4. Permissions Used Only When Needed',
    privacySection4Body:
      'Camera and gallery access run on demand via system pickers without broad storage permissions. Microphone access is requested only if you tap Speak in Voice or Conversation Translator. Network state is checked only to alert you when offline.',
    privacyStoredHeading: '5. What Is Stored vs. What Is Not',
    privacyStoredTitle: 'Stored by WorldLens',
    privacyStoredList:
      '• Selected app language (English or Hindi — local, and synced to Firestore only when signed in)\n• Saved scan reports (object name, category, explanation, characteristics, facts, confidence note, language, timestamp)\n• Optional compact local scan thumbnail (device-only, never uploaded to Firestore)\n• Saved translations (original text, translated text, languages, mode, timestamp)\n• Basic Google account profile (UID and display name) only if you choose to sign in',
    privacyNotStoredTitle: 'Not collected or stored by WorldLens',
    privacyNotStoredList:
      '• No account or email required to use WorldLens in Guest Mode\n• No private photos or thumbnails uploaded to Cloud Firestore\n• No contacts, SMS, call logs, or GPS location\n• No background camera or background microphone recording\n• No ads, ad SDKs, or third-party advertising trackers',
    privacyHowToClearTitle: '6. How to Clear Your History',
    privacyHowToClearBody:
      'Delete individual entries anytime in the History tab, or clear all saved scans and translations permanently using the button below or in Settings. When signed in, clearing history removes both your synced Cloud Firestore entries and local device entries.',

    offlineBannerTitle: 'No internet connection',
    offlineBannerBody: 'AI scanning and translation require internet access. Your saved local history remains available offline.',
    scannerStartingCamera: 'Starting camera...',
    permissionCameraExplain:
      'Camera access is used only while you capture a photo. Gallery selection uses your device picker without broad photo-library permissions.',
    permissionMicTitle: 'Microphone Access for Voice Input',
    permissionMicBody:
      'WorldLens uses your microphone only when you tap Speak to convert your voice into text for translation. Audio is never recorded in the background.',
    permissionContinue: 'Continue',
    permissionNotNow: 'Not Now',

    settingsCloudAccountTitle: 'Account & Cloud Sync',
    settingsCloudGuestStatus: 'Guest Mode (Local only)',
    settingsCloudGuestBody:
      'Sign in with Google to privately sync your language preference, text-only scan reports, and translations across sessions using Firebase. Photos are never uploaded to Firestore.',
    settingsCloudSignInBtn: 'Sign in with Google',
    settingsCloudSigningInBtn: 'Signing in...',
    settingsCloudSignedInBadge: 'Cloud Sync active',
    settingsCloudSyncActiveBody:
      'Your text-only scan reports, translations, and language preference are privately synced to your Firebase account. Camera and gallery photos remain private on your device.',
    settingsCloudSignOutBtn: 'Sign Out',
    settingsCloudSyncErrorNotice: 'Could not sync with Firebase right now. Please check your connection and try again.',
    historyCloudSyncNotice: 'Synced privately to your Firebase account · Photos are never uploaded to Firestore',
  },
  hi: {
    brandName: 'WORLDLENS',
    tagline: 'दुनिया देखें। सब कुछ समझें।',
    splashContinue: 'WorldLens शुरू करें',
    splashStageNote: 'WORLDLENS · v1.0.0',

    navHome: 'होम',
    navScanner: 'स्कैनर',
    navTranslator: 'अनुवादक',
    navHistory: 'इतिहास',
    navProfile: 'सेटिंग्स',

    homeGreeting: 'WorldLens में आपका स्वागत है',
    homeIntro: 'स्मारकों, पौधों, कलाकृतियों या रोज़मर्रा की वस्तुओं को समझने के लिए लेंस तैयार करें।',
    homeSmartScannerTitle: 'AI स्मार्ट स्कैनर',
    homeSmartScannerSubtitle: 'कैमरे से फ़ोटो लें या गैलरी से चुनें और Gemini से सटीक दृश्य पहचान प्राप्त करें।',
    homeSmartScannerCta: 'स्कैनर खोलें',
    homeTakePhotoTitle: 'फ़ोटो लें',
    homeTakePhotoSubtitle: 'डिवाइस कैमरे से कैप्चर करें',
    homeGalleryTitle: 'गैलरी से अपलोड करें',
    homeGallerySubtitle: 'डिवाइस से छवि चुनें',
    homeRecentHeading: 'हाल के स्कैन',
    homeRecentDemoCaption: 'इस डिवाइस पर स्थानीय रूप से सहेजे गए',
    homeViewAllHistory: 'इतिहास',
    homeToggleEmpty: 'खाली स्थिति देखें',
    homeRestoreDemo: 'डेमो सैंपल लोड करें',
    homeRecentEmptyTitle: 'इस डिवाइस पर कोई हालिया स्कैन नहीं है',
    homeRecentEmptyBody: 'स्मार्ट स्कैनर से स्कैन करें और आपके सहेजे गए परिणाम इस डिवाइस के इतिहास में दिखाई देंगे।',

    scannerTitle: 'स्मार्ट स्कैनर',
    scannerSubtitle: 'दृश्य विश्लेषण के लिए अपने कैमरे से फ़ोटो लें या गैलरी से वास्तविक छवि चुनें।',
    scannerPlaceholderLabel: 'कैमरा और फ़ोटो पिकर · व्यापक स्टोरेज अनुमति की आवश्यकता नहीं',
    scannerPlaceholderNotice: 'कैमरा और गैलरी एक्सेस केवल तभी माँगा जाता है जब आप फ़ोटो लें या गैलरी चुनते हैं। AI विश्लेषण के लिए छवियों को HTTPS पर भेजने से पहले डिवाइस पर रीसाइज़ किया जाता है।',
    scannerEmptyTitle: 'अभी तक कोई छवि नहीं चुनी गई',
    scannerEmptyBody: 'कैमरा खोलने के लिए फ़ोटो लें पर टैप करें या डिवाइस से छवि चुनने के लिए गैलरी पर टैप करें।',
    scannerTakePhotoCta: 'फ़ोटो लें',
    scannerGalleryCta: 'गैलरी',
    scannerRetakeCta: 'दोबारा लें',
    scannerChangeImage: 'छवि बदलें',
    scannerRemoveImage: 'छवि हटाएँ',
    scannerScanButton: 'स्कैन करें',
    scannerSelectedCameraLabel: 'कैमरा प्रीव्यू फ़ोटो',
    scannerSelectedGalleryLabel: 'गैलरी छवि',
    scannerCancelledTitle: 'गैलरी चयन रद्द किया गया',
    scannerCancelledBody: 'कोई नई छवि नहीं चुनी गई। आप कभी भी गैलरी या फ़ोटो लें चुन सकते हैं।',
    scannerCameraCancelledTitle: 'कैमरा कैप्चर रद्द किया गया',
    scannerCameraCancelledBody: 'कोई फ़ोटो नहीं ली गई। तैयार होने पर फ़ोटो लें या दोबारा लें पर टैप करें।',
    scannerCameraUnavailableTitle: 'कैमरा उपलब्ध नहीं है',
    scannerCameraUnavailableBody: 'इस सत्र में लाइव कैमरा उपलब्ध नहीं हो सका। आप सिस्टम कैमरा पिकर या गैलरी का उपयोग कर सकते हैं।',
    scannerCameraDeniedTitle: 'कैमरा अनुमति अस्वीकृत',
    scannerCameraDeniedBody: 'आपके ब्राउज़र या डिवाइस सेटिंग्स में कैमरा अनुमति अस्वीकृत कर दी गई है। फ़ोटो लेने के लिए अनुमति दें, या गैलरी से छवि चुनें।',
    scannerCameraModalTitle: 'कैमरा कैप्चर',
    scannerCameraModalHint: 'विषय को स्पष्ट रूप से फ्रेम करें और फ़ोटो कैप्चर करें पर टैप करें।',
    scannerCameraSnapButton: 'फ़ोटो कैप्चर करें',
    scannerCameraFallbackPicker: 'सिस्टम कैमरा / फ़ाइल पिकर उपयोग करें',
    scannerErrorTitle: 'चयनित छवि लोड नहीं हो सकी',
    scannerErrorBody: 'चयनित फ़ाइल खाली या अपठनीय है। कृपया नई फ़ोटो लें या मान्य JPEG, PNG, WebP या HEIC छवि चुनें।',
    scannerUnsupportedFormatTitle: 'असमर्थित फ़ाइल फ़ॉर्मेट',
    scannerUnsupportedFormatBody: 'कृपया मानक JPEG, PNG, WebP, HEIC/HEIF या BMP छवि चुनें। वेक्टर, वीडियो और दस्तावेज़ फ़ाइलें समर्थित नहीं हैं।',
    scannerFileTooLargeTitle: 'छवि फ़ाइल बहुत बड़ी है',
    scannerFileTooLargeBody: 'कृपया 25 MB से छोटी छवि चुनें, या अपने कैमरे से नई फ़ोटो लें।',
    scannerReadyTitle: 'छवि Gemini AI के लिए तैयार है (अभी जुड़ा नहीं)',
    scannerReadyBody: 'आपकी छवि साझा स्टेट में सुरक्षित है और भविष्य के Gemini API एकीकरण के लिए तैयार है। Gemini और Firebase अभी जुड़े नहीं हैं, इसलिए कोई AI परिणाम नहीं बनाया गया है।',
    scannerAnalyzingButton: 'विश्लेषण हो रहा है...',
    scannerClose: 'बंद करें',

    aiResultTitle: 'दृश्य विश्लेषण',
    aiResultBackToScanner: 'स्कैनर पर वापस जाएँ',
    aiResultPoweredBy: 'Gemini दृश्य विश्लेषण',
    aiLoadingTitle: 'WorldLens AI आपकी छवि का विश्लेषण कर रहा है...',
    aiLoadingBody: 'सटीक पहचान के लिए छवि को सुरक्षित रूप से डिकोड करके Gemini को भेजा जा रहा है।',
    aiTryAgain: 'पुनः प्रयास करें',
    aiNewScan: 'नया स्कैन',
    aiErrorNetworkTitle: 'नेटवर्क कनेक्शन विफल',
    aiErrorNetworkBody: 'नेटवर्क के माध्यम से AI सेवा तक नहीं पहुँचा जा सका। कृपया अपना इंटरनेट कनेक्शन जाँचें और पुनः प्रयास करें।',
    aiErrorQuotaTitle: 'AI सीमा समाप्त हो गई',
    aiErrorQuotaBody: 'Gemini API अनुरोध सीमा अस्थायी रूप से पूरी हो गई है। कृपया थोड़ी देर बाद पुनः प्रयास करें।',
    aiErrorInvalidImageTitle: 'अमान्य या अपठनीय छवि',
    aiErrorInvalidImageBody: 'WorldLens इस छवि को सुरक्षित रूप से पढ़ नहीं सका। कृपया नई फ़ोटो लें या दूसरी JPEG, PNG या WebP छवि चुनें।',
    aiErrorUnavailableTitle: 'AI सेवा उपलब्ध नहीं है',
    aiErrorUnavailableBody: 'Gemini दृश्य विश्लेषण सेवा वर्तमान में अनुपलब्ध है या इस परिवेश में कॉन्फ़िगर नहीं की गई है।',
    aiErrorUnknownTitle: 'विश्लेषण पूरा नहीं हो सका',
    aiErrorUnknownBody: 'आपकी छवि का विश्लेषण करते समय एक अप्रत्याशित त्रुटि हुई। कृपया पुनः प्रयास करें।',
    aiSectionExplanation: 'विवरण',
    aiSectionCharacteristics: 'मुख्य विशेषताएँ',
    aiSectionUsefulFacts: 'उपयोगी तथ्य',
    aiSectionConfidenceNote: 'विश्वास और अनिश्चितता विवरण',
    aiConfidenceHigh: 'उच्च विश्वास',
    aiConfidenceModerate: 'मध्यम विश्वास',
    aiConfidenceLow: 'कम विश्वास',
    aiConfidenceUncertain: 'अनिश्चित पहचान',

    resultTitle: 'स्कैन परिणाम',
    resultBack: 'वापस',
    resultDemoBannerTitle: 'डेमो सैंपल प्रीव्यू',
    resultDemoBannerBody: 'यह परिणाम लेआउट दिखाने के लिए स्थिर सैंपल डेटा प्रदर्शित करता है। Gemini AI विश्लेषण अभी सक्रिय नहीं है।',
    resultConfidenceHeading: 'सैंपल विश्वास संकेतक',
    resultConfidenceDemoNote: 'केवल उदाहरण डेमो मान · लाइव AI मॉडल द्वारा निर्मित नहीं',
    resultExplanationHeading: 'विस्तृत विवरण',
    resultContextHeading: 'सांस्कृतिक और व्यावहारिक संदर्भ',
    resultKeyFactsHeading: 'संदर्भ विवरण',
    resultFollowUpHeading: 'अनुवर्ती प्रश्न पूछें',
    resultFollowUpPlaceholder: 'वास्तुकला, इतिहास या देखभाल के बारे में पूछें...',
    resultFollowUpSend: 'पूछें',
    resultFollowUpNotConnectedTitle: 'AI अनुवर्ती उत्तर अभी जुड़ा नहीं है',
    resultFollowUpNotConnectedBody: 'आपका प्रश्न प्रोटोटाइप UI में स्थानीय रूप से दर्ज किया गया है। चरण 2 में Gemini AI जुड़ने के बाद वास्तविक उत्तर यहाँ दिखेंगे।',
    resultSwitchSample: 'दूसरा डेमो सैंपल देखें',

    historyTitle: 'इतिहास',
    historySubtitle: 'आपका स्थानीय स्कैन इतिहास और अनुवाद इतिहास',
    historyPrivacyNotice: 'केवल इस डिवाइस पर स्थानीय रूप से सहेजा गया · निजी फ़ोटो क्लाउड पर अपलोड नहीं होते',
    historyTabScans: 'स्कैन',
    historyTabTranslations: 'अनुवाद',
    historyEmptyScansTitle: 'अभी तक कोई सहेजा गया स्कैन नहीं है',
    historyEmptyScansBody: 'सफल दृश्य स्कैन दिनांक और समय के साथ इस डिवाइस पर स्वतः सहेजे जाते हैं ताकि आप उन्हें कभी भी देख सकें।',
    historyEmptyTranslationsTitle: 'अभी तक कोई सहेजा गया अनुवाद नहीं है',
    historyEmptyTranslationsBody: 'आपके टेक्स्ट, कैमरा, वॉइस और संवाद अनुवाद दिनांक और समय के साथ इस डिवाइस पर स्थानीय रूप से सहेजे जाते हैं।',
    historyEmptyActionScanner: 'स्कैनर खोलें',
    historyEmptyActionTranslator: 'अनुवादक खोलें',
    historyClearAll: 'सभी हटाएँ',
    historyConfirmClearScansTitle: 'सभी स्कैन इतिहास हटाएँ?',
    historyConfirmClearScansBody: 'यह इस डिवाइस से सभी सहेजे गए स्कैन परिणामों को स्थायी रूप से हटा देगा। इसे पूर्ववत नहीं किया जा सकता।',
    historyConfirmClearTranslationsTitle: 'सभी अनुवाद इतिहास हटाएँ?',
    historyConfirmClearTranslationsBody: 'यह इस डिवाइस से सभी सहेजे गए अनुवादों को स्थायी रूप से हटा देगा। इसे पूर्ववत नहीं किया जा सकता।',
    historyConfirmDeleteBtn: 'सभी हटाएँ',
    historyCancelBtn: 'रद्द करें',
    historyOpenResultHint: 'पूर्ण स्कैन रिपोर्ट देखने के लिए टैप करें',
    historyDeleteItem: 'हटाएँ',
    historySourceCamera: 'कैमरा',
    historySourceGallery: 'गैलरी',
    historyOpenInTranslator: 'अनुवादक में खोलें',
    historyOriginalLabel: 'मूल',
    historyTranslationLabel: 'अनुवाद',

    profileTitle: 'सेटिंग्स',
    profileGuestName: 'अतिथि एक्सप्लोरर',
    profileGuestSubtitle: 'स्थानीय प्रोटोटाइप सत्र · खाता लॉगिन अभी सक्रिय नहीं',
    profileSignInAction: 'साइन इन (चरण 2)',
    profileSignInNotConnected: 'Firebase Authentication चरण 2 के लिए नियोजित है। इस UI प्रोटोटाइप में कोई लॉगिन सत्र सक्रिय नहीं है।',
    profileLanguageHeading: 'भाषा',
    profileLanguageSubtitle: 'सभी स्क्रीन के लिए अपनी पसंदीदा इंटरफ़ेस भाषा चुनें।',
    profileLanguageEnglish: 'English',
    profileLanguageHindi: 'हिन्दी (Hindi)',
    profileReadinessHeading: 'एकीकरण तैयारी',
    profileReadinessSubtitle: 'बिना किसी हार्डकोडेड API कुंजी के स्वच्छ रिपॉजिटरी संरचना तैयार है।',
    profileReadinessGeminiTitle: 'Gemini दृश्य बुद्धिमत्ता',
    profileReadinessGeminiState: 'इंटरफ़ेस तैयार · जुड़ा नहीं',
    profileReadinessCameraTitle: 'CameraX और गैलरी पिकर',
    profileReadinessCameraState: 'प्लेसहोल्डर UI · जुड़ा नहीं',
    profileReadinessAuthTitle: 'Firebase प्रमाणीकरण',
    profileReadinessAuthState: 'अनुबंध तैयार · जुड़ा नहीं',
    profileReadinessFirestoreTitle: 'Cloud Firestore इतिहास',
    profileReadinessFirestoreState: 'अनुबंध तैयार · जुड़ा नहीं',
    profileActionsHeading: 'प्रोटोटाइप उपकरण',
    profileReplaySplash: 'स्प्लैश स्क्रीन फिर से देखें',
    profileInspectAndroid: 'Android Kotlin और Compose कोड देखें',

    androidModalTitle: 'Android Kotlin और Jetpack Compose प्रोजेक्ट',
    androidModalSubtitle: '/android फ़ोल्डर में तैयार स्वच्छ आर्किटेक्चर स्रोत फ़ाइलें',
    androidCopyCode: 'फ़ाइल कॉपी करें',
    androidCopied: 'कॉपी किया गया',

    demoMarker: 'डेमो सैंपल',
    sampleConfidenceUnit: 'सैंपल मिलान',

    translatorTitle: 'ग्लोबल AI अनुवादक',
    translatorSubtitle: '105+ भाषाओं में टेक्स्ट, कैमरा, वॉइस और दो-व्यक्ति संवाद अनुवाद।',
    translatorTabText: 'टेक्स्ट',
    translatorTabCamera: 'कैमरा',
    translatorTabVoice: 'वॉइस',
    translatorTabConversation: 'संवाद',
    translatorTabHistory: 'इतिहास',
    translatorAutoDetect: 'स्वतः पहचान',
    translatorSwap: 'भाषाएँ बदलें',
    translatorTextPlaceholder: 'अनुवाद करने के लिए टेक्स्ट लिखें या पेस्ट करें (अर्थ, संदर्भ और फ़ॉर्मैट सुरक्षित रहता है)...',
    translatorTranslateBtn: 'अनुवाद करें',
    translatorTranslatingBtn: 'अनुवाद हो रहा है...',
    translatorClearBtn: 'साफ़ करें',
    translatorCopyBtn: 'कॉपी',
    translatorCopiedNotice: 'क्लिपबोर्ड पर कॉपी किया गया।',
    translatorShareBtn: 'साझा करें',
    translatorListenBtn: 'सुनें',
    translatorDetectedPrefix: 'पहचानी गई भाषा',
    translatorCameraTargetLabel: 'दिखाई देने वाला टेक्स्ट अनुवाद करें',
    translatorCameraEmptyTitle: 'टेक्स्ट अनुवाद के लिए कोई छवि नहीं चुनी गई',
    translatorCameraEmptyBody: 'साइनबोर्ड, मेन्यू या पेज की फ़ोटो लें या गैलरी से छवि चुनें ताकि स्पष्ट टेक्स्ट निकालकर अनुवाद किया जा सके।',
    translatorCameraExtractBtn: 'टेक्स्ट निकालें व अनुवाद करें',
    translatorCameraExtractingBtn: 'टेक्स्ट निकाला जा रहा है...',
    translatorCameraOriginalHeading: 'मूल निकाला गया टेक्स्ट',
    translatorCameraTranslatedHeading: 'अनुवादित टेक्स्ट',
    translatorCameraUnreadableTitle: 'स्पष्ट पठनीय टेक्स्ट नहीं मिला',
    translatorCameraUnreadableBody: 'WorldLens अपठनीय या धुंधला टेक्स्ट कभी नहीं बनाता। कृपया बेहतर रोशनी और फ़ोकस के साथ नई फ़ोटो लें।',
    translatorVoiceTapSpeak: 'बोलने के लिए टैप करें',
    translatorVoiceStopSpeak: 'सुनना रोकें',
    translatorVoiceListening: 'आवाज़ सुनी जा रही है...',
    translatorVoiceTranscriptLabel: 'पहचाना गया भाषण',
    translatorVoiceTranscriptPlaceholder: 'बोले गए शब्द यहाँ दिखेंगे, या यदि स्पीच रिकग्निशन उपलब्ध न हो तो आप सीधे टाइप भी कर सकते हैं।',
    translatorVoiceUnsupportedNotice: 'इस ब्राउज़र या भाषा में लाइव स्पीच रिकग्निशन उपलब्ध नहीं है। आप नीचे टेक्स्ट लिखकर अनुवाद कर सकते हैं और Text-to-Speech से सुन सकते हैं।',
    translatorVoiceReadAloud: 'बोलकर सुनें',
    translatorConvPersonA: 'व्यक्ति A',
    translatorConvPersonB: 'व्यक्ति B',
    translatorConvSpeak: 'बोलें',
    translatorConvStop: 'रोकें',
    translatorConvTypePlaceholder: 'संदेश लिखें...',
    translatorConvEmptyTitle: 'दो-व्यक्ति संवाद तैयार है',
    translatorConvEmptyBody: 'ऊपर दो अलग-अलग भाषाएँ चुनें और किसी भी व्यक्ति का माइक या टेक्स्ट इनपुट उपयोग करें। मूल और अनुवादित संदेश नीचे दिखेंगे।',
    translatorConvClear: 'संवाद साफ़ करें',
    translatorHistoryLocalNotice: 'केवल इस डिवाइस पर स्थानीय रूप से सहेजा गया · क्लाउड सिंक सक्रिय नहीं है',
    translatorHistoryEmptyTitle: 'अभी तक कोई स्थानीय अनुवाद इतिहास नहीं है',
    translatorHistoryEmptyBody: 'आपके हाल के टेक्स्ट, कैमरा, वॉइस और संवाद अनुवाद त्वरित उपयोग के लिए इस डिवाइस पर स्थानीय रूप से सहेजे जाते हैं।',
    translatorHistoryReuse: 'पुनः उपयोग',
    translatorHistoryDelete: 'हटाएँ',
    translatorHistoryClearAll: 'सभी हटाएँ',
    translatorPickerTitle: 'भाषा चुनें',
    translatorPickerSearch: 'नाम या कोड से 105+ भाषाएँ खोजें...',
    translatorErrorUnsupportedTitle: 'असमर्थित भाषा युग्म',
    translatorErrorUnsupportedBody: 'चयनित भाषा का विश्वसनीय अनुवाद अभी उपलब्ध नहीं है।',

    settingsSubtitle: 'भाषा, अनुमतियाँ, गोपनीयता केंद्र, स्थानीय संग्रहण और ऐप जानकारी।',
    settingsPermissionsTitle: 'अनुमतियाँ और डिवाइस एक्सेस',
    settingsPermCameraLabel: 'कैमरा',
    settingsPermCameraBody: 'केवल तब उपयोग होता है जब आप फ़ोटो लें पर टैप करते हैं — कोई बैकग्राउंड कैमरा एक्सेस नहीं।',
    settingsPermGalleryLabel: 'गैलरी / फ़ोटो',
    settingsPermGalleryBody: 'Android फ़ोटो पिकर का उपयोग करता है ताकि केवल आपकी चुनी हुई एक छवि पढ़ी जाए।',
    settingsPermMicLabel: 'माइक्रोफ़ोन',
    settingsPermMicBody: 'केवल तब माँगा जाता है जब आप वॉइस या संवाद अनुवाद में बोलने हेतु टैप करते हैं।',
    settingsLocalHistoryTitle: 'स्थानीय इतिहास',
    settingsClearAllHistoryBtn: 'सभी इतिहास हटाएँ',
    settingsClearAllConfirmTitle: 'सभी स्थानीय इतिहास हटाएँ?',
    settingsHistoryClearedNotice: 'इस डिवाइस से सभी स्थानीय स्कैन और अनुवाद इतिहास हटा दिया गया है।',
    settingsHistoryErrorNotice: 'स्थानीय स्टोरेज अपडेट नहीं हो सका। कृपया पुनः प्रयास करें।',
    settingsAboutTitle: 'WorldLens के बारे में',
    settingsAboutSubtitle: 'ऐप विवरण, संस्करण जानकारी, ज़िम्मेदार AI और सहायता स्थिति',
    settingsPrivacyTitle: 'गोपनीयता केंद्र',
    settingsPrivacySubtitle: 'छवि प्रसंस्करण, Gemini AI, संग्रहीत डेटा और इतिहास नियंत्रण',
    settingsVersionLabel: 'संस्करण',
    settingsBackToSettings: 'सेटिंग्स पर वापस जाएँ',

    aboutTitle: 'WorldLens के बारे में',
    aboutSummary:
      'WorldLens आपको दिखाई देने वाली वस्तुओं, पौधों, जानवरों, उत्पादों और स्थानों की पहचान करने तथा 105+ भाषाओं में टेक्स्ट, कैमरा साइनबोर्ड, वॉइस और संवाद का अनुवाद करने में मदद करता है।',
    aboutFeaturesHeading: 'मुख्य क्षमताएँ',
    aboutFeatureScannerTitle: 'स्मार्ट विज़ुअल स्कैनर',
    aboutFeatureScannerBody:
      'कैमरे से फ़ोटो लें या गैलरी से चुनें और स्पष्ट अनिश्चितता विवरण के साथ Gemini दृश्य पहचान प्राप्त करें।',
    aboutFeatureTranslatorTitle: 'ग्लोबल AI अनुवादक',
    aboutFeatureTranslatorBody:
      'संदर्भ और भाव को सुरक्षित रखते हुए टेक्स्ट, कैमरा छवियों, वॉइस और दो-व्यक्ति संवाद का अनुवाद करें।',
    aboutFeatureHistoryTitle: 'डिवाइस पर स्थानीय इतिहास',
    aboutFeatureHistoryBody:
      'सफल स्कैन रिपोर्ट और अनुवाद आपके डिवाइस पर स्थानीय रूप से सहेजे जाते हैं जिन्हें आप कभी भी देख या हटा सकते हैं।',
    aboutResponsibleAiTitle: 'ज़िम्मेदार और ईमानदार AI',
    aboutResponsibleAiBody:
      'WorldLens कभी भी अपठनीय टेक्स्ट नहीं बनाता और अनिश्चित होने पर स्पष्ट बताता है। AI परिणाम केवल सामान्य जानकारी के लिए हैं; इनका उपयोग चिकित्सा, विद्युत या यांत्रिक सुरक्षा निर्णयों के लिए न करें।',
    aboutSupportTitle: 'संपर्क और सहायता',
    aboutSupportStatus: 'सहायता संपर्क: अभी कॉन्फ़िगर नहीं किया गया',
    aboutSupportBody:
      'इस प्री-रिलीज़ बिल्ड के लिए अभी कोई सहायता ईमेल या वेब लिंक कॉन्फ़िगर नहीं किया गया है। सार्वजनिक रिलीज़ से पहले अपना आधिकारिक सहायता संपर्क जोड़ें।',

    privacyTitle: 'गोपनीयता केंद्र',
    privacyIntro:
      'नीचे केवल वास्तव में लागू किया गया व्यवहार बताया गया है। WorldLens ऐसे कोई गोपनीयता वादे नहीं करता जिन्हें वह थर्ड-पार्टी AI सर्वर पर लागू नहीं कर सकता।',
    privacySection1Title: '1. कैमरा और गैलरी छवियाँ',
    privacySection1Body:
      'कैमरा फ़ोटो प्रीव्यू या स्कैन के दौरान अस्थायी ऐप-निजी कैश में रखी जाती हैं और बदलने या हटाने पर मिटा दी जाती हैं। गैलरी छवियाँ Android फ़ोटो पिकर से खोली जाती हैं ताकि व्यापक स्टोरेज अनुमति कभी न माँगी जाए।',
    privacySection2Title: '2. Gemini AI को छवियाँ और टेक्स्ट भेजना',
    privacySection2Body:
      'हाँ — जब आप स्पष्ट रूप से स्कैन, अनुवाद या टेक्स्ट निकालें व अनुवाद करें पर टैप करते हैं, तो आपकी चयनित छवि (डिवाइस पर रीसाइज़ की हुई) या टेक्स्ट को केवल HTTPS (Android पर असुरक्षित HTTP अक्षम है) के माध्यम से Google Gemini AI सेवा (Android पर Firebase AI Logic या वेब पर सर्वर प्रॉक्सी) को भेजा जाता है। आपके टैप करने से पहले कुछ भी नहीं भेजा जाता। ये अनुरोध Google और Firebase की सेवा शर्तों व गोपनीयता नीतियों के अधीन हैं। संवेदनशील पहचान पत्र, भुगतान कार्ड या पासवर्ड स्कैन करने से बचें।',
    privacySection3Title: '3. स्थानीय इतिहास और वैकल्पिक Firebase क्लाउड सिंक',
    privacySection3Body:
      'अतिथि मोड में, पूर्ण स्कैन रिपोर्ट (वैकल्पिक छोटे स्थानीय थंबनेल के साथ) और अनुवाद केवल इस डिवाइस पर स्थानीय रूप से सहेजे जाते हैं (वेब पर लोकल स्टोरेज; Android पर allowBackup=false के साथ Room SQLite) और कभी अपलोड नहीं होते।\nयदि आप सेटिंग्स में वैकल्पिक रूप से Google से साइन इन करते हैं, तो WorldLens आपकी भाषा पसंद, केवल टेक्स्ट स्कैन रिपोर्ट और अनुवादों को Firebase Authentication व Cloud Firestore के माध्यम से आपके निजी खाते में सिंक करता है। निजी कैमरा/गैलरी फ़ोटो और थंबनेल कभी Cloud Firestore पर अपलोड नहीं होते।',
    privacySection4Title: '4. केवल आवश्यक होने पर अनुमतियाँ',
    privacySection4Body:
      'कैमरा और गैलरी सिस्टम पिकर के माध्यम से माँग पर चलते हैं। माइक्रोफ़ोन अनुमति केवल वॉइस या संवाद इनपुट शुरू करने पर माँगी जाती है। नेटवर्क स्थिति केवल ऑफ़लाइन होने पर सूचना देने के लिए जाँची जाती है।',
    privacyStoredHeading: '5. क्या सहेजा जाता है और क्या नहीं',
    privacyStoredTitle: 'WorldLens द्वारा सहेजा गया डेटा',
    privacyStoredList:
      '• चुनी गई ऐप भाषा (अंग्रेज़ी या हिन्दी — स्थानीय, और साइन इन होने पर Firestore में सिंक)\n• सहेजी गई स्कैन रिपोर्ट (वस्तु का नाम, श्रेणी, विवरण, विशेषताएँ, तथ्य, विश्वास नोट, भाषा, दिनांक-समय)\n• वैकल्पिक छोटा स्थानीय स्कैन थंबनेल (केवल डिवाइस पर, Firestore पर अपलोड नहीं)\n• सहेजे गए अनुवाद (मूल टेक्स्ट, अनुवादित टेक्स्ट, भाषाएँ, मोड, दिनांक-समय)\n• मूल Google खाता प्रोफ़ाइल (UID और नाम) केवल तब जब आप साइन इन चुनें',
    privacyNotStoredTitle: 'WorldLens द्वारा एकत्र या संग्रहीत नहीं किया जाता',
    privacyNotStoredList:
      '• अतिथि मोड के लिए कोई खाता या ईमेल आवश्यक नहीं\n• Cloud Firestore पर कोई निजी फ़ोटो या थंबनेल अपलोड नहीं\n• कोई संपर्क सूची, SMS, कॉल लॉग या GPS लोकेशन नहीं\n• कोई बैकग्राउंड कैमरा या माइक्रोफ़ोन रिकॉर्डिंग नहीं\n• कोई विज्ञापन, विज्ञापन SDK या थर्ड-पार्टी ट्रैकर नहीं',
    privacyHowToClearTitle: '6. अपना इतिहास कैसे हटाएँ',
    privacyHowToClearBody:
      'इतिहास टैब में किसी भी रिकॉर्ड को कभी भी हटाएँ, या नीचे दिए गए बटन अथवा सेटिंग्स से सभी सहेजे गए स्कैन और अनुवाद स्थायी रूप से हटाएँ। साइन इन होने पर, यह आपके Cloud Firestore और स्थानीय डिवाइस दोनों से रिकॉर्ड हटाता है।',

    offlineBannerTitle: 'इंटरनेट कनेक्शन नहीं है',
    offlineBannerBody: 'AI स्कैनिंग और अनुवाद के लिए इंटरनेट आवश्यक है। आपका सहेजा गया स्थानीय इतिहास ऑफ़लाइन उपलब्ध रहता है।',
    scannerStartingCamera: 'कैमरा शुरू हो रहा है...',
    permissionCameraExplain:
      'कैमरा एक्सेस केवल फ़ोटो लेते समय उपयोग किया जाता है। गैलरी चयन बिना व्यापक स्टोरेज अनुमति के डिवाइस पिकर का उपयोग करता है।',
    permissionMicTitle: 'वॉइस इनपुट के लिए माइक्रोफ़ोन एक्सेस',
    permissionMicBody:
      'WorldLens आपके माइक्रोफ़ोन का उपयोग केवल तभी करता है जब आप अनुवाद के लिए बोलने हेतु टैप करते हैं। बैकग्राउंड में ऑडियो कभी रिकॉर्ड नहीं होता।',
    permissionContinue: 'जारी रखें',
    permissionNotNow: 'अभी नहीं',

    settingsCloudAccountTitle: 'खाता और क्लाउड सिंक',
    settingsCloudGuestStatus: 'अतिथि मोड (केवल स्थानीय)',
    settingsCloudGuestBody:
      'Firebase के साथ अपनी भाषा पसंद, केवल टेक्स्ट स्कैन रिपोर्ट और अनुवादों को निजी रूप से सिंक करने के लिए Google से साइन इन करें। फ़ोटो कभी Firestore पर अपलोड नहीं होते।',
    settingsCloudSignInBtn: 'Google से साइन इन करें',
    settingsCloudSigningInBtn: 'साइन इन हो रहा है...',
    settingsCloudSignedInBadge: 'क्लाउड सिंक सक्रिय',
    settingsCloudSyncActiveBody:
      'आपकी केवल टेक्स्ट स्कैन रिपोर्ट, अनुवाद और भाषा पसंद आपके Firebase खाते में निजी रूप से सिंक हैं। कैमरा और गैलरी फ़ोटो आपके डिवाइस पर ही निजी रहते हैं।',
    settingsCloudSignOutBtn: 'साइन आउट करें',
    settingsCloudSyncErrorNotice: 'अभी Firebase के साथ सिंक नहीं हो सका। कृपया इंटरनेट जाँचें और पुनः प्रयास करें।',
    historyCloudSyncNotice: 'आपके Firebase खाते में निजी रूप से सिंक · फ़ोटो कभी Firestore पर अपलोड नहीं होते',
  },
};
