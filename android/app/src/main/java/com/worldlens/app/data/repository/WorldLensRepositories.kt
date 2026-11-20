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
import com.worldlens.app.domain.model.AppLanguage
import com.worldlens.app.domain.model.ScanAnalysisError
import com.worldlens.app.domain.model.SelectedScanImage
import com.worldlens.app.domain.model.VisualRecognitionReport
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.net.SocketTimeoutException
import java.net.UnknownHostException

sealed interface VisualAnalysisResult {
    data class Success(
        val report: VisualRecognitionReport,
        val modelName: String
    ) : VisualAnalysisResult

    data class Failure(
        val errorType: ScanAnalysisError,
        val detail: String? = null
    ) : VisualAnalysisResult
}

interface VisualIntelligenceRepository {
    val isLiveAiConfigured: Boolean
    suspend fun analyzeImage(
        selectedImage: SelectedScanImage,
        language: AppLanguage
    ): VisualAnalysisResult
}

/**
 * Real Gemini visual intelligence repository backed by Firebase AI Logic
 * using the Google AI Gemini Developer API backend (GenerativeBackend.googleAI()).
 *
 * Security: No raw Gemini Developer API key is stored in Kotlin code, BuildConfig,
 * resources, or APK. Authentication and abuse protection flow through Firebase project
 * configuration (google-services.json) and Firebase App Check.
 */
class FirebaseGeminiVisualRepository(
    private val appContext: Context
) : VisualIntelligenceRepository {

    override val isLiveAiConfigured: Boolean
        get() = WorldLensApplication.isFirebaseConfigured

    override suspend fun analyzeImage(
        selectedImage: SelectedScanImage,
        language: AppLanguage
    ): VisualAnalysisResult = withContext(Dispatchers.IO) {
        if (!WorldLensApplication.isFirebaseConfigured) {
            return@withContext VisualAnalysisResult.Failure(
                errorType = ScanAnalysisError.AI_UNAVAILABLE,
                detail = "Firebase is not configured yet (missing google-services.json)."
            )
        }

        val decoded = try {
            SafeBitmapDecoder.decodeForAnalysis(appContext, selectedImage)
        } catch (_: OutOfMemoryError) {
            return@withContext VisualAnalysisResult.Failure(
                errorType = ScanAnalysisError.INVALID_IMAGE,
                detail = "Image exceeded available decoding memory."
            )
        } catch (e: Exception) {
            return@withContext VisualAnalysisResult.Failure(
                errorType = ScanAnalysisError.INVALID_IMAGE,
                detail = e.localizedMessage
            )
        }

        if (decoded == null) {
            return@withContext VisualAnalysisResult.Failure(
                errorType = ScanAnalysisError.INVALID_IMAGE,
                detail = "Unable to decode selected image into a valid Bitmap."
            )
        }

        try {
            val generativeModel = Firebase.ai(backend = GenerativeBackend.googleAI())
                .generativeModel(
                    modelName = GEMINI_VISION_MODEL,
                    generationConfig = generationConfig {
                        responseMimeType = "application/json"
                    },
                    systemInstruction = content {
                        text(WORLDLENS_SYSTEM_INSTRUCTION)
                    }
                )

            val languageInstruction = when (language) {
                AppLanguage.ENGLISH ->
                    """
                    Analyze this image and respond strictly in English as a valid JSON object with these exact keys:
                    - "objectName": string (specific name of the visible object, plant, animal, product, machine, or place; if unclear, honestly say it is uncertain rather than guessing)
                    - "category": string (e.g., Object, Plant, Animal, Product, Machine, Place, Document, or Uncertain)
                    - "explanation": string (clear explanation of what it is and its common purpose or use)
                    - "characteristics": array of strings (3 to 5 concise observable characteristics visible in the image)
                    - "usefulFacts": array of strings (2 to 4 accurate, practical facts)
                    - "confidenceLevel": string (one of: "high", "moderate", "low", "uncertain")
                    - "confidenceExplanation": string (explain clearly why confidence is at this level; if anything is uncertain, blurry, or obscured, explicitly say so and note what additional angle or detail would help)
                    """.trimIndent()

                AppLanguage.HINDI ->
                    """
                    इस छवि का विश्लेषण करें और सरल, स्पष्ट हिन्दी (देवनागरी) में केवल एक मान्य JSON ऑब्जेक्ट के रूप में उत्तर दें जिसमें ये सटीक कुंजियाँ हों:
                    - "objectName": string (दिखाई देने वाली वस्तु, पौधा, जानवर, उत्पाद, मशीन या स्थान का नाम; यदि स्पष्ट न हो तो अनुमान लगाने के बजाय ईमानदारी से अनिश्चित बताएं)
                    - "category": string (जैसे: वस्तु, पौधा, जानवर, उत्पाद, मशीन, स्थान या अनिश्चित)
                    - "explanation": string (यह क्या है और इसका सामान्य उपयोग क्या है, इसकी स्पष्ट व्याख्या)
                    - "characteristics": array of strings (छवि में दिखने वाली 3 से 5 मुख्य विशेषताएँ)
                    - "usefulFacts": array of strings (2 से 4 उपयोगी और सटीक तथ्य)
                    - "confidenceLevel": string (केवल इनमें से एक: "high", "moderate", "low", "uncertain")
                    - "confidenceExplanation": string (स्पष्ट करें कि विश्वास स्तर ऐसा क्यों है; यदि कुछ धुंधला या अस्पष्ट है तो साफ बताएं कि कौन-सी अतिरिक्त फ़ोटो या जानकारी मदद करेगी)
                    """.trimIndent()
            }

            val promptContent = content {
                image(decoded.bitmap)
                text(languageInstruction)
            }

            val response = generativeModel.generateContent(promptContent)
            val responseText = response.text?.trim()

            if (responseText.isNullOrEmpty()) {
                VisualAnalysisResult.Failure(
                    errorType = ScanAnalysisError.AI_UNAVAILABLE,
                    detail = "Gemini returned an empty response."
                )
            } else {
                val report = parseRecognitionReport(responseText)
                    ?: return@withContext VisualAnalysisResult.Failure(
                        errorType = ScanAnalysisError.AI_UNAVAILABLE,
                        detail = "Gemini returned an unreadable analysis payload."
                    )
                VisualAnalysisResult.Success(
                    report = report,
                    modelName = GEMINI_VISION_MODEL
                )
            }
        } catch (e: QuotaExceededException) {
            VisualAnalysisResult.Failure(ScanAnalysisError.QUOTA_EXCEEDED, e.localizedMessage)
        } catch (e: ServiceDisabledException) {
            VisualAnalysisResult.Failure(ScanAnalysisError.AI_UNAVAILABLE, e.localizedMessage)
        } catch (e: InvalidAPIKeyException) {
            VisualAnalysisResult.Failure(ScanAnalysisError.AI_UNAVAILABLE, e.localizedMessage)
        } catch (e: ServerException) {
            VisualAnalysisResult.Failure(ScanAnalysisError.AI_UNAVAILABLE, e.localizedMessage)
        } catch (e: FirebaseAIException) {
            val message = e.localizedMessage.orEmpty()
            val mappedType = when {
                message.contains("429", ignoreCase = true) ||
                    message.contains("quota", ignoreCase = true) ||
                    message.contains("RESOURCE_EXHAUSTED", ignoreCase = true) ->
                    ScanAnalysisError.QUOTA_EXCEEDED

                message.contains("network", ignoreCase = true) ||
                    message.contains("Unable to resolve host", ignoreCase = true) ||
                    message.contains("timeout", ignoreCase = true) ->
                    ScanAnalysisError.NETWORK

                else -> ScanAnalysisError.AI_UNAVAILABLE
            }
            VisualAnalysisResult.Failure(mappedType, message)
        } catch (e: UnknownHostException) {
            VisualAnalysisResult.Failure(ScanAnalysisError.NETWORK, e.localizedMessage)
        } catch (e: SocketTimeoutException) {
            VisualAnalysisResult.Failure(ScanAnalysisError.NETWORK, e.localizedMessage)
        } catch (e: IOException) {
            VisualAnalysisResult.Failure(ScanAnalysisError.NETWORK, e.localizedMessage)
        } catch (e: IllegalStateException) {
            VisualAnalysisResult.Failure(ScanAnalysisError.AI_UNAVAILABLE, e.localizedMessage)
        } catch (e: Exception) {
            VisualAnalysisResult.Failure(ScanAnalysisError.UNKNOWN, e.localizedMessage)
        } finally {
            if (decoded.shouldRecycleAfterUse && !decoded.bitmap.isRecycled) {
                decoded.bitmap.recycle()
            }
        }
    }

    private fun parseRecognitionReport(raw: String): VisualRecognitionReport? {
        return try {
            val cleaned = raw
                .removePrefix("```json")
                .removePrefix("```")
                .removeSuffix("```")
                .trim()
            val obj = JSONObject(cleaned)
            val objectName = obj.optString("objectName").trim()
            val explanation = obj.optString("explanation").trim()
            if (objectName.isEmpty() && explanation.isEmpty()) return null

            val category = obj.optString("category").trim().ifBlank { "General" }
            val confidenceLevel = obj.optString("confidenceLevel").trim().lowercase()
                .takeIf { it in setOf("high", "moderate", "low", "uncertain") } ?: "moderate"
            val confidenceExplanation = obj.optString("confidenceExplanation").trim()
            val characteristics = jsonArrayToStrings(obj.optJSONArray("characteristics"))
            val usefulFacts = jsonArrayToStrings(obj.optJSONArray("usefulFacts"))

            VisualRecognitionReport(
                objectName = objectName.ifBlank { "Uncertain Subject" },
                category = category,
                explanation = explanation,
                characteristics = characteristics,
                usefulFacts = usefulFacts,
                confidenceLevel = confidenceLevel,
                confidenceExplanation = confidenceExplanation
            )
        } catch (_: Exception) {
            null
        }
    }

    private fun jsonArrayToStrings(array: JSONArray?): List<String> {
        if (array == null) return emptyList()
        return buildList {
            for (i in 0 until array.length()) {
                val value = array.optString(i).trim()
                if (value.isNotEmpty()) add(value)
            }
        }
    }

    companion object {
        const val GEMINI_VISION_MODEL = "gemini-2.5-flash"

        const val WORLDLENS_SYSTEM_INSTRUCTION =
            "You are WorldLens, a careful global visual intelligence assistant. " +
                "Identify visible objects, plants, animals, products, machines, and places accurately. " +
                "Return object name, category, clear explanation, observable characteristics, useful facts, and an honest confidence/uncertainty explanation. " +
                "If identification is uncertain, clearly say so and explain what additional image or information would help. " +
                "Never invent or fabricate identifications or facts. Do not make unsafe medical, electrical, or mechanical claims."
    }
}
