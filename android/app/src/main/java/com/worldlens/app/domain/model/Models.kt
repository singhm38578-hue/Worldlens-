package com.worldlens.app.domain.model

import android.graphics.Bitmap
import android.net.Uri

enum class AppLanguage(val code: String, val displayName: String) {
    ENGLISH("en", "English"),
    HINDI("hi", "हिन्दी (Hindi)")
}

/**
 * Shared selected-image state used across Gallery selection and Camera capture.
 * - [GalleryUri]: Image selected via Android Photo Picker (or GetContent fallback)
 * - [CameraUri]: Full-resolution photo captured via TakePicture + private FileProvider
 * - [CameraPreviewBitmap]: Fallback in-memory preview Bitmap if needed
 */
sealed interface SelectedScanImage {
    data class GalleryUri(val uri: Uri, val mimeType: String? = null) : SelectedScanImage
    data class CameraUri(val uri: Uri) : SelectedScanImage
    data class CameraPreviewBitmap(val bitmap: Bitmap) : SelectedScanImage
}

data class LocalizedCopy(
    val en: String,
    val hi: String
) {
    fun resolve(language: AppLanguage): String = when (language) {
        AppLanguage.ENGLISH -> en
        AppLanguage.HINDI -> hi
    }
}

enum class ScanAnalysisError {
    NETWORK,
    QUOTA_EXCEEDED,
    INVALID_IMAGE,
    AI_UNAVAILABLE,
    UNKNOWN
}

data class VisualRecognitionReport(
    val objectName: String,
    val category: String,
    val explanation: String,
    val characteristics: List<String>,
    val usefulFacts: List<String>,
    val confidenceLevel: String,
    val confidenceExplanation: String
)

sealed interface AiAnalysisUiState {
    data object Idle : AiAnalysisUiState
    data object Loading : AiAnalysisUiState
    data class Success(
        val report: VisualRecognitionReport,
        val language: AppLanguage,
        val modelName: String
    ) : AiAnalysisUiState

    data class Error(
        val errorType: ScanAnalysisError,
        val technicalDetail: String? = null
    ) : AiAnalysisUiState
}

/**
 * On-device persisted scan record stored in Room (SQLite).
 * Stores structured recognition text, user-selected language, timestamp, and an optional
 * compact private thumbnail path strictly on-device — never uploaded to cloud storage.
 */
data class LocalScanHistoryItem(
    val id: String,
    val report: VisualRecognitionReport,
    val languageCode: String,
    val modelName: String,
    val sourceLabel: String,
    val timestampMillis: Long,
    val thumbnailPath: String? = null
)

