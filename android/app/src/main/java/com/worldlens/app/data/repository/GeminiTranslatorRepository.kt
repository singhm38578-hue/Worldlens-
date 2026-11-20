package com.worldlens.app.data.repository

import android.content.Context
import com.google.firebase.Firebase
import com.google.firebase.ai.ai
import com.google.firebase.ai.type.FirebaseAIException
import com.google.firebase.ai.type.GenerativeBackend
import com.google.firebase.ai.type.InvalidAPIKeyException
import com.google.firebase.ai.type.QuotaExceededException
import com.google.firebase.ai.type.ServerException
import com.google.firebase.ai.type.ServiceDisabledException
import com.google.firebase.ai.type.content
import com.google.firebase.ai.type.generationConfig
import com.worldlens.app.WorldLensApplication
import com.worldlens.app.data.image.SafeBitmapDecoder
import com.worldlens.app.domain.model.CameraTranslationOutput
import com.worldlens.app.domain.model.SelectedScanImage
import com.worldlens.app.domain.model.TextTranslationOutput
import com.worldlens.app.domain.model.TranslationErrorType
import com.worldlens.app.domain.model.TranslatorLanguage
import com.worldlens.app.domain.model.TranslatorLanguages
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.IOException
import java.net.SocketTimeoutException
import java.net.UnknownHostException

sealed interface TranslationCallResult<out T> {
    data class Success<T>(val data: T) : TranslationCallResult<T>
    data class Failure(
        val errorType: TranslationErrorType,
        val detail: String? = null
    ) : TranslationCallResult<Nothing>
}

/**
 * Real Gemini Translator repository powered by Firebase AI Logic
 * (GenerativeBackend.googleAI()). Never hardcodes API keys or fabricates translations.
 */
class GeminiTranslatorRepository(
    private val appContext: Context
) {
    suspend fun translateText(
        text: String,
        sourceLanguage: TranslatorLanguage,
        targetLanguage: TranslatorLanguage
    ): TranslationCallResult<TextTranslationOutput> = withContext(Dispatchers.IO) {
        val validated = when (val check = TranslationTextPolicy.validateInput(text)) {
            TextInputValidation.Empty -> {
                return@withContext TranslationCallResult.Failure(
                    TranslationErrorType.EMPTY_INPUT,
                    "Please enter text to translate."
                )
            }

            is TextInputValidation.TooLong -> {
                return@withContext TranslationCallResult.Failure(
                    TranslationErrorType.TEXT_TOO_LONG,
                    "Text length (${check.actualLength}) exceeds the ${check.maxLength}-character limit."
                )
            }

            is TextInputValidation.Valid -> check
        }

        if (!WorldLensApplication.isFirebaseConfigured) {
            return@withContext TranslationCallResult.Failure(
                TranslationErrorType.AI_UNAVAILABLE,
                "Firebase AI Logic is not yet configured (missing google-services.json)."
            )
        }

        try {
            val model = Firebase.ai(backend = GenerativeBackend.googleAI())
                .generativeModel(
                    modelName = GEMINI_TRANSLATOR_MODEL,
                    generationConfig = generationConfig {
                        responseMimeType = "application/json"
                    },
                    systemInstruction = content {
                        text(TEXT_TRANSLATION_SYSTEM_PROMPT)
                    }
                )

            val sourceDirective = if (sourceLanguage.code == TranslatorLanguages.AUTO_DETECT.code) {
                "Automatically detect the source language."
            } else {
                "Source language: ${sourceLanguage.name} (${sourceLanguage.code})."
            }

            var detectedLanguage: String? = null
            val translatedChunks = mutableListOf<String>()

            for (chunk in validated.chunks) {
                val prompt = """
                    $sourceDirective
                    Target language: ${targetLanguage.name} (${targetLanguage.code}).
                    Return strictly a JSON object with keys:
                    - "detectedLanguage": string (name of detected source language)
                    - "translatedText": string (accurate translation preserving meaning, context, tone, and line breaks/formatting)
                    - "supported": boolean (false only if the requested language pair cannot be reliably translated)
                    - "note": string (optional note if unsupported)

                    Text to translate:
                    $chunk
                """.trimIndent()

                val response = model.generateContent(prompt)
                val rawJson = response.text?.trim()
                    ?: return@withContext TranslationCallResult.Failure(
                        TranslationErrorType.AI_UNAVAILABLE,
                        "Gemini returned an empty translation response."
                    )

                val parsed = parseJsonObject(rawJson)
                val supported = parsed.optBoolean("supported", true)
                if (!supported) {
                    return@withContext TranslationCallResult.Failure(
                        TranslationErrorType.UNSUPPORTED_LANGUAGE,
                        parsed.optString("note").ifBlank { "Requested language is not supported." }
                    )
                }

                val chunkTranslated = parsed.optString("translatedText").trim()
                if (chunkTranslated.isEmpty()) {
                    return@withContext TranslationCallResult.Failure(
                        TranslationErrorType.AI_UNAVAILABLE,
                        "Translation text was empty."
                    )
                }

                if (detectedLanguage == null) {
                    detectedLanguage = parsed.optString("detectedLanguage").trim().ifBlank { null }
                }
                translatedChunks.add(chunkTranslated)
            }

            TranslationCallResult.Success(
                TextTranslationOutput(
                    sourceText = validated.cleanedText,
                    translatedText = translatedChunks.joinToString("\n\n"),
                    detectedSourceLanguage = detectedLanguage,
                    targetLanguageName = targetLanguage.name,
                    modelName = GEMINI_TRANSLATOR_MODEL
                )
            )
        } catch (e: Exception) {
            mapException(e)
        }
    }

    suspend fun extractAndTranslateImage(
        selectedImage: SelectedScanImage,
        targetLanguage: TranslatorLanguage
    ): TranslationCallResult<CameraTranslationOutput> = withContext(Dispatchers.IO) {
        if (!WorldLensApplication.isFirebaseConfigured) {
            return@withContext TranslationCallResult.Failure(
                TranslationErrorType.AI_UNAVAILABLE,
                "Firebase AI Logic is not yet configured (missing google-services.json)."
            )
        }

        val decoded = try {
            SafeBitmapDecoder.decodeForAnalysis(appContext, selectedImage)
        } catch (_: OutOfMemoryError) {
            return@withContext TranslationCallResult.Failure(
                TranslationErrorType.INVALID_IMAGE,
                "Image exceeded available decoding memory."
            )
        } catch (e: Exception) {
            return@withContext TranslationCallResult.Failure(
                TranslationErrorType.INVALID_IMAGE,
                e.localizedMessage
            )
        } ?: return@withContext TranslationCallResult.Failure(
            TranslationErrorType.INVALID_IMAGE,
            "Unable to decode selected image."
        )

        try {
            val model = Firebase.ai(backend = GenerativeBackend.googleAI())
                .generativeModel(
                    modelName = GEMINI_TRANSLATOR_MODEL,
                    generationConfig = generationConfig {
                        responseMimeType = "application/json"
                    },
                    systemInstruction = content {
                        text(CAMERA_TRANSLATION_SYSTEM_PROMPT)
                    }
                )

            val prompt = content {
                image(decoded.bitmap)
                text(
                    """
                    Extract all clearly legible visible text from this image and translate it into ${targetLanguage.name} (${targetLanguage.code}).
                    Never invent or guess blurry, obscured, or missing text.
                    Return strictly a JSON object with keys:
                    - "hasReadableText": boolean
                    - "detectedLanguage": string
                    - "extractedText": string (verbatim visible text preserving line breaks; empty if unreadable)
                    - "translatedText": string (accurate translation into ${targetLanguage.name}; empty if unreadable)
                    - "readabilityNote": string (note explaining if part or all of the text was blurry or unreadable)
                    """.trimIndent()
                )
            }

            val response = model.generateContent(prompt)
            val rawJson = response.text?.trim()
                ?: return@withContext TranslationCallResult.Failure(
                    TranslationErrorType.AI_UNAVAILABLE,
                    "Gemini returned an empty image translation response."
                )

            val parsed = parseJsonObject(rawJson)
            val hasReadableText = parsed.optBoolean("hasReadableText", false)
            val extracted = parsed.optString("extractedText").trim()
            val translated = parsed.optString("translatedText").trim()
            val detected = parsed.optString("detectedLanguage").trim().ifBlank { null }
            val note = parsed.optString("readabilityNote").trim().ifBlank { null }

            TranslationCallResult.Success(
                CameraTranslationOutput(
                    extractedText = extracted,
                    translatedText = translated,
                    detectedSourceLanguage = detected,
                    hasReadableText = hasReadableText && extracted.isNotEmpty(),
                    readabilityNote = note,
                    targetLanguageName = targetLanguage.name,
                    modelName = GEMINI_TRANSLATOR_MODEL
                )
            )
        } catch (e: Exception) {
            mapException(e)
        } finally {
            if (decoded.shouldRecycleAfterUse && !decoded.bitmap.isRecycled) {
                decoded.bitmap.recycle()
            }
        }
    }

    private fun parseJsonObject(raw: String): JSONObject {
        val cleaned = raw
            .removePrefix("```json")
            .removePrefix("```")
            .removeSuffix("```")
            .trim()
        return JSONObject(cleaned)
    }

    private fun mapException(e: Exception): TranslationCallResult.Failure {
        return when (e) {
            is QuotaExceededException ->
                TranslationCallResult.Failure(TranslationErrorType.QUOTA_EXCEEDED, e.localizedMessage)

            is ServiceDisabledException,
            is InvalidAPIKeyException,
            is ServerException,
            is IllegalStateException,
            is org.json.JSONException ->
                TranslationCallResult.Failure(TranslationErrorType.AI_UNAVAILABLE, e.localizedMessage)

            is UnknownHostException,
            is SocketTimeoutException,
            is IOException ->
                TranslationCallResult.Failure(TranslationErrorType.NETWORK, e.localizedMessage)

            is FirebaseAIException -> {
                val msg = e.localizedMessage.orEmpty()
                val type = when {
                    msg.contains("429", ignoreCase = true) ||
                        msg.contains("quota", ignoreCase = true) ||
                        msg.contains("RESOURCE_EXHAUSTED", ignoreCase = true) ->
                        TranslationErrorType.QUOTA_EXCEEDED

                    msg.contains("network", ignoreCase = true) ||
                        msg.contains("timeout", ignoreCase = true) ->
                        TranslationErrorType.NETWORK

                    else -> TranslationErrorType.AI_UNAVAILABLE
                }
                TranslationCallResult.Failure(type, msg)
            }

            else -> TranslationCallResult.Failure(TranslationErrorType.UNKNOWN, e.localizedMessage)
        }
    }

    companion object {
        const val GEMINI_TRANSLATOR_MODEL = "gemini-2.5-flash"

        private const val TEXT_TRANSLATION_SYSTEM_PROMPT =
            "You are WorldLens Global AI Translator. Translate text accurately while preserving meaning, context, tone, punctuation, and line formatting. " +
                "Never add commentary inside the translated text. Never fabricate translations if the target language cannot be reliably produced."

        private const val CAMERA_TRANSLATION_SYSTEM_PROMPT =
            "You are WorldLens Camera Translator. Extract only text that is genuinely visible and legible in the image, then translate it accurately into the requested target language. " +
                "Never fabricate, guess, or hallucinate unreadable, blurred, or non-existent text. If no readable text exists, set hasReadableText to false."
    }
}
