package com.worldlens.app.ui.translator

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import java.util.Locale

sealed interface SpeechInputOutcome {
    data class Transcript(val text: String) : SpeechInputOutcome
    data class Error(val reason: String) : SpeechInputOutcome
}

sealed interface TtsOutcome {
    data object Speaking : TtsOutcome
    data class Unavailable(val reason: String) : TtsOutcome
}

/**
 * Encapsulates Android SpeechRecognizer and TextToSpeech with explicit checks
 * for unsupported languages, missing voice packs, and safe lifecycle cleanup.
 */
class VoiceSpeechManager(
    private val context: Context
) {
    private var speechRecognizer: SpeechRecognizer? = null
    private var tts: TextToSpeech? = null
    private var ttsInitialized: Boolean = false

    init {
        tts = TextToSpeech(context.applicationContext) { status ->
            ttsInitialized = (status == TextToSpeech.SUCCESS)
        }
    }

    fun isSpeechRecognitionAvailable(): Boolean {
        return SpeechRecognizer.isRecognitionAvailable(context)
    }

    fun startListening(
        localeTag: String,
        onPartial: (String) -> Unit,
        onFinished: (SpeechInputOutcome) -> Unit
    ) {
        if (!isSpeechRecognitionAvailable()) {
            onFinished(
                SpeechInputOutcome.Error(
                    "Speech recognition service is not available on this device."
                )
            )
            return
        }

        stopListening()

        val recognizer = try {
            SpeechRecognizer.createSpeechRecognizer(context)
        } catch (_: Exception) {
            onFinished(
                SpeechInputOutcome.Error("Could not initialize Android SpeechRecognizer.")
            )
            return
        }

        speechRecognizer = recognizer
        recognizer.setRecognitionListener(
            object : RecognitionListener {
                override fun onReadyForSpeech(params: Bundle?) = Unit
                override fun onBeginningOfSpeech() = Unit
                override fun onRmsChanged(rmsdB: Float) = Unit
                override fun onBufferReceived(buffer: ByteArray?) = Unit
                override fun onEndOfSpeech() = Unit

                override fun onPartialResults(partialResults: Bundle?) {
                    val text = partialResults
                        ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                        ?.firstOrNull()
                        ?.trim()
                    if (!text.isNullOrEmpty()) {
                        onPartial(text)
                    }
                }

                override fun onResults(results: Bundle?) {
                    val transcript = results
                        ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                        ?.firstOrNull()
                        ?.trim()
                    if (transcript.isNullOrEmpty()) {
                        onFinished(
                            SpeechInputOutcome.Error("No speech was detected. Please try speaking again.")
                        )
                    } else {
                        onFinished(SpeechInputOutcome.Transcript(transcript))
                    }
                }

                override fun onError(error: Int) {
                    val message = when (error) {
                        SpeechRecognizer.ERROR_NO_MATCH -> "No speech recognized. Please speak clearly and try again."
                        SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "Listening timed out before speech was detected."
                        SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Microphone permission is required for voice input."
                        SpeechRecognizer.ERROR_NETWORK,
                        SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Speech recognition requires a working network connection."
                        SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED,
                        SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE -> "Selected speech recognition language is not supported on this device."
                        else -> "Speech recognition could not complete (code $error)."
                    }
                    onFinished(SpeechInputOutcome.Error(message))
                }

                override fun onEvent(eventType: Int, params: Bundle?) = Unit
            }
        )

        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            if (localeTag.isNotBlank()) {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, localeTag)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, localeTag)
            }
        }

        try {
            recognizer.startListening(intent)
        } catch (_: Exception) {
            onFinished(
                SpeechInputOutcome.Error("Unable to start microphone listening on this device.")
            )
        }
    }

    fun stopListening() {
        try {
            speechRecognizer?.stopListening()
            speechRecognizer?.destroy()
        } catch (_: Exception) {
            // Safe cleanup
        } finally {
            speechRecognizer = null
        }
    }

    fun speak(text: String, localeTag: String): TtsOutcome {
        val engine = tts
        if (!ttsInitialized || engine == null) {
            return TtsOutcome.Unavailable("Android Text-to-Speech engine is still initializing or unavailable.")
        }

        val locale = if (localeTag.isNotBlank()) {
            Locale.forLanguageTag(localeTag)
        } else {
            Locale.getDefault()
        }

        return when (engine.isLanguageAvailable(locale)) {
            TextToSpeech.LANG_MISSING_DATA ->
                TtsOutcome.Unavailable("Voice pack for ${locale.displayName} is not installed on this device.")

            TextToSpeech.LANG_NOT_SUPPORTED ->
                TtsOutcome.Unavailable("Text-to-Speech does not support ${locale.displayName} on this device.")

            else -> {
                engine.language = locale
                engine.speak(text, TextToSpeech.QUEUE_FLUSH, null, "worldlens_tts")
                TtsOutcome.Speaking
            }
        }
    }

    fun release() {
        stopListening()
        try {
            tts?.stop()
            tts?.shutdown()
        } catch (_: Exception) {
            // Safe cleanup
        } finally {
            tts = null
        }
    }
}
