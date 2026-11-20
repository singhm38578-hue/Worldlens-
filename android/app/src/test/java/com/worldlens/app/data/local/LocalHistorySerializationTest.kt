package com.worldlens.app.data.local

import com.worldlens.app.domain.model.AppLanguage
import com.worldlens.app.domain.model.LocalScanHistoryItem
import com.worldlens.app.domain.model.LocalTranslationRecord
import com.worldlens.app.domain.model.VisualRecognitionReport
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class LocalHistorySerializationTest {

    @Test
    fun encodeAndDecodeStringList_preservesItems() {
        val original = listOf(
            "Red sandstone honeycomb facade",
            "953 carved jharokha windows",
            "Five-story pyramidal elevation"
        )
        val encoded = encodeStringList(original)
        val decoded = decodeStringList(encoded)
        assertEquals(original, decoded)
    }

    @Test
    fun decodeStringList_handlesBlankAndMalformedJsonSafely() {
        assertTrue(decodeStringList("").isEmpty())
        assertTrue(decodeStringList("not-valid-json").isEmpty())
    }

    @Test
    fun formatDateTime_returnsNonEmptyStringForEnglishAndHindi() {
        val sampleTimestamp = 1_740_000_000_000L
        val enFormatted = LocalHistoryDateFormatter.formatDateTime(sampleTimestamp, AppLanguage.ENGLISH)
        val hiFormatted = LocalHistoryDateFormatter.formatDateTime(sampleTimestamp, AppLanguage.HINDI)
        assertTrue(enFormatted.isNotBlank())
        assertTrue(hiFormatted.isNotBlank())
    }

    @Test
    fun scanHistoryEntityMapping_preservesLanguageTimestampAndOptionalThumbnailPath() {
        val item = LocalScanHistoryItem(
            id = "scan-001",
            report = VisualRecognitionReport(
                objectName = "Tulsi Plant",
                category = "Plant",
                explanation = "Aromatic culinary and medicinal herb common in South Asia.",
                characteristics = listOf("Serrated green leaves"),
                usefulFacts = listOf("Member of the mint family"),
                confidenceLevel = "high",
                confidenceExplanation = "Leaf margins and stem structure are clearly visible."
            ),
            languageCode = "hi",
            modelName = "gemini-2.5-flash",
            sourceLabel = "camera",
            timestampMillis = 1_740_001_000_000L,
            thumbnailPath = "/data/user/0/com.worldlens.app/files/scan_thumbnails/scan-001.jpg"
        )

        val roundTrip = item.toEntity().toDomain()
        assertEquals(item, roundTrip)

        val withoutThumbnail = item.copy(thumbnailPath = null).toEntity().toDomain()
        assertNull(withoutThumbnail.thumbnailPath)
    }

    @Test
    fun translationHistoryEntityMapping_preservesAllRequiredFields() {
        val record = LocalTranslationRecord(
            id = "tr-001",
            mode = "text",
            sourceLanguageCode = "hi",
            sourceLanguageName = "Hindi",
            targetLanguageCode = "en",
            targetLanguageName = "English",
            sourceText = "दुनिया देखें और सब कुछ समझें।",
            translatedText = "See the world and understand everything.",
            timestampMillis = 1_740_002_000_000L
        )
        assertEquals(record, record.toEntity().toDomain())
    }

    @Test
    fun languageFormatter_formatsEnglishAndHindiLabelsCleanly() {
        assertEquals("English", LocalHistoryLanguageFormatter.formatLanguageLabel("en", AppLanguage.ENGLISH))
        assertEquals("Hindi", LocalHistoryLanguageFormatter.formatLanguageLabel("hi", AppLanguage.ENGLISH))
        assertEquals("हिन्दी", LocalHistoryLanguageFormatter.formatLanguageLabel("hi", AppLanguage.HINDI))
        assertEquals("अंग्रेज़ी", LocalHistoryLanguageFormatter.formatLanguageLabel("en", AppLanguage.HINDI))
    }

    @Test
    fun thumbnailFileIdSanitizer_blocksPathTraversalCharacters() {
        val sanitized = ScanThumbnailStorage.sanitizeFileId("../secret/scan 123")
        assertTrue(!sanitized.contains("/"))
        assertTrue(!sanitized.contains(".."))
        assertTrue(sanitized.contains("scan_123"))
    }

    @Test
    fun databaseMigration_upgradesSchemaFromV1ToV2() {
        assertEquals(1, WorldLensDatabase.MIGRATION_1_2.startVersion)
        assertEquals(2, WorldLensDatabase.MIGRATION_1_2.endVersion)
    }
}
