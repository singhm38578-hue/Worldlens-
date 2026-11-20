import { useState } from 'react';
import { Check, Copy, X, FileCode2 } from 'lucide-react';
import type { AppStrings } from '../data/localization';

import rootBuildGradleRaw from '../../android/build.gradle.kts?raw';
import settingsGradleRaw from '../../android/settings.gradle.kts?raw';
import appBuildGradleRaw from '../../android/app/build.gradle.kts?raw';
import gradleWrapperPropsRaw from '../../android/gradle/wrapper/gradle-wrapper.properties?raw';
import proguardRulesRaw from '../../android/app/proguard-rules.pro?raw';
import keystoreExampleRaw from '../../android/keystore.properties.example?raw';
import manifestRaw from '../../android/app/src/main/AndroidManifest.xml?raw';
import networkSecurityConfigRaw from '../../android/app/src/main/res/xml/network_security_config.xml?raw';
import filePathsRaw from '../../android/app/src/main/res/xml/file_paths.xml?raw';
import applicationRaw from '../../android/app/src/main/java/com/worldlens/app/WorldLensApplication.kt?raw';
import mainActivityRaw from '../../android/app/src/main/java/com/worldlens/app/MainActivity.kt?raw';
import cameraPhotoFileManagerRaw from '../../android/app/src/main/java/com/worldlens/app/data/image/CameraPhotoFileManager.kt?raw';
import imageInputValidatorRaw from '../../android/app/src/main/java/com/worldlens/app/data/image/ImageInputValidator.kt?raw';
import safeBitmapDecoderRaw from '../../android/app/src/main/java/com/worldlens/app/data/image/SafeBitmapDecoder.kt?raw';
import imageInputValidatorTestRaw from '../../android/app/src/test/java/com/worldlens/app/data/image/ImageInputValidatorTest.kt?raw';
import themeColorRaw from '../../android/app/src/main/java/com/worldlens/app/ui/theme/Color.kt?raw';
import themeRaw from '../../android/app/src/main/java/com/worldlens/app/ui/theme/Theme.kt?raw';
import modelsRaw from '../../android/app/src/main/java/com/worldlens/app/domain/model/Models.kt?raw';
import repositoriesRaw from '../../android/app/src/main/java/com/worldlens/app/data/repository/WorldLensRepositories.kt?raw';
import componentsRaw from '../../android/app/src/main/java/com/worldlens/app/ui/components/WorldLensComponents.kt?raw';
import navGraphRaw from '../../android/app/src/main/java/com/worldlens/app/ui/navigation/WorldLensNavGraph.kt?raw';
import splashScreenRaw from '../../android/app/src/main/java/com/worldlens/app/ui/screens/SplashScreen.kt?raw';
import homeScreenRaw from '../../android/app/src/main/java/com/worldlens/app/ui/screens/HomeScreen.kt?raw';
import scannerScreenRaw from '../../android/app/src/main/java/com/worldlens/app/ui/screens/ScannerScreen.kt?raw';
import aiScanResultScreenRaw from '../../android/app/src/main/java/com/worldlens/app/ui/screens/AiScanResultScreen.kt?raw';
import historyScreenRaw from '../../android/app/src/main/java/com/worldlens/app/ui/screens/HistoryScreen.kt?raw';
import profileScreenRaw from '../../android/app/src/main/java/com/worldlens/app/ui/screens/ProfileScreen.kt?raw';
import translatorModelsRaw from '../../android/app/src/main/java/com/worldlens/app/domain/model/TranslatorModels.kt?raw';
import translationTextPolicyRaw from '../../android/app/src/main/java/com/worldlens/app/data/repository/TranslationTextPolicy.kt?raw';
import translationTextPolicyTestRaw from '../../android/app/src/test/java/com/worldlens/app/data/repository/TranslationTextPolicyTest.kt?raw';
import geminiTranslatorRepoRaw from '../../android/app/src/main/java/com/worldlens/app/data/repository/GeminiTranslatorRepository.kt?raw';
import worldLensDatabaseRaw from '../../android/app/src/main/java/com/worldlens/app/data/local/WorldLensDatabase.kt?raw';
import scanThumbnailStorageRaw from '../../android/app/src/main/java/com/worldlens/app/data/local/ScanThumbnailStorage.kt?raw';
import localHistoryRepoRaw from '../../android/app/src/main/java/com/worldlens/app/data/local/LocalHistoryRepository.kt?raw';
import appPreferencesRaw from '../../android/app/src/main/java/com/worldlens/app/data/local/AppPreferences.kt?raw';
import appSettingsHelperRaw from '../../android/app/src/main/java/com/worldlens/app/data/local/AppSettingsHelper.kt?raw';
import localHistoryTestRaw from '../../android/app/src/test/java/com/worldlens/app/data/local/LocalHistorySerializationTest.kt?raw';
import voiceSpeechManagerRaw from '../../android/app/src/main/java/com/worldlens/app/ui/translator/VoiceSpeechManager.kt?raw';
import translatorViewModelRaw from '../../android/app/src/main/java/com/worldlens/app/ui/translator/TranslatorViewModel.kt?raw';
import translatorScreenRaw from '../../android/app/src/main/java/com/worldlens/app/ui/screens/TranslatorScreen.kt?raw';
import aboutWorldLensScreenRaw from '../../android/app/src/main/java/com/worldlens/app/ui/screens/AboutWorldLensScreen.kt?raw';
import privacyPolicyScreenRaw from '../../android/app/src/main/java/com/worldlens/app/ui/screens/PrivacyPolicyScreen.kt?raw';

interface AndroidFileEntry {
  path: string;
  label: string;
  content: string;
}

const ANDROID_FILES: AndroidFileEntry[] = [
  { path: 'android/app/build.gradle.kts', label: 'app/build.gradle.kts', content: appBuildGradleRaw },
  { path: 'android/app/proguard-rules.pro', label: 'app/proguard-rules.pro', content: proguardRulesRaw },
  { path: 'android/keystore.properties.example', label: 'keystore.properties.example', content: keystoreExampleRaw },
  { path: 'android/build.gradle.kts', label: 'build.gradle.kts', content: rootBuildGradleRaw },
  { path: 'android/settings.gradle.kts', label: 'settings.gradle.kts', content: settingsGradleRaw },
  { path: 'android/gradle/wrapper/gradle-wrapper.properties', label: 'gradle-wrapper.properties', content: gradleWrapperPropsRaw },
  { path: 'android/app/src/main/AndroidManifest.xml', label: 'AndroidManifest.xml', content: manifestRaw },
  { path: 'android/app/src/main/res/xml/network_security_config.xml', label: 'res/xml/network_security_config.xml', content: networkSecurityConfigRaw },
  { path: 'android/app/src/main/res/xml/file_paths.xml', label: 'res/xml/file_paths.xml', content: filePathsRaw },
  { path: 'android/app/src/main/java/com/worldlens/app/WorldLensApplication.kt', label: 'WorldLensApplication.kt', content: applicationRaw },
  { path: 'android/app/src/main/java/com/worldlens/app/MainActivity.kt', label: 'MainActivity.kt', content: mainActivityRaw },
  { path: 'android/app/src/main/java/com/worldlens/app/data/image/CameraPhotoFileManager.kt', label: 'data/image/CameraPhotoFileManager.kt', content: cameraPhotoFileManagerRaw },
  { path: 'android/app/src/main/java/com/worldlens/app/data/image/ImageInputValidator.kt', label: 'data/image/ImageInputValidator.kt', content: imageInputValidatorRaw },
  { path: 'android/app/src/main/java/com/worldlens/app/data/image/SafeBitmapDecoder.kt', label: 'data/image/SafeBitmapDecoder.kt', content: safeBitmapDecoderRaw },
  { path: 'android/app/src/test/java/com/worldlens/app/data/image/ImageInputValidatorTest.kt', label: 'test/.../ImageInputValidatorTest.kt', content: imageInputValidatorTestRaw },
  { path: 'android/app/src/main/java/com/worldlens/app/data/repository/WorldLensRepositories.kt', label: 'data/repository/WorldLensRepositories.kt', content: repositoriesRaw },
  { path: 'android/app/src/main/java/com/worldlens/app/ui/navigation/WorldLensNavGraph.kt', label: 'WorldLensNavGraph.kt', content: navGraphRaw },
  { path: 'android/app/src/main/java/com/worldlens/app/domain/model/Models.kt', label: 'domain/model/Models.kt', content: modelsRaw },
  { path: 'android/app/src/main/java/com/worldlens/app/ui/screens/ScannerScreen.kt', label: 'ui/screens/ScannerScreen.kt', content: scannerScreenRaw },
  { path: 'android/app/src/main/java/com/worldlens/app/ui/screens/AiScanResultScreen.kt', label: 'ui/screens/AiScanResultScreen.kt', content: aiScanResultScreenRaw },
  { path: 'android/app/src/main/java/com/worldlens/app/ui/theme/Color.kt', label: 'ui/theme/Color.kt', content: themeColorRaw },
  { path: 'android/app/src/main/java/com/worldlens/app/ui/theme/Theme.kt', label: 'ui/theme/Theme.kt', content: themeRaw },
  { path: 'android/app/src/main/java/com/worldlens/app/ui/components/WorldLensComponents.kt', label: 'ui/components/WorldLensComponents.kt', content: componentsRaw },
  { path: 'android/app/src/main/java/com/worldlens/app/ui/screens/SplashScreen.kt', label: 'ui/screens/SplashScreen.kt', content: splashScreenRaw },
  { path: 'android/app/src/main/java/com/worldlens/app/ui/screens/HomeScreen.kt', label: 'ui/screens/HomeScreen.kt', content: homeScreenRaw },
  { path: 'android/app/src/main/java/com/worldlens/app/ui/screens/HistoryScreen.kt', label: 'ui/screens/HistoryScreen.kt', content: historyScreenRaw },
  { path: 'android/app/src/main/java/com/worldlens/app/ui/screens/TranslatorScreen.kt', label: 'ui/screens/TranslatorScreen.kt', content: translatorScreenRaw },
  { path: 'android/app/src/main/java/com/worldlens/app/ui/translator/TranslatorViewModel.kt', label: 'ui/translator/TranslatorViewModel.kt', content: translatorViewModelRaw },
  { path: 'android/app/src/main/java/com/worldlens/app/ui/translator/VoiceSpeechManager.kt', label: 'ui/translator/VoiceSpeechManager.kt', content: voiceSpeechManagerRaw },
  { path: 'android/app/src/main/java/com/worldlens/app/data/repository/TranslationTextPolicy.kt', label: 'data/repository/TranslationTextPolicy.kt', content: translationTextPolicyRaw },
  { path: 'android/app/src/test/java/com/worldlens/app/data/repository/TranslationTextPolicyTest.kt', label: 'test/.../TranslationTextPolicyTest.kt', content: translationTextPolicyTestRaw },
  { path: 'android/app/src/main/java/com/worldlens/app/data/repository/GeminiTranslatorRepository.kt', label: 'data/repository/GeminiTranslatorRepository.kt', content: geminiTranslatorRepoRaw },
  { path: 'android/app/src/main/java/com/worldlens/app/data/local/WorldLensDatabase.kt', label: 'data/local/WorldLensDatabase.kt', content: worldLensDatabaseRaw },
  { path: 'android/app/src/main/java/com/worldlens/app/data/local/ScanThumbnailStorage.kt', label: 'data/local/ScanThumbnailStorage.kt', content: scanThumbnailStorageRaw },
  { path: 'android/app/src/main/java/com/worldlens/app/data/local/LocalHistoryRepository.kt', label: 'data/local/LocalHistoryRepository.kt', content: localHistoryRepoRaw },
  { path: 'android/app/src/main/java/com/worldlens/app/data/local/AppPreferences.kt', label: 'data/local/AppPreferences.kt', content: appPreferencesRaw },
  { path: 'android/app/src/main/java/com/worldlens/app/data/local/AppSettingsHelper.kt', label: 'data/local/AppSettingsHelper.kt', content: appSettingsHelperRaw },
  { path: 'android/app/src/test/java/com/worldlens/app/data/local/LocalHistorySerializationTest.kt', label: 'test/.../LocalHistorySerializationTest.kt', content: localHistoryTestRaw },
  { path: 'android/app/src/main/java/com/worldlens/app/domain/model/TranslatorModels.kt', label: 'domain/model/TranslatorModels.kt', content: translatorModelsRaw },
  { path: 'android/app/src/main/java/com/worldlens/app/ui/screens/ProfileScreen.kt', label: 'ui/screens/ProfileScreen.kt', content: profileScreenRaw },
  { path: 'android/app/src/main/java/com/worldlens/app/ui/screens/AboutWorldLensScreen.kt', label: 'ui/screens/AboutWorldLensScreen.kt', content: aboutWorldLensScreenRaw },
  { path: 'android/app/src/main/java/com/worldlens/app/ui/screens/PrivacyPolicyScreen.kt', label: 'ui/screens/PrivacyPolicyScreen.kt', content: privacyPolicyScreenRaw },
];

interface AndroidSourceModalProps {
  strings: AppStrings;
  onClose: () => void;
}

export function AndroidSourceModal({ strings, onClose }: AndroidSourceModalProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const activeFile = ANDROID_FILES[selectedIndex];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeFile.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#071428]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="android-source-title"
    >
      <div className="w-full max-w-5xl h-[85vh] bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2
              id="android-source-title"
              className="text-base sm:text-lg font-bold text-[#071428] truncate"
            >
              {strings.androidModalTitle}
            </h2>
            <p className="text-xs text-slate-500 truncate mt-0.5">
              {strings.androidModalSubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={strings.scannerClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-[#071428] shrink-0"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* File Tree + Code Viewer */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row">
          <aside className="md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-slate-200 bg-[#F6F8FC] overflow-x-auto md:overflow-y-auto p-2 flex md:flex-col gap-1">
            {ANDROID_FILES.map((file, idx) => (
              <button
                key={file.path}
                type="button"
                onClick={() => {
                  setSelectedIndex(idx);
                  setCopied(false);
                }}
                className={`min-h-[40px] px-3 rounded-xl text-left text-xs font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 md:w-full ${
                  idx === selectedIndex
                    ? 'bg-[#071428] text-white'
                    : 'text-slate-700 hover:bg-slate-200/60'
                }`}
              >
                <FileCode2 className="w-3.5 h-3.5 shrink-0 opacity-75" aria-hidden="true" />
                <span className="truncate">{file.label}</span>
              </button>
            ))}
          </aside>

          <div className="flex-1 min-h-0 flex flex-col bg-[#071428] text-slate-100">
            <div className="px-4 py-2.5 border-b border-white/10 flex items-center justify-between gap-3 bg-[#0D2140]">
              <span className="text-xs font-mono text-slate-300 truncate">
                {activeFile.path}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="min-h-[34px] px-3 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-white inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#4B8EFF]" aria-hidden="true" />
                    <span>{strings.androidCopied}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{strings.androidCopyCode}</span>
                  </>
                )}
              </button>
            </div>

            <pre className="flex-1 overflow-auto p-4 sm:p-5 text-xs leading-relaxed font-mono text-slate-200">
              <code>{activeFile.content}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
