package com.worldlens.app.data.local

import android.content.Context
import com.worldlens.app.domain.model.AppLanguage
import com.worldlens.app.domain.model.LocalScanHistoryItem
import com.worldlens.app.domain.model.LocalTranslationRecord
import com.worldlens.app.domain.model.VisualRecognitionReport
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext
import org.json.JSONArray
import java.text.DateFormat
import java.util.Date
import java.util.Locale

/**
 * Result wrapper for local SQLite/Room operations so database exceptions
 * (e.g., storage full, locked DB, corrupted file) are handled gracefully
 * without crashing the application.
 */
sealed interface HistoryOperationResult {
    data object Success : HistoryOperationResult
    data class Error(val detail: String) : HistoryOperationResult
}

data class HistoryFeedState<T>(
    val items: List<T>,
    val errorDetail: String? = null
)

/**
 * Local-only repository backed by AndroidX Room (SQLite) for Scan History and Translation History.
 *
 * Privacy & reliability guarantees:
 * - All scan results, optional compact thumbnails, and translations stay exclusively on this device.
 * - Nothing is uploaded to any cloud server.
 * - History persists reliably across app restarts.
 * - All Room reads/writes catch database exceptions gracefully.
 */
class LocalHistoryRepository(context: Context) {

    private val appContext = context.applicationContext
    private val database: WorldLensDatabase? = try {
        WorldLensDatabase.getInstance(appContext)
    } catch (_: Throwable) {
        null
    }

    fun observeScanHistory(): Flow<HistoryFeedState<LocalScanHistoryItem>> {
        val db = database ?: return kotlinx.coroutines.flow.flowOf(
            HistoryFeedState(emptyList(), "Local history database could not be opened.")
        )
        return db.scanHistoryDao()
            .observeAll()
            .map { rows ->
                HistoryFeedState(
                    items = rows.map { it.toDomain() },
                    errorDetail = null
                )
            }
            .catch { err ->
                emit(
                    HistoryFeedState(
                        items = emptyList(),
                        errorDetail = err.localizedMessage ?: "Unable to read local scan history."
                    )
                )
            }
    }

    suspend fun saveScan(item: LocalScanHistoryItem): HistoryOperationResult =
        withContext(Dispatchers.IO) {
            val db = database ?: return@withContext HistoryOperationResult.Error(
                "Local history database is unavailable."
            )
            try {
                db.scanHistoryDao().insert(item.toEntity())
                HistoryOperationResult.Success
            } catch (err: Throwable) {
                HistoryOperationResult.Error(
                    err.localizedMessage ?: "Could not save scan to local history."
                )
            }
        }

    suspend fun deleteScan(id: String): HistoryOperationResult =
        withContext(Dispatchers.IO) {
            val db = database ?: return@withContext HistoryOperationResult.Error(
                "Local history database is unavailable."
            )
            try {
                val thumbnailPath = db.scanHistoryDao().getThumbnailPathById(id)
                db.scanHistoryDao().deleteById(id)
                ScanThumbnailStorage.deleteThumbnailSafely(thumbnailPath)
                HistoryOperationResult.Success
            } catch (err: Throwable) {
                HistoryOperationResult.Error(
                    err.localizedMessage ?: "Could not delete scan from local history."
                )
            }
        }

    suspend fun clearAllScans(): HistoryOperationResult =
        withContext(Dispatchers.IO) {
            val db = database ?: return@withContext HistoryOperationResult.Error(
                "Local history database is unavailable."
            )
            try {
                db.scanHistoryDao().clearAll()
                ScanThumbnailStorage.clearAllThumbnailsSafely(appContext)
                HistoryOperationResult.Success
            } catch (err: Throwable) {
                HistoryOperationResult.Error(
                    err.localizedMessage ?: "Could not clear local scan history."
                )
            }
        }

    fun observeTranslationHistory(): Flow<HistoryFeedState<LocalTranslationRecord>> {
        val db = database ?: return kotlinx.coroutines.flow.flowOf(
            HistoryFeedState(emptyList(), "Local history database could not be opened.")
        )
        return db.translationHistoryDao()
            .observeAll()
            .map { rows ->
                HistoryFeedState(
                    items = rows.map { it.toDomain() },
                    errorDetail = null
                )
            }
            .catch { err ->
                emit(
                    HistoryFeedState(
                        items = emptyList(),
                        errorDetail = err.localizedMessage ?: "Unable to read local translation history."
                    )
                )
            }
    }

    suspend fun saveTranslation(record: LocalTranslationRecord): HistoryOperationResult =
        withContext(Dispatchers.IO) {
            val db = database ?: return@withContext HistoryOperationResult.Error(
                "Local history database is unavailable."
            )
            try {
                db.translationHistoryDao().insert(record.toEntity())
                HistoryOperationResult.Success
            } catch (err: Throwable) {
                HistoryOperationResult.Error(
                    err.localizedMessage ?: "Could not save translation to local history."
                )
            }
        }

    suspend fun deleteTranslation(id: String): HistoryOperationResult =
        withContext(Dispatchers.IO) {
            val db = database ?: return@withContext HistoryOperationResult.Error(
                "Local history database is unavailable."
            )
            try {
                db.translationHistoryDao().deleteById(id)
                HistoryOperationResult.Success
            } catch (err: Throwable) {
                HistoryOperationResult.Error(
                    err.localizedMessage ?: "Could not delete translation from local history."
                )
            }
        }

    suspend fun clearAllTranslations(): HistoryOperationResult =
        withContext(Dispatchers.IO) {
            val db = database ?: return@withContext HistoryOperationResult.Error(
                "Local history database is unavailable."
            )
            try {
                db.translationHistoryDao().clearAll()
                HistoryOperationResult.Success
            } catch (err: Throwable) {
                HistoryOperationResult.Error(
                    err.localizedMessage ?: "Could not clear local translation history."
                )
            }
        }
}

internal fun LocalScanHistoryItem.toEntity(): ScanHistoryEntity = ScanHistoryEntity(
    id = id,
    objectName = report.objectName,
    category = report.category,
    explanation = report.explanation,
    characteristicsJson = encodeStringList(report.characteristics),
    usefulFactsJson = encodeStringList(report.usefulFacts),
    confidenceLevel = report.confidenceLevel,
    confidenceExplanation = report.confidenceExplanation,
    languageCode = languageCode,
    modelName = modelName,
    sourceLabel = sourceLabel,
    createdAtMillis = timestampMillis,
    thumbnailPath = thumbnailPath
)

internal fun ScanHistoryEntity.toDomain(): LocalScanHistoryItem = LocalScanHistoryItem(
    id = id,
    report = VisualRecognitionReport(
        objectName = objectName,
        category = category,
        explanation = explanation,
        characteristics = decodeStringList(characteristicsJson),
        usefulFacts = decodeStringList(usefulFactsJson),
        confidenceLevel = confidenceLevel,
        confidenceExplanation = confidenceExplanation
    ),
    languageCode = languageCode,
    modelName = modelName,
    sourceLabel = sourceLabel,
    timestampMillis = createdAtMillis,
    thumbnailPath = thumbnailPath
)

internal fun LocalTranslationRecord.toEntity(): TranslationHistoryEntity = TranslationHistoryEntity(
    id = id,
    mode = mode,
    sourceLanguageCode = sourceLanguageCode,
    sourceLanguageName = sourceLanguageName,
    targetLanguageCode = targetLanguageCode,
    targetLanguageName = targetLanguageName,
    sourceText = sourceText,
    translatedText = translatedText,
    createdAtMillis = timestampMillis
)

internal fun TranslationHistoryEntity.toDomain(): LocalTranslationRecord = LocalTranslationRecord(
    id = id,
    mode = mode,
    sourceLanguageCode = sourceLanguageCode,
    sourceLanguageName = sourceLanguageName,
    targetLanguageCode = targetLanguageCode,
    targetLanguageName = targetLanguageName,
    sourceText = sourceText,
    translatedText = translatedText,
    timestampMillis = createdAtMillis
)

internal fun encodeStringList(items: List<String>): String {
    val array = JSONArray()
    items.forEach { array.put(it) }
    return array.toString()
}

internal fun decodeStringList(rawJson: String): List<String> {
    if (rawJson.isBlank()) return emptyList()
    return try {
        val array = JSONArray(rawJson)
        buildList {
            for (i in 0 until array.length()) {
                val value = array.optString(i).trim()
                if (value.isNotEmpty()) add(value)
            }
        }
    } catch (_: Exception) {
        emptyList()
    }
}

object LocalHistoryLanguageFormatter {
    fun formatLanguageLabel(languageCode: String, uiLanguage: AppLanguage): String {
        return when (languageCode.trim().lowercase(Locale.US)) {
            "hi" -> if (uiLanguage == AppLanguage.HINDI) "हिन्दी" else "Hindi"
            "en" -> if (uiLanguage == AppLanguage.HINDI) "अंग्रेज़ी" else "English"
            else -> languageCode.uppercase(Locale.US).ifBlank {
                if (uiLanguage == AppLanguage.HINDI) "अंग्रेज़ी" else "English"
            }
        }
    }
}

object LocalHistoryDateFormatter {
    fun formatDateTime(timestampMillis: Long, language: AppLanguage): String {
        val locale = when (language) {
            AppLanguage.ENGLISH -> Locale.ENGLISH
            AppLanguage.HINDI -> Locale("hi", "IN")
        }
        val formatter = DateFormat.getDateTimeInstance(DateFormat.MEDIUM, DateFormat.SHORT, locale)
        return formatter.format(Date(timestampMillis))
    }
}
