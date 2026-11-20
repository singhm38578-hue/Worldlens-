package com.worldlens.app.ui.translator

import android.content.Context
import android.graphics.Bitmap
import android.net.Uri
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.worldlens.app.data.image.CameraPhotoFileManager
import com.worldlens.app.data.local.HistoryOperationResult
import com.worldlens.app.data.local.LocalHistoryRepository
import com.worldlens.app.data.local.NetworkConnectivityHelper
import com.worldlens.app.data.repository.GeminiTranslatorRepository
import com.worldlens.app.data.repository.TextInputValidation
import com.worldlens.app.data.repository.TranslationCallResult
import com.worldlens.app.data.repository.TranslationTextPolicy
import com.worldlens.app.domain.model.CameraTranslationOutput
import com.worldlens.app.domain.model.ConversationTurn
import com.worldlens.app.domain.model.LocalTranslationRecord
import com.worldlens.app.domain.model.SelectedScanImage
import com.worldlens.app.domain.model.TextTranslationOutput
import com.worldlens.app.domain.model.TranslationErrorType
import com.worldlens.app.domain.model.TranslatorLanguage
import com.worldlens.app.domain.model.TranslatorLanguages
import com.worldlens.app.domain.model.TranslatorTab
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import java.util.UUID

data class TranslatorErrorState(
    val type: TranslationErrorType,
    val detail: String? = null
)

/**
 * Shared state holder for the WorldLens Global AI Translator module across
 * Text, Camera, Voice, Conversation, and Local History tabs.
 */
class TranslatorViewModel : ViewModel() {

    var activeTab by mutableStateOf(TranslatorTab.TEXT)
        private set

    // --- Text Translator State ---
    var sourceLanguage by mutableStateOf(TranslatorLanguages.AUTO_DETECT)
        private set
    var targetLanguage by mutableStateOf(TranslatorLanguages.findByCode("hi"))
        private set
    var inputText by mutableStateOf("")
        private set
    var textResult by mutableStateOf<TextTranslationOutput?>(null)
        private set
    var isTranslatingText by mutableStateOf(false)
        private set
    var textError by mutableStateOf<TranslatorErrorState?>(null)
        private set

    // --- Camera Translator State ---
    var cameraImage by mutableStateOf<SelectedScanImage?>(null)
        private set
    private var cameraImageOwnedByTranslator: Boolean = false
    var cameraTargetLanguage by mutableStateOf(TranslatorLanguages.findByCode("en"))
        private set
    var cameraResult by mutableStateOf<CameraTranslationOutput?>(null)
        private set
    var isTranslatingCamera by mutableStateOf(false)
        private set
    var cameraError by mutableStateOf<TranslatorErrorState?>(null)
        private set

    // --- Voice Translator State ---
    var voiceSourceLanguage by mutableStateOf(TranslatorLanguages.findByCode("hi"))
        private set
    var voiceTargetLanguage by mutableStateOf(TranslatorLanguages.findByCode("en"))
        private set
    var voiceTranscript by mutableStateOf("")
        private set
    var voiceResult by mutableStateOf<TextTranslationOutput?>(null)
        private set
    var isTranslatingVoice by mutableStateOf(false)
        private set
    var voiceError by mutableStateOf<TranslatorErrorState?>(null)
        private set

    // --- Conversation Translator State ---
    var personALanguage by mutableStateOf(TranslatorLanguages.findByCode("en"))
        private set
    var personBLanguage by mutableStateOf(TranslatorLanguages.findByCode("hi"))
        private set
    var conversationTurns by mutableStateOf<List<ConversationTurn>>(emptyList())
        private set
    var isTranslatingConversation by mutableStateOf(false)
        private set
    var conversationError by mutableStateOf<TranslatorErrorState?>(null)
        private set

    // --- Local Translation History State (Room SQLite) ---
    var historyRecords by mutableStateOf<List<LocalTranslationRecord>>(emptyList())
        private set
    var historyError by mutableStateOf<String?>(null)
        private set
    private var historyObserverJob: Job? = null

    private var textJob: Job? = null
    private var cameraJob: Job? = null
    private var voiceJob: Job? = null
    private var conversationJob: Job? = null

    fun selectTab(tab: TranslatorTab) {
        activeTab = tab
    }

    fun ensureHistoryLoaded(context: Context, forceRestart: Boolean = false) {
        if (historyObserverJob != null && !forceRestart) return
        historyObserverJob?.cancel()
        val repository = LocalHistoryRepository(context.applicationContext)
        historyObserverJob = viewModelScope.launch {
            repository.observeTranslationHistory().collect { feed ->
                historyRecords = feed.items
                if (feed.errorDetail != null) {
                    historyError = feed.errorDetail
                } else {
                    historyError = null
                }
            }
        }
    }

    fun dismissHistoryError() {
        historyError = null
    }

    // --- Text Actions ---
    fun updateSourceLanguage(language: TranslatorLanguage) {
        sourceLanguage = language
        textError = null
    }

    fun updateTargetLanguage(language: TranslatorLanguage) {
        targetLanguage = language
        textError = null
    }

    fun updateInputText(value: String) {
        inputText = value
        if (textError != null) textError = null
    }

    fun swapTextLanguages() {
        val (nextSource, nextTarget) = TranslationTextPolicy.resolveSwappedLanguages(
            currentSource = sourceLanguage,
            currentTarget = targetLanguage,
            detectedSourceName = textResult?.detectedSourceLanguage
        )
        sourceLanguage = nextSource
        targetLanguage = nextTarget

        val previousTranslation = textResult?.translatedText
        if (!previousTranslation.isNullOrBlank()) {
            inputText = previousTranslation
            textResult = null
        }
        textError = null
    }

    fun clearTextTranslation() {
        textJob?.cancel()
        inputText = ""
        textResult = null
        textError = null
        isTranslatingText = false
    }

    fun translateText(context: Context) {
        val validated = when (val check = TranslationTextPolicy.validateInput(inputText)) {
            TextInputValidation.Empty -> {
                textError = TranslatorErrorState(TranslationErrorType.EMPTY_INPUT)
                return
            }

            is TextInputValidation.TooLong -> {
                // Preserve the user's typed text intact so they can edit it cleanly
                textError = TranslatorErrorState(
                    TranslationErrorType.TEXT_TOO_LONG,
                    "Text length (${check.actualLength}) exceeds ${check.maxLength} characters."
                )
                return
            }

            is TextInputValidation.Valid -> check
        }

        if (!NetworkConnectivityHelper.isOnline(context)) {
            // Preserve inputText on network failure
            textError = TranslatorErrorState(TranslationErrorType.NETWORK)
            return
        }

        textJob?.cancel()
        isTranslatingText = true
        textError = null

        val repo = GeminiTranslatorRepository(context.applicationContext)
        val historyRepository = LocalHistoryRepository(context.applicationContext)
        ensureHistoryLoaded(context.applicationContext)
        val currentSource = sourceLanguage
        val currentTarget = targetLanguage

        textJob = viewModelScope.launch {
            when (val res = repo.translateText(validated.cleanedText, currentSource, currentTarget)) {
                is TranslationCallResult.Success -> {
                    textResult = res.data
                    isTranslatingText = false
                    val record = LocalTranslationRecord(
                        id = UUID.randomUUID().toString(),
                        mode = "text",
                        sourceLanguageCode = currentSource.code,
                        sourceLanguageName = res.data.detectedSourceLanguage ?: currentSource.name,
                        targetLanguageCode = currentTarget.code,
                        targetLanguageName = currentTarget.name,
                        sourceText = res.data.sourceText,
                        translatedText = res.data.translatedText,
                        timestampMillis = System.currentTimeMillis()
                    )
                    val saveRes = historyRepository.saveTranslation(record)
                    if (saveRes is HistoryOperationResult.Error) {
                        historyError = saveRes.detail
                    }
                }

                is TranslationCallResult.Failure -> {
                    // User's inputText is intentionally preserved untouched so they can retry
                    isTranslatingText = false
                    textError = TranslatorErrorState(res.errorType, res.detail)
                }
            }
        }
    }

    // --- Camera Actions ---
    private fun cleanupCameraTempFile(context: Context?, image: SelectedScanImage?) {
        if (cameraImageOwnedByTranslator && context != null && image is SelectedScanImage.CameraUri) {
            CameraPhotoFileManager.deleteCaptureIfOwned(context.applicationContext, image.uri)
        }
    }

    fun setCameraGalleryUri(context: Context, uri: Uri, mimeType: String? = null) {
        cameraJob?.cancel()
        cleanupCameraTempFile(context, cameraImage)
        cameraImage = SelectedScanImage.GalleryUri(uri = uri, mimeType = mimeType)
        cameraImageOwnedByTranslator = false
        cameraResult = null
        cameraError = null
        isTranslatingCamera = false
    }

    fun setCameraUri(context: Context, uri: Uri) {
        cameraJob?.cancel()
        if ((cameraImage as? SelectedScanImage.CameraUri)?.uri != uri) {
            cleanupCameraTempFile(context, cameraImage)
        }
        cameraImage = SelectedScanImage.CameraUri(uri)
        cameraImageOwnedByTranslator = true
        cameraResult = null
        cameraError = null
        isTranslatingCamera = false
    }

    /**
     * Reuses the image currently loaded in the Smart Scanner without taking ownership
     * of the Scanner's temporary capture file so clearing Translator never breaks Scanner.
     */
    fun importScannerImage(context: Context, scannerImage: SelectedScanImage) {
        cameraJob?.cancel()
        cleanupCameraTempFile(context, cameraImage)
        cameraImage = scannerImage
        cameraImageOwnedByTranslator = false
        cameraResult = null
        cameraError = null
        isTranslatingCamera = false
    }

    fun setCameraPreviewBitmap(bitmap: Bitmap) {
        cameraJob?.cancel()
        cameraImage = SelectedScanImage.CameraPreviewBitmap(bitmap)
        cameraImageOwnedByTranslator = false
        cameraResult = null
        cameraError = null
        isTranslatingCamera = false
    }

    fun clearCameraImage(context: Context? = null) {
        cameraJob?.cancel()
        cleanupCameraTempFile(context, cameraImage)
        cameraImage = null
        cameraImageOwnedByTranslator = false
        cameraResult = null
        cameraError = null
        isTranslatingCamera = false
    }

    fun updateCameraTargetLanguage(language: TranslatorLanguage) {
        cameraTargetLanguage = language
        cameraError = null
    }

    fun translateCameraImage(context: Context) {
        val currentImg = cameraImage ?: run {
            cameraError = TranslatorErrorState(TranslationErrorType.INVALID_IMAGE)
            return
        }

        if (!NetworkConnectivityHelper.isOnline(context)) {
            cameraError = TranslatorErrorState(TranslationErrorType.NETWORK)
            return
        }

        cameraJob?.cancel()
        isTranslatingCamera = true
        cameraError = null
        cameraResult = null

        val repo = GeminiTranslatorRepository(context.applicationContext)
        val historyRepository = LocalHistoryRepository(context.applicationContext)
        ensureHistoryLoaded(context.applicationContext)
        val target = cameraTargetLanguage

        cameraJob = viewModelScope.launch {
            when (val res = repo.extractAndTranslateImage(currentImg, target)) {
                is TranslationCallResult.Success -> {
                    cameraResult = res.data
                    isTranslatingCamera = false
                    if (res.data.hasReadableText && res.data.translatedText.isNotBlank()) {
                        val record = LocalTranslationRecord(
                            id = UUID.randomUUID().toString(),
                            mode = "camera",
                            sourceLanguageCode = "auto",
                            sourceLanguageName = res.data.detectedSourceLanguage ?: "Detected text",
                            targetLanguageCode = target.code,
                            targetLanguageName = target.name,
                            sourceText = res.data.extractedText,
                            translatedText = res.data.translatedText,
                            timestampMillis = System.currentTimeMillis()
                        )
                        val saveRes = historyRepository.saveTranslation(record)
                        if (saveRes is HistoryOperationResult.Error) {
                            historyError = saveRes.detail
                        }
                    }
                }

                is TranslationCallResult.Failure -> {
                    isTranslatingCamera = false
                    cameraError = TranslatorErrorState(res.errorType, res.detail)
                }
            }
        }
    }

    // --- Voice Actions ---
    fun updateVoiceSourceLanguage(language: TranslatorLanguage) {
        voiceSourceLanguage = language
        voiceError = null
    }

    fun updateVoiceTargetLanguage(language: TranslatorLanguage) {
        voiceTargetLanguage = language
        voiceError = null
    }

    fun swapVoiceLanguages() {
        val temp = voiceSourceLanguage
        voiceSourceLanguage = voiceTargetLanguage
        voiceTargetLanguage = temp
        voiceError = null
    }

    fun updateVoiceTranscript(transcript: String) {
        voiceTranscript = transcript
    }

    fun clearVoiceTranslation() {
        voiceJob?.cancel()
        voiceTranscript = ""
        voiceResult = null
        voiceError = null
        isTranslatingVoice = false
    }

    fun translateVoiceTranscript(context: Context, transcript: String, onTranslated: ((String) -> Unit)? = null) {
        val cleaned = transcript.trim()
        voiceTranscript = cleaned
        if (cleaned.isEmpty()) return

        if (!NetworkConnectivityHelper.isOnline(context)) {
            voiceError = TranslatorErrorState(TranslationErrorType.NETWORK)
            return
        }

        voiceJob?.cancel()
        isTranslatingVoice = true
        voiceError = null

        val repo = GeminiTranslatorRepository(context.applicationContext)
        val historyRepository = LocalHistoryRepository(context.applicationContext)
        ensureHistoryLoaded(context.applicationContext)
        val src = voiceSourceLanguage
        val tgt = voiceTargetLanguage

        voiceJob = viewModelScope.launch {
            when (val res = repo.translateText(cleaned, src, tgt)) {
                is TranslationCallResult.Success -> {
                    voiceResult = res.data
                    isTranslatingVoice = false
                    val record = LocalTranslationRecord(
                        id = UUID.randomUUID().toString(),
                        mode = "voice",
                        sourceLanguageCode = src.code,
                        sourceLanguageName = res.data.detectedSourceLanguage ?: src.name,
                        targetLanguageCode = tgt.code,
                        targetLanguageName = tgt.name,
                        sourceText = res.data.sourceText,
                        translatedText = res.data.translatedText,
                        timestampMillis = System.currentTimeMillis()
                    )
                    val saveRes = historyRepository.saveTranslation(record)
                    if (saveRes is HistoryOperationResult.Error) {
                        historyError = saveRes.detail
                    }
                    onTranslated?.invoke(res.data.translatedText)
                }

                is TranslationCallResult.Failure -> {
                    isTranslatingVoice = false
                    voiceError = TranslatorErrorState(res.errorType, res.detail)
                }
            }
        }
    }

    // --- Conversation Actions ---
    fun updatePersonALanguage(language: TranslatorLanguage) {
        personALanguage = language
        conversationError = null
    }

    fun updatePersonBLanguage(language: TranslatorLanguage) {
        personBLanguage = language
        conversationError = null
    }

    fun clearConversation() {
        conversationJob?.cancel()
        conversationTurns = emptyList()
        conversationError = null
        isTranslatingConversation = false
    }

    fun sendConversationUtterance(
        context: Context,
        isPersonA: Boolean,
        spokenText: String,
        speakerLabel: String,
        onTranslated: ((String, String) -> Unit)? = null
    ) {
        val cleaned = spokenText.trim()
        if (cleaned.isEmpty()) return

        if (!NetworkConnectivityHelper.isOnline(context)) {
            conversationError = TranslatorErrorState(TranslationErrorType.NETWORK)
            return
        }

        val src = if (isPersonA) personALanguage else personBLanguage
        val tgt = if (isPersonA) personBLanguage else personALanguage

        conversationJob?.cancel()
        isTranslatingConversation = true
        conversationError = null

        val repo = GeminiTranslatorRepository(context.applicationContext)
        val historyRepository = LocalHistoryRepository(context.applicationContext)
        ensureHistoryLoaded(context.applicationContext)

        conversationJob = viewModelScope.launch {
            when (val res = repo.translateText(cleaned, src, tgt)) {
                is TranslationCallResult.Success -> {
                    val turn = ConversationTurn(
                        id = UUID.randomUUID().toString(),
                        speakerLabel = speakerLabel,
                        isPersonA = isPersonA,
                        sourceLanguageCode = src.code,
                        sourceLanguageName = src.name,
                        targetLanguageCode = tgt.code,
                        targetLanguageName = tgt.name,
                        targetSpeechLocale = tgt.speechLocaleTag,
                        originalText = res.data.sourceText,
                        translatedText = res.data.translatedText
                    )
                    conversationTurns = conversationTurns + turn
                    isTranslatingConversation = false
                    val record = LocalTranslationRecord(
                        id = UUID.randomUUID().toString(),
                        mode = "conversation",
                        sourceLanguageCode = src.code,
                        sourceLanguageName = src.name,
                        targetLanguageCode = tgt.code,
                        targetLanguageName = tgt.name,
                        sourceText = res.data.sourceText,
                        translatedText = res.data.translatedText,
                        timestampMillis = System.currentTimeMillis()
                    )
                    val saveRes = historyRepository.saveTranslation(record)
                    if (saveRes is HistoryOperationResult.Error) {
                        historyError = saveRes.detail
                    }
                    onTranslated?.invoke(res.data.translatedText, tgt.speechLocaleTag)
                }

                is TranslationCallResult.Failure -> {
                    isTranslatingConversation = false
                    conversationError = TranslatorErrorState(res.errorType, res.detail)
                }
            }
        }
    }

    // --- History Actions ---
    fun reuseHistoryRecord(record: LocalTranslationRecord) {
        sourceLanguage = TranslatorLanguages.findByCode(record.sourceLanguageCode)
        targetLanguage = TranslatorLanguages.findByCode(record.targetLanguageCode)
        inputText = record.sourceText
        textResult = TextTranslationOutput(
            sourceText = record.sourceText,
            translatedText = record.translatedText,
            detectedSourceLanguage = record.sourceLanguageName,
            targetLanguageName = record.targetLanguageName,
            modelName = GeminiTranslatorRepository.GEMINI_TRANSLATOR_MODEL
        )
        textError = null
        activeTab = TranslatorTab.TEXT
    }

    fun deleteHistoryRecord(context: Context, id: String) {
        val historyRepository = LocalHistoryRepository(context.applicationContext)
        viewModelScope.launch {
            when (val res = historyRepository.deleteTranslation(id)) {
                HistoryOperationResult.Success -> historyError = null
                is HistoryOperationResult.Error -> historyError = res.detail
            }
        }
    }

    fun clearAllHistory(context: Context) {
        val historyRepository = LocalHistoryRepository(context.applicationContext)
        viewModelScope.launch {
            when (val res = historyRepository.clearAllTranslations()) {
                HistoryOperationResult.Success -> historyError = null
                is HistoryOperationResult.Error -> historyError = res.detail
            }
        }
    }
}
