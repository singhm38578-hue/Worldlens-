package com.worldlens.app.ui.screens

import android.Manifest
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Clear
import androidx.compose.material.icons.outlined.ContentCopy
import androidx.compose.material.icons.outlined.DeleteOutline
import androidx.compose.material.icons.outlined.Forum
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.Mic
import androidx.compose.material.icons.outlined.PhotoCamera
import androidx.compose.material.icons.outlined.PhotoLibrary
import androidx.compose.material.icons.outlined.Replay
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.Send
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material.icons.outlined.Stop
import androidx.compose.material.icons.outlined.SwapHoriz
import androidx.compose.material.icons.outlined.TextFields
import androidx.compose.material.icons.outlined.Translate
import androidx.compose.material.icons.outlined.VolumeUp
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.worldlens.app.data.image.CameraPhotoFileManager
import com.worldlens.app.data.image.ImageInputValidator
import com.worldlens.app.data.image.ImageValidationResult
import com.worldlens.app.data.local.AppSettingsHelper
import com.worldlens.app.data.local.LocalHistoryDateFormatter
import com.worldlens.app.data.local.rememberIsOnline
import com.worldlens.app.data.repository.TranslationTextPolicy
import androidx.core.content.ContextCompat
import coil.compose.AsyncImage
import com.worldlens.app.BuildConfig
import com.worldlens.app.domain.model.AppLanguage
import com.worldlens.app.domain.model.SelectedScanImage
import com.worldlens.app.domain.model.TranslationErrorType
import com.worldlens.app.domain.model.TranslatorLanguage
import com.worldlens.app.domain.model.TranslatorLanguages
import com.worldlens.app.domain.model.TranslatorTab
import kotlinx.coroutines.launch
import com.worldlens.app.ui.theme.BorderHairline
import com.worldlens.app.ui.theme.DeepNavy
import com.worldlens.app.ui.theme.ElectricBlue
import com.worldlens.app.ui.theme.ElectricBlueTint
import com.worldlens.app.ui.theme.TextMuted
import com.worldlens.app.ui.theme.TextPrimary
import com.worldlens.app.ui.theme.TextSecondary
import com.worldlens.app.ui.theme.WorldLensSurface
import com.worldlens.app.ui.theme.WorldLensWhite
import com.worldlens.app.ui.translator.SpeechInputOutcome
import com.worldlens.app.ui.translator.TranslatorErrorState
import com.worldlens.app.ui.translator.TranslatorViewModel
import com.worldlens.app.ui.translator.TtsOutcome
import com.worldlens.app.ui.translator.VoiceSpeechManager

private enum class LanguagePickerTarget {
    TEXT_SOURCE,
    TEXT_TARGET,
    CAMERA_TARGET,
    VOICE_SOURCE,
    VOICE_TARGET,
    CONV_PERSON_A,
    CONV_PERSON_B
}

@Composable
fun TranslatorScreen(
    language: AppLanguage,
    viewModel: TranslatorViewModel,
    scannerSelectedImage: SelectedScanImage? = null
) {
    val context = LocalContext.current
    val clipboard = LocalClipboardManager.current
    val isHindi = language == AppLanguage.HINDI

    val voiceManager = remember(context) { VoiceSpeechManager(context.applicationContext) }
    DisposableEffect(voiceManager) {
        onDispose { voiceManager.release() }
    }

    LaunchedEffect(Unit) {
        viewModel.ensureHistoryLoaded(context)
    }

    val isOnline by rememberIsOnline()
    var pickerTarget by remember { mutableStateOf<LanguagePickerTarget?>(null) }
    var statusNotice by remember { mutableStateOf<String?>(null) }
    var isListeningVoice by remember { mutableStateOf(false) }
    var listeningSpeaker by remember { mutableStateOf<String?>(null) } // "A" or "B"
    var pendingMicAction by remember { mutableStateOf<(() -> Unit)?>(null) }
    var showMicPermissionRationale by remember { mutableStateOf(false) }
    var micPermissionDenied by remember { mutableStateOf(false) }

    val micPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            micPermissionDenied = false
            pendingMicAction?.invoke()
        } else {
            micPermissionDenied = true
            statusNotice = if (isHindi) {
                "माइक्रोफ़ोन अनुमति नहीं मिली। आप ऐप सेटिंग्स में अनुमति चालू कर सकते हैं, या नीचे टेक्स्ट टाइप करके अनुवाद जारी रख सकते हैं।"
            } else {
                "Microphone permission was not granted. You can enable it in App Settings, or continue translating by typing text below."
            }
        }
        pendingMicAction = null
    }

    fun requestMicAndRun(action: () -> Unit) {
        val granted = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED
        if (granted) {
            action()
        } else {
            pendingMicAction = action
            showMicPermissionRationale = true
        }
    }

    if (showMicPermissionRationale) {
        AlertDialog(
            onDismissRequest = {
                showMicPermissionRationale = false
                pendingMicAction = null
            },
            title = {
                Text(
                    text = if (isHindi) "माइक्रोफ़ोन अनुमति क्यों चाहिए?" else "Why Microphone Access Is Needed",
                    style = MaterialTheme.typography.titleMedium,
                    color = TextPrimary
                )
            },
            text = {
                Text(
                    text = if (isHindi) {
                        "WorldLens केवल तब माइक्रोफ़ोन का उपयोग करता है जब आप वॉइस या संवाद अनुवाद में बोलने के लिए टैप करते हैं। आपका ऑडियो केवल भाषण को टेक्स्ट में बदलने के लिए उपयोग होता है और बैकग्राउंड में रिकॉर्ड नहीं किया जाता।"
                    } else {
                        "WorldLens uses the microphone only when you tap to speak in Voice or Conversation Translator to convert your speech into text. Audio is never recorded in the background."
                    },
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextSecondary
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        showMicPermissionRationale = false
                        micPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                    }
                ) {
                    Text(
                        text = if (isHindi) "जारी रखें" else "Continue",
                        color = ElectricBlue,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        showMicPermissionRationale = false
                        pendingMicAction = null
                    }
                ) {
                    Text(if (isHindi) "अभी नहीं" else "Not Now")
                }
            }
        )
    }

    val translatorCoroutineScope = rememberCoroutineScope()
    var pendingTranslatorCameraUri by rememberSaveable { mutableStateOf<String?>(null) }

    fun handleTranslatorGalleryUri(uri: Uri?) {
        if (uri == null) {
            statusNotice = if (isHindi) "गैलरी चयन रद्द किया गया।" else "Gallery selection cancelled."
            return
        }
        translatorCoroutineScope.launch {
            when (val validation = ImageInputValidator.validateUri(context.applicationContext, uri)) {
                is ImageValidationResult.Valid -> {
                    viewModel.setCameraGalleryUri(context.applicationContext, uri, validation.mimeType)
                    statusNotice = null
                }

                is ImageValidationResult.UnsupportedFormat -> {
                    statusNotice = if (isHindi) {
                        "असमर्थित फ़ाइल फ़ॉर्मेट। कृपया JPEG, PNG, WebP या HEIC छवि चुनें।"
                    } else {
                        "Unsupported file format. Please select a JPEG, PNG, WebP, or HEIC image."
                    }
                }

                ImageValidationResult.FileTooLarge -> {
                    statusNotice = if (isHindi) {
                        "छवि फ़ाइल 25 MB से बड़ी है।"
                    } else {
                        "Image file exceeds the 25 MB size limit."
                    }
                }

                ImageValidationResult.Unreadable -> {
                    statusNotice = if (isHindi) {
                        "चयनित छवि पढ़ी नहीं जा सकी।"
                    } else {
                        "Selected image could not be decoded."
                    }
                }
            }
        }
    }

    val photoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri ->
        handleTranslatorGalleryUri(uri)
    }

    val fallbackGalleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri ->
        handleTranslatorGalleryUri(uri)
    }

    val cameraCaptureLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicture()
    ) { success ->
        val capturedUri = pendingTranslatorCameraUri?.let(Uri::parse)
        pendingTranslatorCameraUri = null
        if (!success || capturedUri == null) {
            CameraPhotoFileManager.deleteCaptureIfOwned(context.applicationContext, capturedUri)
            statusNotice = if (isHindi) "कैमरा कैप्चर रद्द किया गया।" else "Camera capture cancelled."
            return@rememberLauncherForActivityResult
        }
        translatorCoroutineScope.launch {
            val nonEmpty = CameraPhotoFileManager.hasNonEmptyFile(context.applicationContext, capturedUri)
            if (!nonEmpty) {
                CameraPhotoFileManager.deleteCaptureIfOwned(context.applicationContext, capturedUri)
                statusNotice = if (isHindi) "कैमरा फ़ोटो सहेजी नहीं जा सकी।" else "Captured photo could not be read."
                return@launch
            }
            when (ImageInputValidator.validateUri(context.applicationContext, capturedUri)) {
                is ImageValidationResult.Valid -> {
                    viewModel.setCameraUri(context.applicationContext, capturedUri)
                    statusNotice = null
                }

                else -> {
                    CameraPhotoFileManager.deleteCaptureIfOwned(context.applicationContext, capturedUri)
                    statusNotice = if (isHindi) "कैमरा फ़ोटो पढ़ी नहीं जा सकी।" else "Captured photo could not be decoded."
                }
            }
        }
    }

    fun speakOut(text: String, localeTag: String) {
        when (val outcome = voiceManager.speak(text, localeTag)) {
            TtsOutcome.Speaking -> statusNotice = null
            is TtsOutcome.Unavailable -> statusNotice = outcome.reason
        }
    }

    fun shareText(text: String) {
        val sendIntent = Intent(Intent.ACTION_SEND).apply {
            action = Intent.ACTION_SEND
            putExtra(Intent.EXTRA_TEXT, text)
            type = "text/plain"
        }
        val chooser = Intent.createChooser(
            sendIntent,
            if (isHindi) "अनुवाद साझा करें" else "Share translation"
        )
        runCatching { context.startActivity(chooser) }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(WorldLensSurface)
    ) {
        // Header
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(DeepNavy)
                .padding(horizontal = 20.dp, vertical = 18.dp)
        ) {
            Text(
                text = if (isHindi) "ग्लोबल AI अनुवादक" else "Global AI Translator",
                style = MaterialTheme.typography.headlineSmall,
                color = WorldLensWhite,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = if (isHindi) {
                    "टेक्स्ट, कैमरा, वॉइस और दो-व्यक्ति संवाद अनुवाद · 100+ भाषाएँ"
                } else {
                    "Text, camera, voice, and two-person conversation translation · 100+ languages"
                },
                style = MaterialTheme.typography.bodySmall,
                color = WorldLensWhite.copy(alpha = 0.78f)
            )
        }

        if (!isOnline) {
            Surface(
                color = Color(0xFFFEF3C7),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = if (isHindi) {
                        "इंटरनेट कनेक्शन नहीं है। AI अनुवाद के लिए इंटरनेट आवश्यक है, लेकिन आपका स्थानीय इतिहास ऑफ़लाइन उपलब्ध है।"
                    } else {
                        "No internet connection. Live AI translation requires internet, while your local History remains available offline."
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = Color(0xFF92400E),
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp)
                )
            }
        }

        // Mode Tabs (Segmented Interactive Buttons)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(WorldLensWhite)
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 12.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            TranslatorModeButton(
                label = if (isHindi) "टेक्स्ट" else "Text",
                icon = Icons.Outlined.TextFields,
                selected = viewModel.activeTab == TranslatorTab.TEXT,
                onClick = { viewModel.selectTab(TranslatorTab.TEXT) }
            )
            TranslatorModeButton(
                label = if (isHindi) "कैमरा" else "Camera",
                icon = Icons.Outlined.PhotoCamera,
                selected = viewModel.activeTab == TranslatorTab.CAMERA,
                onClick = { viewModel.selectTab(TranslatorTab.CAMERA) }
            )
            TranslatorModeButton(
                label = if (isHindi) "वॉइस" else "Voice",
                icon = Icons.Outlined.Mic,
                selected = viewModel.activeTab == TranslatorTab.VOICE,
                onClick = { viewModel.selectTab(TranslatorTab.VOICE) }
            )
            TranslatorModeButton(
                label = if (isHindi) "संवाद" else "Conversation",
                icon = Icons.Outlined.Forum,
                selected = viewModel.activeTab == TranslatorTab.CONVERSATION,
                onClick = { viewModel.selectTab(TranslatorTab.CONVERSATION) }
            )
            TranslatorModeButton(
                label = if (isHindi) "इतिहास" else "History",
                icon = Icons.Outlined.History,
                selected = viewModel.activeTab == TranslatorTab.HISTORY,
                onClick = { viewModel.selectTab(TranslatorTab.HISTORY) }
            )
        }
        HorizontalDivider(color = BorderHairline)

        if (statusNotice != null) {
            Surface(
                color = ElectricBlueTint,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = statusNotice.orEmpty(),
                            style = MaterialTheme.typography.bodySmall,
                            color = DeepNavy,
                            modifier = Modifier.weight(1f)
                        )
                        TextButton(
                            onClick = {
                                statusNotice = null
                                micPermissionDenied = false
                            }
                        ) {
                            Text(if (isHindi) "बंद करें" else "Dismiss")
                        }
                    }
                    if (micPermissionDenied) {
                        TextButton(
                            onClick = { AppSettingsHelper.openAppSettings(context) },
                            contentPadding = PaddingValues(horizontal = 4.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = if (isHindi) "Android ऐप सेटिंग्स खोलें" else "Open Android App Settings",
                                color = ElectricBlue,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }
                }
            }
        }

        // Tab Body
        Box(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
        ) {
            when (viewModel.activeTab) {
                TranslatorTab.TEXT -> TextTranslatorContent(
                    isHindi = isHindi,
                    viewModel = viewModel,
                    onPickSource = { pickerTarget = LanguagePickerTarget.TEXT_SOURCE },
                    onPickTarget = { pickerTarget = LanguagePickerTarget.TEXT_TARGET },
                    onCopy = {
                        clipboard.setText(AnnotatedString(it))
                        statusNotice = if (isHindi) "अनुवाद कॉपी किया गया।" else "Translation copied to clipboard."
                    },
                    onShare = { shareText(it) },
                    onSpeak = { text -> speakOut(text, viewModel.targetLanguage.speechLocaleTag) },
                    onTranslate = { viewModel.translateText(context) }
                )

                TranslatorTab.CAMERA -> CameraTranslatorContent(
                    isHindi = isHindi,
                    viewModel = viewModel,
                    hasScannerPhoto = scannerSelectedImage != null && viewModel.cameraImage != scannerSelectedImage,
                    onUseScannerPhoto = {
                        scannerSelectedImage?.let { img ->
                            viewModel.importScannerImage(context.applicationContext, img)
                            statusNotice = null
                        }
                    },
                    onPickTarget = { pickerTarget = LanguagePickerTarget.CAMERA_TARGET },
                    onTakePhoto = {
                        val tempUri = runCatching {
                            CameraPhotoFileManager.createTempCaptureUri(context.applicationContext)
                        }.getOrNull()
                        if (tempUri == null) {
                            statusNotice = if (isHindi) "कैमरा उपलब्ध नहीं है।" else "Camera is unavailable on this device."
                        } else {
                            pendingTranslatorCameraUri = tempUri.toString()
                            try {
                                cameraCaptureLauncher.launch(tempUri)
                            } catch (_: SecurityException) {
                                pendingTranslatorCameraUri = null
                                CameraPhotoFileManager.deleteCaptureIfOwned(context.applicationContext, tempUri)
                                statusNotice = if (isHindi) {
                                    "कैमरा अनुमति अस्वीकृत है। कृपया सेटिंग्स में अनुमति दें या गैलरी का उपयोग करें।"
                                } else {
                                    "Camera permission was denied. Enable camera access in Settings or choose from Gallery."
                                }
                            } catch (_: Exception) {
                                pendingTranslatorCameraUri = null
                                CameraPhotoFileManager.deleteCaptureIfOwned(context.applicationContext, tempUri)
                                statusNotice = if (isHindi) "कैमरा उपलब्ध नहीं है।" else "Camera is unavailable on this device."
                            }
                        }
                    },
                    onOpenGallery = {
                        try {
                            photoPickerLauncher.launch(
                                PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                            )
                        } catch (_: ActivityNotFoundException) {
                            runCatching { fallbackGalleryLauncher.launch("image/*") }
                                .onFailure {
                                    statusNotice = if (isHindi) "गैलरी पिकर नहीं खुल सका।" else "Could not open Android Photo Picker."
                                }
                        } catch (_: Exception) {
                            statusNotice = if (isHindi) "गैलरी पिकर नहीं खुल सका।" else "Could not open Android Photo Picker."
                        }
                    },
                    onTranslateImage = { viewModel.translateCameraImage(context) },
                    onCopy = {
                        clipboard.setText(AnnotatedString(it))
                        statusNotice = if (isHindi) "कॉपी किया गया।" else "Copied to clipboard."
                    },
                    onShare = { shareText(it) },
                    onSpeak = { text -> speakOut(text, viewModel.cameraTargetLanguage.speechLocaleTag) }
                )

                TranslatorTab.VOICE -> VoiceTranslatorContent(
                    isHindi = isHindi,
                    viewModel = viewModel,
                    isListening = isListeningVoice,
                    speechAvailable = voiceManager.isSpeechRecognitionAvailable(),
                    onPickSource = { pickerTarget = LanguagePickerTarget.VOICE_SOURCE },
                    onPickTarget = { pickerTarget = LanguagePickerTarget.VOICE_TARGET },
                    onToggleListen = {
                        if (isListeningVoice) {
                            voiceManager.stopListening()
                            isListeningVoice = false
                        } else {
                            requestMicAndRun {
                                isListeningVoice = true
                                statusNotice = null
                                voiceManager.startListening(
                                    localeTag = viewModel.voiceSourceLanguage.speechLocaleTag,
                                    onPartial = { partial -> viewModel.updateVoiceTranscript(partial) },
                                    onFinished = { outcome ->
                                        isListeningVoice = false
                                        when (outcome) {
                                            is SpeechInputOutcome.Transcript -> {
                                                viewModel.translateVoiceTranscript(context, outcome.text) { translated ->
                                                    speakOut(translated, viewModel.voiceTargetLanguage.speechLocaleTag)
                                                }
                                            }

                                            is SpeechInputOutcome.Error -> {
                                                statusNotice = outcome.reason
                                            }
                                        }
                                    }
                                )
                            }
                        }
                    },
                    onTranslateTranscript = {
                        viewModel.translateVoiceTranscript(context, viewModel.voiceTranscript)
                    },
                    onSpeakTranslation = { text -> speakOut(text, viewModel.voiceTargetLanguage.speechLocaleTag) },
                    onCopy = {
                        clipboard.setText(AnnotatedString(it))
                        statusNotice = if (isHindi) "अनुवाद कॉपी किया गया।" else "Translation copied."
                    }
                )

                TranslatorTab.CONVERSATION -> ConversationTranslatorContent(
                    isHindi = isHindi,
                    viewModel = viewModel,
                    listeningSpeaker = listeningSpeaker,
                    speechAvailable = voiceManager.isSpeechRecognitionAvailable(),
                    onPickPersonA = { pickerTarget = LanguagePickerTarget.CONV_PERSON_A },
                    onPickPersonB = { pickerTarget = LanguagePickerTarget.CONV_PERSON_B },
                    onSpeakForSpeaker = { isPersonA ->
                        val key = if (isPersonA) "A" else "B"
                        if (listeningSpeaker == key) {
                            voiceManager.stopListening()
                            listeningSpeaker = null
                        } else {
                            requestMicAndRun {
                                listeningSpeaker = key
                                statusNotice = null
                                val locale = if (isPersonA) {
                                    viewModel.personALanguage.speechLocaleTag
                                } else {
                                    viewModel.personBLanguage.speechLocaleTag
                                }
                                val speakerName = if (isPersonA) {
                                    if (isHindi) "व्यक्ति A" else "Person A"
                                } else {
                                    if (isHindi) "व्यक्ति B" else "Person B"
                                }
                                voiceManager.startListening(
                                    localeTag = locale,
                                    onPartial = {},
                                    onFinished = { outcome ->
                                        listeningSpeaker = null
                                        when (outcome) {
                                            is SpeechInputOutcome.Transcript -> {
                                                viewModel.sendConversationUtterance(
                                                    context = context,
                                                    isPersonA = isPersonA,
                                                    spokenText = outcome.text,
                                                    speakerLabel = speakerName
                                                ) { translated, targetLocale ->
                                                    speakOut(translated, targetLocale)
                                                }
                                            }

                                            is SpeechInputOutcome.Error -> statusNotice = outcome.reason
                                        }
                                    }
                                )
                            }
                        }
                    },
                    onSendTyped = { isPersonA, text ->
                        val speakerName = if (isPersonA) {
                            if (isHindi) "व्यक्ति A" else "Person A"
                        } else {
                            if (isHindi) "व्यक्ति B" else "Person B"
                        }
                        viewModel.sendConversationUtterance(
                            context = context,
                            isPersonA = isPersonA,
                            spokenText = text,
                            speakerLabel = speakerName
                        )
                    },
                    onSpeakTurn = { text, localeTag -> speakOut(text, localeTag) }
                )

                TranslatorTab.HISTORY -> TranslationHistoryContent(
                    isHindi = isHindi,
                    viewModel = viewModel,
                    onCopy = {
                        clipboard.setText(AnnotatedString(it))
                        statusNotice = if (isHindi) "इतिहास अनुवाद कॉपी किया गया।" else "Translation copied."
                    },
                    onReuse = { viewModel.reuseHistoryRecord(it) },
                    onDelete = { viewModel.deleteHistoryRecord(context, it) },
                    onClearAll = { viewModel.clearAllHistory(context) }
                )
            }
        }
    }

    // Searchable Language Picker Dialog (105 languages + optional Auto-detect)
    pickerTarget?.let { target ->
        val includeAuto = target == LanguagePickerTarget.TEXT_SOURCE
        val currentSelection = when (target) {
            LanguagePickerTarget.TEXT_SOURCE -> viewModel.sourceLanguage
            LanguagePickerTarget.TEXT_TARGET -> viewModel.targetLanguage
            LanguagePickerTarget.CAMERA_TARGET -> viewModel.cameraTargetLanguage
            LanguagePickerTarget.VOICE_SOURCE -> viewModel.voiceSourceLanguage
            LanguagePickerTarget.VOICE_TARGET -> viewModel.voiceTargetLanguage
            LanguagePickerTarget.CONV_PERSON_A -> viewModel.personALanguage
            LanguagePickerTarget.CONV_PERSON_B -> viewModel.personBLanguage
        }

        LanguagePickerDialog(
            isHindi = isHindi,
            includeAutoDetect = includeAuto,
            selectedCode = currentSelection.code,
            onDismiss = { pickerTarget = null },
            onSelect = { chosen ->
                when (target) {
                    LanguagePickerTarget.TEXT_SOURCE -> viewModel.updateSourceLanguage(chosen)
                    LanguagePickerTarget.TEXT_TARGET -> viewModel.updateTargetLanguage(chosen)
                    LanguagePickerTarget.CAMERA_TARGET -> viewModel.updateCameraTargetLanguage(chosen)
                    LanguagePickerTarget.VOICE_SOURCE -> viewModel.updateVoiceSourceLanguage(chosen)
                    LanguagePickerTarget.VOICE_TARGET -> viewModel.updateVoiceTargetLanguage(chosen)
                    LanguagePickerTarget.CONV_PERSON_A -> viewModel.updatePersonALanguage(chosen)
                    LanguagePickerTarget.CONV_PERSON_B -> viewModel.updatePersonBLanguage(chosen)
                }
                pickerTarget = null
            }
        )
    }
}

@Composable
private fun TranslatorModeButton(
    label: String,
    icon: ImageVector,
    selected: Boolean,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(12.dp),
        color = if (selected) ElectricBlue else WorldLensSurface,
        border = if (selected) null else BorderStroke(1.dp, BorderHairline)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = if (selected) WorldLensWhite else TextSecondary,
                modifier = Modifier.size(18.dp)
            )
            Text(
                text = label,
                style = MaterialTheme.typography.labelLarge,
                color = if (selected) WorldLensWhite else TextPrimary,
                maxLines = 1
            )
        }
    }
}

@Composable
private fun LanguageBar(
    isHindi: Boolean,
    sourceLabel: String,
    targetLabel: String,
    onPickSource: () -> Unit,
    onPickTarget: () -> Unit,
    onSwap: () -> Unit
) {
    val sourceAccessibility = if (isHindi) "स्रोत भाषा: $sourceLabel" else "Source language: $sourceLabel"
    val targetAccessibility = if (isHindi) "लक्ष्य भाषा: $targetLabel" else "Target language: $targetLabel"
    val swapAccessibility = if (isHindi) "भाषाएँ बदलें" else "Swap languages"

    Card(
        colors = CardDefaults.cardColors(containerColor = WorldLensWhite),
        border = BorderStroke(1.dp, BorderHairline),
        shape = RoundedCornerShape(16.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            TextButton(
                onClick = onPickSource,
                modifier = Modifier
                    .weight(1f)
                    .heightIn(min = 48.dp)
                    .semantics { contentDescription = sourceAccessibility }
            ) {
                Text(
                    text = sourceLabel,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    color = TextPrimary,
                    fontWeight = FontWeight.SemiBold
                )
            }
            IconButton(
                onClick = onSwap,
                modifier = Modifier.size(48.dp)
            ) {
                Icon(
                    imageVector = Icons.Outlined.SwapHoriz,
                    contentDescription = swapAccessibility,
                    tint = ElectricBlue
                )
            }
            TextButton(
                onClick = onPickTarget,
                modifier = Modifier
                    .weight(1f)
                    .heightIn(min = 48.dp)
                    .semantics { contentDescription = targetAccessibility }
            ) {
                Text(
                    text = targetLabel,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    color = ElectricBlue,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }
    }
}

@Composable
private fun TextTranslatorContent(
    isHindi: Boolean,
    viewModel: TranslatorViewModel,
    onPickSource: () -> Unit,
    onPickTarget: () -> Unit,
    onCopy: (String) -> Unit,
    onShare: (String) -> Unit,
    onSpeak: (String) -> Unit,
    onTranslate: () -> Unit
) {
    val charCount = viewModel.inputText.length
    val isOverLimit = charCount > TranslationTextPolicy.MAX_INPUT_CHARS

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        LanguageBar(
            isHindi = isHindi,
            sourceLabel = if (viewModel.sourceLanguage.code == TranslatorLanguages.AUTO_DETECT.code && isHindi) {
                "स्वतः पहचान"
            } else {
                viewModel.sourceLanguage.name
            },
            targetLabel = viewModel.targetLanguage.name,
            onPickSource = onPickSource,
            onPickTarget = onPickTarget,
            onSwap = viewModel::swapTextLanguages
        )

        Card(
            colors = CardDefaults.cardColors(containerColor = WorldLensWhite),
            border = BorderStroke(1.dp, if (isOverLimit) Color(0xFFFECACA) else BorderHairline),
            shape = RoundedCornerShape(18.dp)
        ) {
            Column(modifier = Modifier.padding(14.dp)) {
                OutlinedTextField(
                    value = viewModel.inputText,
                    onValueChange = viewModel::updateInputText,
                    isError = isOverLimit,
                    maxLines = 10,
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(min = 128.dp, max = 240.dp),
                    placeholder = {
                        Text(
                            if (isHindi) "अनुवाद करने के लिए टेक्स्ट लिखें या पेस्ट करें..."
                            else "Enter or paste text to translate..."
                        )
                    }
                )
                Spacer(modifier = Modifier.height(6.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = if (isOverLimit) {
                            if (isHindi) {
                                "अधिकतम ${TranslationTextPolicy.MAX_INPUT_CHARS} अक्षर समर्थित हैं"
                            } else {
                                "Maximum ${TranslationTextPolicy.MAX_INPUT_CHARS} characters supported"
                            }
                        } else if (charCount > TranslationTextPolicy.CHUNK_SIZE_CHARS) {
                            if (isHindi) "लंबा टेक्स्ट सुरक्षित खंडों में अनुवादित होगा"
                            else "Long text will be translated in safe sections"
                        } else {
                            ""
                        },
                        style = MaterialTheme.typography.labelSmall,
                        color = if (isOverLimit) Color(0xFFB91C1C) else TextMuted,
                        modifier = Modifier.weight(1f)
                    )
                    Text(
                        text = "$charCount / ${TranslationTextPolicy.MAX_INPUT_CHARS}",
                        style = MaterialTheme.typography.labelSmall,
                        color = if (isOverLimit) Color(0xFFB91C1C) else TextMuted
                    )
                }
                Spacer(modifier = Modifier.height(10.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Button(
                        onClick = onTranslate,
                        enabled = viewModel.inputText.isNotBlank() && !isOverLimit && !viewModel.isTranslatingText,
                        colors = ButtonDefaults.buttonColors(containerColor = ElectricBlue),
                        modifier = Modifier
                            .weight(1f)
                            .heightIn(min = 48.dp),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        if (viewModel.isTranslatingText) {
                            CircularProgressIndicator(
                                color = WorldLensWhite,
                                strokeWidth = 2.dp,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(if (isHindi) "अनुवाद हो रहा है..." else "Translating...")
                        } else {
                            Icon(Icons.Outlined.Translate, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(if (isHindi) "अनुवाद करें" else "Translate")
                        }
                    }

                    OutlinedButton(
                        onClick = viewModel::clearTextTranslation,
                        enabled = viewModel.inputText.isNotEmpty() || viewModel.textResult != null || viewModel.textError != null,
                        modifier = Modifier.heightIn(min = 48.dp),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(Icons.Outlined.Clear, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(if (isHindi) "साफ़ करें" else "Clear")
                    }
                }
            }
        }

        viewModel.textError?.let { err ->
            TranslationErrorCard(isHindi = isHindi, error = err, onRetry = onTranslate)
        }

        viewModel.textResult?.let { result ->
            Card(
                colors = CardDefaults.cardColors(containerColor = WorldLensWhite),
                border = BorderStroke(1.dp, ElectricBlue.copy(alpha = 0.25f)),
                shape = RoundedCornerShape(18.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    val detectedMeta = result.detectedSourceLanguage?.let {
                        if (isHindi) "पहचानी गई भाषा: $it · ${result.targetLanguageName}"
                        else "Detected: $it · ${result.targetLanguageName}"
                    } ?: result.targetLanguageName

                    Text(
                        text = detectedMeta,
                        style = MaterialTheme.typography.labelMedium,
                        color = ElectricBlue,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    SelectionContainer {
                        Text(
                            text = result.translatedText,
                            style = MaterialTheme.typography.bodyLarge,
                            color = TextPrimary
                        )
                    }
                    Spacer(modifier = Modifier.height(14.dp))
                    HorizontalDivider(color = BorderHairline)
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        TextButton(
                            onClick = { onCopy(result.translatedText) },
                            modifier = Modifier.heightIn(min = 44.dp)
                        ) {
                            Icon(Icons.Outlined.ContentCopy, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(if (isHindi) "कॉपी" else "Copy")
                        }
                        TextButton(
                            onClick = { onShare(result.translatedText) },
                            modifier = Modifier.heightIn(min = 44.dp)
                        ) {
                            Icon(Icons.Outlined.Share, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(if (isHindi) "साझा करें" else "Share")
                        }
                        TextButton(
                            onClick = { onSpeak(result.translatedText) },
                            modifier = Modifier.heightIn(min = 44.dp)
                        ) {
                            Icon(Icons.Outlined.VolumeUp, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(if (isHindi) "सुनें" else "Listen")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CameraTranslatorContent(
    isHindi: Boolean,
    viewModel: TranslatorViewModel,
    hasScannerPhoto: Boolean,
    onUseScannerPhoto: () -> Unit,
    onPickTarget: () -> Unit,
    onTakePhoto: () -> Unit,
    onOpenGallery: () -> Unit,
    onTranslateImage: () -> Unit,
    onCopy: (String) -> Unit,
    onShare: (String) -> Unit,
    onSpeak: (String) -> Unit
) {
    val context = LocalContext.current
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Card(
            colors = CardDefaults.cardColors(containerColor = WorldLensWhite),
            border = BorderStroke(1.dp, BorderHairline),
            shape = RoundedCornerShape(16.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 14.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = if (isHindi) "लक्ष्य भाषा" else "Translate extracted text to",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextSecondary
                )
                TextButton(onClick = onPickTarget) {
                    Text(
                        text = viewModel.cameraTargetLanguage.name,
                        color = ElectricBlue,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }

        // Image preview card
        Card(
            colors = CardDefaults.cardColors(containerColor = WorldLensWhite),
            border = BorderStroke(1.dp, BorderHairline),
            shape = RoundedCornerShape(18.dp)
        ) {
            Column(modifier = Modifier.padding(14.dp)) {
                val img = viewModel.cameraImage
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .aspectRatio(4f / 3f)
                        .clip(RoundedCornerShape(14.dp))
                        .background(DeepNavy),
                    contentAlignment = Alignment.Center
                ) {
                    when (img) {
                        is SelectedScanImage.GalleryUri -> {
                            AsyncImage(
                                model = img.uri,
                                contentDescription = "Selected translation image",
                                contentScale = ContentScale.Fit,
                                modifier = Modifier.fillMaxSize()
                            )
                        }

                        is SelectedScanImage.CameraUri -> {
                            AsyncImage(
                                model = img.uri,
                                contentDescription = "Captured translation photo",
                                contentScale = ContentScale.Fit,
                                modifier = Modifier.fillMaxSize()
                            )
                        }

                        is SelectedScanImage.CameraPreviewBitmap -> {
                            Image(
                                bitmap = img.bitmap.asImageBitmap(),
                                contentDescription = "Captured translation photo",
                                contentScale = ContentScale.Fit,
                                modifier = Modifier.fillMaxSize()
                            )
                        }

                        null -> {
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                modifier = Modifier.padding(20.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Outlined.PhotoCamera,
                                    contentDescription = null,
                                    tint = WorldLensWhite.copy(alpha = 0.7f),
                                    modifier = Modifier.size(36.dp)
                                )
                                Spacer(modifier = Modifier.height(10.dp))
                                Text(
                                    text = if (isHindi) {
                                        "साइनबोर्ड, मेन्यू या दस्तावेज़ की फ़ोटो लें या गैलरी से चुनें"
                                    } else {
                                        "Take a photo or choose an image containing visible text"
                                    },
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = WorldLensWhite
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OutlinedButton(
                        onClick = onTakePhoto,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(Icons.Outlined.PhotoCamera, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(if (isHindi) "फ़ोटो लें" else "Take Photo")
                    }
                    OutlinedButton(
                        onClick = onOpenGallery,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(Icons.Outlined.PhotoLibrary, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(if (isHindi) "गैलरी" else "Gallery")
                    }
                }

                if (hasScannerPhoto) {
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedButton(
                        onClick = onUseScannerPhoto,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(Icons.Outlined.PhotoLibrary, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            if (isHindi) "स्कैनर की वर्तमान फ़ोटो उपयोग करें"
                            else "Use current Scanner photo"
                        )
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Button(
                        onClick = onTranslateImage,
                        enabled = img != null && !viewModel.isTranslatingCamera,
                        colors = ButtonDefaults.buttonColors(containerColor = ElectricBlue),
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        if (viewModel.isTranslatingCamera) {
                            CircularProgressIndicator(
                                color = WorldLensWhite,
                                strokeWidth = 2.dp,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(if (isHindi) "टेक्स्ट निकाला जा रहा है..." else "Extracting & translating...")
                        } else {
                            Icon(Icons.Outlined.Translate, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(if (isHindi) "टेक्स्ट निकालें व अनुवाद करें" else "Extract & Translate")
                        }
                    }
                    if (img != null) {
                        OutlinedButton(
                            onClick = { viewModel.clearCameraImage(context.applicationContext) },
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text(if (isHindi) "हटाएँ" else "Remove")
                        }
                    }
                }
            }
        }

        viewModel.cameraError?.let { err ->
            TranslationErrorCard(isHindi = isHindi, error = err, onRetry = onTranslateImage)
        }

        viewModel.cameraResult?.let { res ->
            if (!res.hasReadableText) {
                Card(
                    colors = CardDefaults.cardColors(containerColor = WorldLensWhite),
                    border = BorderStroke(1.dp, BorderHairline),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = if (isHindi) "स्पष्ट पठनीय टेक्स्ट नहीं मिला" else "No clearly readable text detected",
                            style = MaterialTheme.typography.titleSmall,
                            color = TextPrimary,
                            fontWeight = FontWeight.SemiBold
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = res.readabilityNote ?: if (isHindi) {
                                "WorldLens अपठनीय या धुंधला टेक्स्ट नहीं बनाता। कृपया बेहतर रोशनी और फ़ोकस के साथ नई फ़ोटो लें।"
                            } else {
                                "WorldLens never fabricates unreadable text. Please capture a clearer, well-lit image."
                            },
                            style = MaterialTheme.typography.bodySmall,
                            color = TextSecondary
                        )
                    }
                }
            } else {
                Card(
                    colors = CardDefaults.cardColors(containerColor = WorldLensWhite),
                    border = BorderStroke(1.dp, BorderHairline),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = if (isHindi) {
                                "मूल निकाला गया टेक्स्ट" + (res.detectedSourceLanguage?.let { " · $it" } ?: "")
                            } else {
                                "Original extracted text" + (res.detectedSourceLanguage?.let { " · $it" } ?: "")
                            },
                            style = MaterialTheme.typography.labelMedium,
                            color = TextMuted,
                            fontWeight = FontWeight.SemiBold
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = res.extractedText,
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextPrimary
                        )
                    }
                }

                Card(
                    colors = CardDefaults.cardColors(containerColor = WorldLensWhite),
                    border = BorderStroke(1.dp, ElectricBlue.copy(alpha = 0.25f)),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = if (isHindi) "अनुवादित टेक्स्ट · ${res.targetLanguageName}"
                            else "Translated text · ${res.targetLanguageName}",
                            style = MaterialTheme.typography.labelMedium,
                            color = ElectricBlue,
                            fontWeight = FontWeight.SemiBold
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = res.translatedText,
                            style = MaterialTheme.typography.bodyLarge,
                            color = TextPrimary
                        )
                        if (!res.readabilityNote.isNullOrBlank()) {
                            Spacer(modifier = Modifier.height(10.dp))
                            Surface(
                                color = ElectricBlueTint,
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(12.dp)) {
                                    Text(
                                        text = if (isHindi) "अनिश्चितता / पठनीयता नोट" else "Image Text Uncertainty Note",
                                        style = MaterialTheme.typography.labelMedium,
                                        color = DeepNavy,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Text(
                                        text = res.readabilityNote,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = TextSecondary
                                    )
                                }
                            }
                        }
                        Spacer(modifier = Modifier.height(10.dp))
                        Row(
                            modifier = Modifier.horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            TextButton(onClick = { onCopy(res.translatedText) }) {
                                Icon(Icons.Outlined.ContentCopy, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(if (isHindi) "कॉपी" else "Copy")
                            }
                            TextButton(onClick = { onShare(res.translatedText) }) {
                                Icon(Icons.Outlined.Share, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(if (isHindi) "साझा करें" else "Share")
                            }
                            TextButton(onClick = { onSpeak(res.translatedText) }) {
                                Icon(Icons.Outlined.VolumeUp, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(if (isHindi) "सुनें" else "Listen")
                            }
                            TextButton(onClick = { viewModel.clearCameraImage(context.applicationContext) }) {
                                Icon(Icons.Outlined.Clear, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(if (isHindi) "साफ़ करें" else "Clear")
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun VoiceTranslatorContent(
    isHindi: Boolean,
    viewModel: TranslatorViewModel,
    isListening: Boolean,
    speechAvailable: Boolean,
    onPickSource: () -> Unit,
    onPickTarget: () -> Unit,
    onToggleListen: () -> Unit,
    onTranslateTranscript: () -> Unit,
    onSpeakTranslation: (String) -> Unit,
    onCopy: (String) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        LanguageBar(
            isHindi = isHindi,
            sourceLabel = viewModel.voiceSourceLanguage.name,
            targetLabel = viewModel.voiceTargetLanguage.name,
            onPickSource = onPickSource,
            onPickTarget = onPickTarget,
            onSwap = viewModel::swapVoiceLanguages
        )

        if (!speechAvailable) {
            Card(
                colors = CardDefaults.cardColors(containerColor = ElectricBlueTint),
                shape = RoundedCornerShape(14.dp)
            ) {
                Text(
                    text = if (isHindi) {
                        "इस डिवाइस पर Android SpeechRecognizer सेवा उपलब्ध नहीं है। आप नीचे टेक्स्ट लिखकर भी अनुवाद व Text-to-Speech सुन सकते हैं।"
                    } else {
                        "Android SpeechRecognizer is not available on this device. You can still type speech text below to translate and listen with Text-to-Speech."
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = DeepNavy,
                    modifier = Modifier.padding(14.dp)
                )
            }
        }

        Card(
            colors = CardDefaults.cardColors(containerColor = WorldLensWhite),
            border = BorderStroke(1.dp, BorderHairline),
            shape = RoundedCornerShape(18.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Button(
                    onClick = onToggleListen,
                    enabled = speechAvailable && !viewModel.isTranslatingVoice,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isListening) DeepNavy else ElectricBlue
                    ),
                    shape = RoundedCornerShape(16.dp),
                    contentPadding = PaddingValues(horizontal = 24.dp, vertical = 14.dp)
                ) {
                    Icon(
                        imageVector = if (isListening) Icons.Outlined.Stop else Icons.Outlined.Mic,
                        contentDescription = null
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = if (isListening) {
                            if (isHindi) "सुनना रोकें" else "Stop Listening"
                        } else {
                            if (isHindi) "बोलकर अनुवाद करें" else "Tap to Speak"
                        }
                    )
                }

                Spacer(modifier = Modifier.height(14.dp))
                OutlinedTextField(
                    value = viewModel.voiceTranscript,
                    onValueChange = viewModel::updateVoiceTranscript,
                    modifier = Modifier.fillMaxWidth(),
                    label = {
                        Text(if (isHindi) "पहचाना गया भाषण" else "Recognized speech")
                    },
                    minLines = 2
                )
                Spacer(modifier = Modifier.height(10.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Button(
                        onClick = onTranslateTranscript,
                        enabled = viewModel.voiceTranscript.isNotBlank() && !viewModel.isTranslatingVoice,
                        colors = ButtonDefaults.buttonColors(containerColor = ElectricBlue),
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text(
                            if (viewModel.isTranslatingVoice) {
                                if (isHindi) "अनुवाद हो रहा है..." else "Translating..."
                            } else {
                                if (isHindi) "अनुवाद करें" else "Translate Speech"
                            }
                        )
                    }
                    OutlinedButton(
                        onClick = viewModel::clearVoiceTranslation,
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text(if (isHindi) "साफ़ करें" else "Clear")
                    }
                }
            }
        }

        viewModel.voiceError?.let { err ->
            TranslationErrorCard(isHindi = isHindi, error = err, onRetry = onTranslateTranscript)
        }

        viewModel.voiceResult?.let { result ->
            Card(
                colors = CardDefaults.cardColors(containerColor = WorldLensWhite),
                border = BorderStroke(1.dp, ElectricBlue.copy(alpha = 0.25f)),
                shape = RoundedCornerShape(18.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = result.targetLanguageName,
                        style = MaterialTheme.typography.labelMedium,
                        color = ElectricBlue,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = result.translatedText,
                        style = MaterialTheme.typography.bodyLarge,
                        color = TextPrimary
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(
                            onClick = { onSpeakTranslation(result.translatedText) },
                            colors = ButtonDefaults.buttonColors(containerColor = DeepNavy),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Icon(Icons.Outlined.VolumeUp, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(if (isHindi) "बोलकर सुनें" else "Read Aloud")
                        }
                        OutlinedButton(
                            onClick = { onCopy(result.translatedText) },
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Icon(Icons.Outlined.ContentCopy, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(if (isHindi) "कॉपी" else "Copy")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ConversationTranslatorContent(
    isHindi: Boolean,
    viewModel: TranslatorViewModel,
    listeningSpeaker: String?,
    speechAvailable: Boolean,
    onPickPersonA: () -> Unit,
    onPickPersonB: () -> Unit,
    onSpeakForSpeaker: (Boolean) -> Unit,
    onSendTyped: (Boolean, String) -> Unit,
    onSpeakTurn: (String, String) -> Unit
) {
    var draftPersonA by remember { mutableStateOf("") }
    var draftPersonB by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Two-person speaker controls
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            SpeakerControlCard(
                modifier = Modifier.weight(1f),
                title = if (isHindi) "व्यक्ति A" else "Person A",
                languageName = viewModel.personALanguage.name,
                isListening = listeningSpeaker == "A",
                speechAvailable = speechAvailable,
                draft = draftPersonA,
                onDraftChange = { draftPersonA = it },
                onPickLanguage = onPickPersonA,
                onSpeak = { onSpeakForSpeaker(true) },
                onSend = {
                    if (draftPersonA.isNotBlank()) {
                        onSendTyped(true, draftPersonA)
                        draftPersonA = ""
                    }
                },
                accentColor = ElectricBlue,
                isHindi = isHindi
            )

            SpeakerControlCard(
                modifier = Modifier.weight(1f),
                title = if (isHindi) "व्यक्ति B" else "Person B",
                languageName = viewModel.personBLanguage.name,
                isListening = listeningSpeaker == "B",
                speechAvailable = speechAvailable,
                draft = draftPersonB,
                onDraftChange = { draftPersonB = it },
                onPickLanguage = onPickPersonB,
                onSpeak = { onSpeakForSpeaker(false) },
                onSend = {
                    if (draftPersonB.isNotBlank()) {
                        onSendTyped(false, draftPersonB)
                        draftPersonB = ""
                    }
                },
                accentColor = DeepNavy,
                isHindi = isHindi
            )
        }

        viewModel.conversationError?.let { err ->
            TranslationErrorCard(isHindi = isHindi, error = err, onRetry = null)
        }

        if (viewModel.isTranslatingConversation) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                CircularProgressIndicator(strokeWidth = 2.dp, modifier = Modifier.size(18.dp))
                Text(
                    text = if (isHindi) "संवाद अनुवाद हो रहा है..." else "Translating message...",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary
                )
            }
        }

        if (viewModel.conversationTurns.isEmpty()) {
            Card(
                colors = CardDefaults.cardColors(containerColor = WorldLensWhite),
                border = BorderStroke(1.dp, BorderHairline),
                shape = RoundedCornerShape(16.dp)
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Text(
                        text = if (isHindi) "दो-व्यक्ति संवाद शुरू करें" else "Start a two-person conversation",
                        style = MaterialTheme.typography.titleSmall,
                        color = TextPrimary,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = if (isHindi) {
                            "प्रत्येक व्यक्ति के लिए अलग भाषा चुनें और ऊपर दिए गए माइक या टेक्स्ट नियंत्रण से संदेश बोलें या लिखें।"
                        } else {
                            "Select two languages above and use either speaker's microphone or quick message input. Original and translated messages appear below."
                        },
                        style = MaterialTheme.typography.bodySmall,
                        color = TextSecondary
                    )
                }
            }
        } else {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = if (isHindi) "संवाद संदेश" else "Conversation transcript",
                    style = MaterialTheme.typography.labelLarge,
                    color = TextSecondary
                )
                TextButton(onClick = viewModel::clearConversation) {
                    Text(if (isHindi) "संवाद साफ़ करें" else "Clear conversation")
                }
            }

            viewModel.conversationTurns.forEach { turn ->
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = if (turn.isPersonA) WorldLensWhite else ElectricBlueTint
                    ),
                    border = BorderStroke(1.dp, BorderHairline),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Text(
                            text = "${turn.speakerLabel} · ${turn.sourceLanguageName} → ${turn.targetLanguageName}",
                            style = MaterialTheme.typography.labelSmall,
                            color = ElectricBlue,
                            fontWeight = FontWeight.SemiBold
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = turn.originalText,
                            style = MaterialTheme.typography.bodySmall,
                            color = TextSecondary
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = turn.translatedText,
                            style = MaterialTheme.typography.bodyLarge,
                            color = TextPrimary,
                            fontWeight = FontWeight.Medium
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        TextButton(
                            onClick = { onSpeakTurn(turn.translatedText, turn.targetSpeechLocale) },
                            contentPadding = PaddingValues(horizontal = 4.dp, vertical = 2.dp)
                        ) {
                            Icon(Icons.Outlined.VolumeUp, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(if (isHindi) "सुनें" else "Listen")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SpeakerControlCard(
    modifier: Modifier,
    title: String,
    languageName: String,
    isListening: Boolean,
    speechAvailable: Boolean,
    draft: String,
    onDraftChange: (String) -> Unit,
    onPickLanguage: () -> Unit,
    onSpeak: () -> Unit,
    onSend: () -> Unit,
    accentColor: Color,
    isHindi: Boolean
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = WorldLensWhite),
        border = BorderStroke(1.dp, BorderHairline),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(
                text = title,
                style = MaterialTheme.typography.labelMedium,
                color = TextMuted,
                fontWeight = FontWeight.SemiBold
            )
            TextButton(
                onClick = onPickLanguage,
                contentPadding = PaddingValues(0.dp)
            ) {
                Text(
                    text = languageName,
                    color = accentColor,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            Button(
                onClick = onSpeak,
                enabled = speechAvailable,
                colors = ButtonDefaults.buttonColors(containerColor = accentColor),
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(10.dp),
                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 8.dp)
            ) {
                Icon(
                    imageVector = if (isListening) Icons.Outlined.Stop else Icons.Outlined.Mic,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = if (isListening) (if (isHindi) "रोकें" else "Stop") else (if (isHindi) "बोलें" else "Speak"),
                    maxLines = 1
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
            OutlinedTextField(
                value = draft,
                onValueChange = onDraftChange,
                singleLine = true,
                placeholder = { Text(if (isHindi) "लिखें..." else "Type...") },
                trailingIcon = {
                    IconButton(onClick = onSend, enabled = draft.isNotBlank()) {
                        Icon(Icons.Outlined.Send, contentDescription = "Send")
                    }
                },
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}

@Composable
private fun TranslationHistoryContent(
    isHindi: Boolean,
    viewModel: TranslatorViewModel,
    onCopy: (String) -> Unit,
    onReuse: (com.worldlens.app.domain.model.LocalTranslationRecord) -> Unit,
    onDelete: (String) -> Unit,
    onClearAll: () -> Unit
) {
    var confirmClearAll by remember { mutableStateOf(false) }
    val appLanguage = if (isHindi) AppLanguage.HINDI else AppLanguage.ENGLISH

    if (confirmClearAll) {
        AlertDialog(
            onDismissRequest = { confirmClearAll = false },
            title = {
                Text(
                    text = if (isHindi) "सभी अनुवाद इतिहास हटाएँ?" else "Clear all translation history?",
                    style = MaterialTheme.typography.titleMedium,
                    color = TextPrimary
                )
            },
            text = {
                Text(
                    text = if (isHindi) {
                        "यह इस डिवाइस से सभी स्थानीय अनुवाद प्रविष्टियों को स्थायी रूप से हटा देगा।"
                    } else {
                        "This will permanently remove all saved translation entries from this device."
                    },
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextSecondary
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        confirmClearAll = false
                        onClearAll()
                    }
                ) {
                    Text(
                        text = if (isHindi) "सभी हटाएँ" else "Clear All",
                        color = Color(0xFFB91C1C),
                        fontWeight = FontWeight.SemiBold
                    )
                }
            },
            dismissButton = {
                TextButton(onClick = { confirmClearAll = false }) {
                    Text(if (isHindi) "रद्द करें" else "Cancel")
                }
            }
        )
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = if (isHindi) {
                    "केवल इस डिवाइस पर स्थानीय रूप से सहेजा गया · कोई क्लाउड अपलोड नहीं"
                } else {
                    "Saved locally on this device · No cloud upload"
                },
                style = MaterialTheme.typography.bodySmall,
                color = TextMuted,
                modifier = Modifier.weight(1f)
            )
            if (viewModel.historyRecords.isNotEmpty()) {
                TextButton(onClick = { confirmClearAll = true }) {
                    Text(if (isHindi) "सभी हटाएँ" else "Clear All")
                }
            }
        }

        if (viewModel.historyRecords.isEmpty()) {
            Card(
                colors = CardDefaults.cardColors(containerColor = WorldLensWhite),
                border = BorderStroke(1.dp, BorderHairline),
                shape = RoundedCornerShape(18.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text(
                        text = if (isHindi) "अभी तक कोई स्थानीय अनुवाद इतिहास नहीं है" else "No local translations yet",
                        style = MaterialTheme.typography.titleSmall,
                        color = TextPrimary,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = if (isHindi) {
                            "आपके हाल के टेक्स्ट, कैमरा, वॉइस और संवाद अनुवाद यहाँ स्थानीय रूप से सहेजे जाएँगे।"
                        } else {
                            "Your recent Text, Camera, Voice, and Conversation translations are stored locally on this device for quick reuse."
                        },
                        style = MaterialTheme.typography.bodySmall,
                        color = TextSecondary
                    )
                }
            }
        } else {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(viewModel.historyRecords, key = { it.id }) { record ->
                    val formattedDate = remember(record.timestampMillis, appLanguage) {
                        LocalHistoryDateFormatter.formatDateTime(record.timestampMillis, appLanguage)
                    }
                    Card(
                        colors = CardDefaults.cardColors(containerColor = WorldLensWhite),
                        border = BorderStroke(1.dp, BorderHairline),
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Text(
                                text = "${record.mode.uppercase()} · ${record.sourceLanguageName} → ${record.targetLanguageName}",
                                style = MaterialTheme.typography.labelSmall,
                                color = ElectricBlue,
                                fontWeight = FontWeight.SemiBold
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = formattedDate,
                                style = MaterialTheme.typography.labelSmall,
                                color = TextMuted
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = record.sourceText,
                                style = MaterialTheme.typography.bodySmall,
                                color = TextSecondary,
                                maxLines = 3,
                                overflow = TextOverflow.Ellipsis
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = record.translatedText,
                                style = MaterialTheme.typography.bodyMedium,
                                color = TextPrimary,
                                fontWeight = FontWeight.Medium
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                TextButton(onClick = { onCopy(record.translatedText) }) {
                                    Icon(Icons.Outlined.ContentCopy, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(if (isHindi) "कॉपी" else "Copy")
                                }
                                TextButton(onClick = { onReuse(record) }) {
                                    Icon(Icons.Outlined.Replay, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(if (isHindi) "पुनः उपयोग" else "Reuse")
                                }
                                TextButton(onClick = { onDelete(record.id) }) {
                                    Icon(Icons.Outlined.DeleteOutline, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(if (isHindi) "हटाएँ" else "Delete")
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun TranslationErrorCard(
    isHindi: Boolean,
    error: TranslatorErrorState,
    onRetry: (() -> Unit)?
) {
    val isValidationOnly = error.type == TranslationErrorType.EMPTY_INPUT ||
        error.type == TranslationErrorType.TEXT_TOO_LONG

    val (title, body) = when (error.type) {
        TranslationErrorType.EMPTY_INPUT -> Pair(
            if (isHindi) "कोई टेक्स्ट दर्ज नहीं है" else "Enter text to translate",
            if (isHindi) "अनुवाद करने से पहले कृपया कुछ टेक्स्ट लिखें या पेस्ट करें।"
            else "Please type or paste some text before tapping Translate."
        )

        TranslationErrorType.TEXT_TOO_LONG -> Pair(
            if (isHindi) "टेक्स्ट सीमा से अधिक है" else "Text exceeds character limit",
            if (isHindi) "आपका टेक्स्ट सुरक्षित रखा गया है। कृपया इसे ${TranslationTextPolicy.MAX_INPUT_CHARS} अक्षरों के भीतर छोटा करें और पुनः प्रयास करें।"
            else "Your text has been preserved. Please shorten it within ${TranslationTextPolicy.MAX_INPUT_CHARS} characters and try again."
        )

        TranslationErrorType.NETWORK -> Pair(
            if (isHindi) "नेटवर्क त्रुटि" else "Network connection failed",
            if (isHindi) "अनुवाद सेवा तक पहुँचा नहीं जा सका। आपका टेक्स्ट सुरक्षित है—कृपया इंटरनेट जाँचें।"
            else "Could not reach the translation service. Your text is preserved—check your internet connection."
        )

        TranslationErrorType.QUOTA_EXCEEDED -> Pair(
            if (isHindi) "AI कोटा सीमा समाप्त" else "AI quota limit reached",
            if (isHindi) "Gemini API अनुरोध सीमा अस्थायी रूप से पूरी हो गई है। आपका टेक्स्ट सुरक्षित है—कृपया थोड़ी देर बाद पुनः प्रयास करें।"
            else "Gemini API request quota was temporarily exceeded. Your text is preserved—please wait and try again."
        )

        TranslationErrorType.UNSUPPORTED_LANGUAGE -> Pair(
            if (isHindi) "असमर्थित भाषा" else "Unsupported language pair",
            if (isHindi) "चयनित भाषा का विश्वसनीय अनुवाद अभी उपलब्ध नहीं है।"
            else "The selected language cannot be reliably translated right now."
        )

        TranslationErrorType.INVALID_IMAGE -> Pair(
            if (isHindi) "अमान्य छवि" else "Invalid or unreadable image",
            if (isHindi) "चयनित छवि को सुरक्षित रूप से पढ़ा नहीं जा सका। कृपया दूसरी फ़ोटो चुनें।"
            else "The selected image could not be decoded safely. Please choose another photo."
        )

        TranslationErrorType.AI_UNAVAILABLE -> Pair(
            if (isHindi) "AI सेवा उपलब्ध नहीं" else "Translation service unavailable",
            if (isHindi) "WorldLens अनुवाद सेवा वर्तमान में अस्थायी रूप से अनुपलब्ध है। आपका टेक्स्ट सुरक्षित है—कृपया थोड़ी देर बाद पुनः प्रयास करें।"
            else "WorldLens translation service is temporarily unavailable right now. Your text is preserved—please try again shortly."
        )

        TranslationErrorType.UNKNOWN -> Pair(
            if (isHindi) "अनुवाद पूरा नहीं हो सका" else "Translation failed",
            if (isHindi) "अनुवाद के दौरान एक अप्रत्याशित त्रुटि हुई। आपका टेक्स्ट सुरक्षित है—कृपया पुनः प्रयास करें।"
            else "An unexpected error occurred during translation. Your text is preserved—please try again."
        )
    }

    Card(
        colors = CardDefaults.cardColors(containerColor = WorldLensWhite),
        border = BorderStroke(1.dp, Color(0xFFFECACA)),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleSmall,
                color = Color(0xFFB91C1C),
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = body,
                style = MaterialTheme.typography.bodySmall,
                color = TextSecondary
            )
            if (BuildConfig.DEBUG && !error.detail.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = error.detail,
                    style = MaterialTheme.typography.labelSmall,
                    color = TextMuted
                )
            }
            if (onRetry != null && !isValidationOnly) {
                Spacer(modifier = Modifier.height(8.dp))
                TextButton(onClick = onRetry) {
                    Text(if (isHindi) "पुनः प्रयास करें" else "Try Again")
                }
            }
        }
    }
}

@Composable
private fun LanguagePickerDialog(
    isHindi: Boolean,
    includeAutoDetect: Boolean,
    selectedCode: String,
    onDismiss: () -> Unit,
    onSelect: (TranslatorLanguage) -> Unit
) {
    var query by remember { mutableStateOf("") }
    val allItems = remember(includeAutoDetect) {
        if (includeAutoDetect) {
            listOf(TranslatorLanguages.AUTO_DETECT) + TranslatorLanguages.ALL_LANGUAGES
        } else {
            TranslatorLanguages.ALL_LANGUAGES
        }
    }
    val filtered = remember(query, allItems) {
        val q = query.trim().lowercase()
        if (q.isEmpty()) allItems
        else allItems.filter {
            it.name.lowercase().contains(q) ||
                it.nativeName.lowercase().contains(q) ||
                it.code.lowercase().contains(q)
        }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = if (isHindi) "भाषा चुनें (${TranslatorLanguages.ALL_LANGUAGES.size}+)"
                else "Select Language (${TranslatorLanguages.ALL_LANGUAGES.size}+)",
                fontWeight = FontWeight.Bold
            )
        },
        text = {
            Column(modifier = Modifier.heightIn(max = 420.dp)) {
                OutlinedTextField(
                    value = query,
                    onValueChange = { query = it },
                    singleLine = true,
                    leadingIcon = { Icon(Icons.Outlined.Search, contentDescription = null) },
                    placeholder = { Text(if (isHindi) "भाषा खोजें..." else "Search language...") },
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(10.dp))
                if (filtered.isEmpty()) {
                    Text(
                        text = if (isHindi) {
                            "\"$query\" के लिए कोई समर्थित भाषा नहीं मिली।"
                        } else {
                            "No supported language matches \"$query\"."
                        },
                        style = MaterialTheme.typography.bodySmall,
                        color = TextMuted,
                        modifier = Modifier.padding(vertical = 12.dp, horizontal = 4.dp)
                    )
                } else {
                    LazyColumn(modifier = Modifier.fillMaxWidth()) {
                        items(filtered, key = { it.code }) { lang ->
                            val isSelected = lang.code == selectedCode
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(if (isSelected) ElectricBlueTint else Color.Transparent)
                                    .clickable { onSelect(lang) }
                                    .padding(horizontal = 12.dp, vertical = 10.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = lang.name,
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = if (isSelected) ElectricBlue else TextPrimary,
                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
                                    )
                                    if (lang.nativeName != lang.name) {
                                        Text(
                                            text = lang.nativeName,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = TextMuted
                                        )
                                    }
                                }
                                Text(
                                    text = lang.code,
                                    style = MaterialTheme.typography.labelSmall,
                                    color = TextMuted
                                )
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text(if (isHindi) "बंद करें" else "Close")
            }
        }
    )
}
