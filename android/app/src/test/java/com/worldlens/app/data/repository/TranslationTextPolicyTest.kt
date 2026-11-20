package com.worldlens.app.data.repository

import com.worldlens.app.domain.model.TranslatorLanguages
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * JVM unit tests verifying WorldLens Global Translator input bounds,
 * long-text chunking (English & Hindi Devanagari), and language swap behavior.
 */
class TranslationTextPolicyTest {

    @Test
    fun rejectsEmptyAndWhitespaceOnlyInput() {
        assertEquals(TextInputValidation.Empty, TranslationTextPolicy.validateInput(""))
        assertEquals(TextInputValidation.Empty, TranslationTextPolicy.validateInput("   \n\t  "))
    }

    @Test
    fun rejectsTextExceedingMaximumCharacterLimit() {
        val oversized = "a".repeat(TranslationTextPolicy.MAX_INPUT_CHARS + 1)
        val result = TranslationTextPolicy.validateInput(oversized)
        assertTrue(result is TextInputValidation.TooLong)
        val tooLong = result as TextInputValidation.TooLong
        assertEquals(TranslationTextPolicy.MAX_INPUT_CHARS + 1, tooLong.actualLength)
        assertEquals(TranslationTextPolicy.MAX_INPUT_CHARS, tooLong.maxLength)
    }

    @Test
    fun acceptsShortEnglishAndHindiInputsInSingleChunk() {
        val en = TranslationTextPolicy.validateInput("See the World. Understand Everything.")
        assertTrue(en is TextInputValidation.Valid)
        assertEquals(1, (en as TextInputValidation.Valid).chunks.size)

        val hi = TranslationTextPolicy.validateInput("दुनिया देखें। सब कुछ समझें।")
        assertTrue(hi is TextInputValidation.Valid)
        assertEquals(1, (hi as TextInputValidation.Valid).chunks.size)
    }

    @Test
    fun splitsLongMultiParagraphTextSafelyWithinChunkBounds() {
        val para1 = "WorldLens helps people understand the world clearly. ".repeat(25).trim()
        val para2 = "दुनिया को स्पष्ट रूप से समझने में WorldLens मदद करता है। ".repeat(25).trim()
        val combined = "$para1\n\n$para2"

        val result = TranslationTextPolicy.validateInput(combined)
        assertTrue(result is TextInputValidation.Valid)
        val chunks = (result as TextInputValidation.Valid).chunks
        assertTrue("Expected multiple chunks for long text", chunks.size >= 2)
        chunks.forEach { chunk ->
            assertTrue("Chunk exceeded max size: ${chunk.length}", chunk.length <= TranslationTextPolicy.CHUNK_SIZE_CHARS)
            assertTrue("Chunk should not be blank", chunk.isNotBlank())
        }
    }

    @Test
    fun swapsExplicitHindiAndEnglishCleanly() {
        val hi = TranslatorLanguages.findByCode("hi")
        val en = TranslatorLanguages.findByCode("en")

        val (newSource, newTarget) = TranslationTextPolicy.resolveSwappedLanguages(hi, en)
        assertEquals("en", newSource.code)
        assertEquals("hi", newTarget.code)
    }

    @Test
    fun swapsAutoDetectUsingDetectedSourceLanguageWhenAvailable() {
        val auto = TranslatorLanguages.AUTO_DETECT
        val en = TranslatorLanguages.findByCode("en")

        val (newSource, newTarget) = TranslationTextPolicy.resolveSwappedLanguages(
            currentSource = auto,
            currentTarget = en,
            detectedSourceName = "French"
        )
        assertEquals("en", newSource.code)
        assertEquals("fr", newTarget.code)
    }
}
