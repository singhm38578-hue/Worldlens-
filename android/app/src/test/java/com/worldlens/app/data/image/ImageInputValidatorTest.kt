package com.worldlens.app.data.image

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * JVM unit tests verifying WorldLens's image format allowlist, normalization,
 * and safe file size boundaries used by Camera Capture and Gallery Image Upload.
 */
class ImageInputValidatorTest {

    @Test
    fun supportsStandardSafeRasterImageFormats() {
        val supported = listOf(
            "image/jpeg",
            "image/jpg",
            "IMAGE/JPEG",
            "image/png",
            "image/png; charset=binary",
            "image/webp",
            "image/heic",
            "image/heif",
            "image/bmp",
            "image/x-ms-bmp",
            "image/gif"
        )
        supported.forEach { mime ->
            assertTrue("Expected $mime to be supported", ImageInputValidator.isSupportedMimeType(mime))
        }
    }

    @Test
    fun rejectsUnsupportedAndNonImageFormats() {
        val unsupported = listOf(
            null,
            "",
            "   ",
            "image/svg+xml",
            "image/tiff",
            "video/mp4",
            "application/pdf",
            "application/octet-stream",
            "text/plain"
        )
        unsupported.forEach { mime ->
            assertFalse("Expected $mime to be rejected", ImageInputValidator.isSupportedMimeType(mime))
        }
    }

    @Test
    fun enforcesSafeFileSizeLimit() {
        assertTrue(ImageInputValidator.isWithinMaxFileSize(null))
        assertTrue(ImageInputValidator.isWithinMaxFileSize(1024L))
        assertTrue(ImageInputValidator.isWithinMaxFileSize(ImageInputValidator.MAX_IMAGE_FILE_BYTES))
        assertFalse(ImageInputValidator.isWithinMaxFileSize(0L))
        assertFalse(ImageInputValidator.isWithinMaxFileSize(-10L))
        assertFalse(ImageInputValidator.isWithinMaxFileSize(ImageInputValidator.MAX_IMAGE_FILE_BYTES + 1L))
    }

    @Test
    fun formatsUserFriendlyFormatLabels() {
        assertEquals("JPEG", ImageInputValidator.formatDisplayLabel("image/jpeg"))
        assertEquals("PNG", ImageInputValidator.formatDisplayLabel("image/png"))
        assertEquals("WebP", ImageInputValidator.formatDisplayLabel("image/webp"))
        assertEquals("HEIC", ImageInputValidator.formatDisplayLabel("image/heic"))
        assertEquals("Image", ImageInputValidator.formatDisplayLabel(null))
        assertNull(ImageInputValidator.normalizeMimeType("   "))
    }
}
