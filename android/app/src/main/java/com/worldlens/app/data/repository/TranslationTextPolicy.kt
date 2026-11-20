package com.worldlens.app.data.repository

import com.worldlens.app.domain.model.TranslatorLanguage
import com.worldlens.app.domain.model.TranslatorLanguages

sealed interface TextInputValidation {
    data object Empty : TextInputValidation
    data class TooLong(val actualLength: Int, val maxLength: Int) : TextInputValidation
    data class Valid(val cleanedText: String, val chunks: List<String>) : TextInputValidation
}

/**
 * Pure Kotlin validation, long-text chunking, and smart language-swap policy for
 * WorldLens Global AI Translator. Keeps long multi-paragraph text safe from JSON
 * response truncation while preserving paragraph formatting and user input on failure.
 */
object TranslationTextPolicy {
    const val MAX_INPUT_CHARS = 5_000
    const val CHUNK_SIZE_CHARS = 1_800

    fun validateInput(rawText: String): TextInputValidation {
        val cleaned = rawText.trim()
        if (cleaned.isEmpty()) return TextInputValidation.Empty
        if (cleaned.length > MAX_INPUT_CHARS) {
            return TextInputValidation.TooLong(
                actualLength = cleaned.length,
                maxLength = MAX_INPUT_CHARS
            )
        }
        return TextInputValidation.Valid(
            cleanedText = cleaned,
            chunks = splitIntoSafeChunks(cleaned, CHUNK_SIZE_CHARS)
        )
    }

    /**
     * Splits long text along paragraph breaks first, then sentence boundaries (including
     * Devanagari danda '।'), then word spaces so translation preserves natural meaning
     * and paragraph structure without truncating Gemini JSON output.
     */
    fun splitIntoSafeChunks(text: String, maxChunkSize: Int = CHUNK_SIZE_CHARS): List<String> {
        val trimmed = text.trim()
        if (trimmed.isEmpty()) return emptyList()
        if (trimmed.length <= maxChunkSize) return listOf(trimmed)

        val paragraphs = trimmed.split(Regex("\\n\\s*\\n"))
        val chunks = mutableListOf<String>()
        val current = StringBuilder()

        fun flushCurrent() {
            if (current.isNotEmpty()) {
                chunks.add(current.toString().trim())
                current.clear()
            }
        }

        for (rawParagraph in paragraphs) {
            val paragraph = rawParagraph.trim()
            if (paragraph.isEmpty()) continue

            if (paragraph.length <= maxChunkSize) {
                val needed = if (current.isEmpty()) paragraph.length else current.length + 2 + paragraph.length
                if (needed <= maxChunkSize) {
                    if (current.isNotEmpty()) current.append("\n\n")
                    current.append(paragraph)
                } else {
                    flushCurrent()
                    current.append(paragraph)
                }
            } else {
                flushCurrent()
                var remaining = paragraph
                while (remaining.length > maxChunkSize) {
                    val splitAt = findBestSplitIndex(remaining, maxChunkSize)
                    chunks.add(remaining.substring(0, splitAt).trim())
                    remaining = remaining.substring(splitAt).trimStart()
                }
                if (remaining.isNotEmpty()) {
                    current.append(remaining)
                }
            }
        }
        flushCurrent()
        return chunks
    }

    private fun findBestSplitIndex(text: String, maxChunkSize: Int): Int {
        val window = text.substring(0, maxChunkSize)
        val minPreferred = maxChunkSize / 2

        val newlineIdx = window.lastIndexOf('\n')
        if (newlineIdx >= minPreferred) return newlineIdx + 1

        val sentenceDelimiters = listOf(". ", "। ", "? ", "! ", "।")
        var bestSentenceEnd = -1
        for (delim in sentenceDelimiters) {
            val idx = window.lastIndexOf(delim)
            if (idx >= minPreferred) {
                val endPos = idx + delim.length
                if (endPos > bestSentenceEnd) bestSentenceEnd = endPos
            }
        }
        if (bestSentenceEnd > 0) return bestSentenceEnd

        val spaceIdx = window.lastIndexOf(' ')
        if (spaceIdx >= minPreferred) return spaceIdx + 1

        return maxChunkSize
    }

    /**
     * Computes swapped (newSource, newTarget) pair. When source is Auto-detect, uses the
     * last detected source language if recognized; otherwise defaults cleanly between
     * English and Hindi.
     */
    fun resolveSwappedLanguages(
        currentSource: TranslatorLanguage,
        currentTarget: TranslatorLanguage,
        detectedSourceName: String? = null
    ): Pair<TranslatorLanguage, TranslatorLanguage> {
        if (currentSource.code != TranslatorLanguages.AUTO_DETECT.code) {
            return currentTarget to currentSource
        }
        val matchedDetected = TranslatorLanguages.findByNameOrCode(detectedSourceName)
            ?.takeIf { it.code != currentTarget.code && it.code != TranslatorLanguages.AUTO_DETECT.code }

        val fallbackTarget = matchedDetected ?: if (currentTarget.code == "en") {
            TranslatorLanguages.findByCode("hi")
        } else {
            TranslatorLanguages.findByCode("en")
        }
        return currentTarget to fallbackTarget
    }
}
