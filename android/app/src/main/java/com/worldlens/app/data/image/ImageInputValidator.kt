package com.worldlens.app.data.image

import android.content.Context
import android.graphics.BitmapFactory
import android.graphics.ImageDecoder
import android.net.Uri
import android.os.Build
import android.provider.OpenableColumns
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

sealed interface ImageValidationResult {
    data class Valid(
        val mimeType: String,
        val width: Int,
        val height: Int
    ) : ImageValidationResult

    data class UnsupportedFormat(val detectedMimeType: String?) : ImageValidationResult
    data object FileTooLarge : ImageValidationResult
    data object Unreadable : ImageValidationResult
}

/**
 * Validates selected gallery and camera image URIs before previewing or sending to Gemini.
 * Supports JPEG, PNG, WebP, HEIC/HEIF, BMP, and single-frame GIF while rejecting
 * unsupported formats (such as SVG, TIFF, PDF, video, or empty/corrupt files).
 */
object ImageInputValidator {
    const val MAX_IMAGE_FILE_BYTES: Long = 25L * 1024L * 1024L // 25 MB safety cap

    val SUPPORTED_MIME_TYPES: Set<String> = setOf(
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/heic",
        "image/heif",
        "image/bmp",
        "image/x-ms-bmp",
        "image/gif"
    )

    fun normalizeMimeType(mimeType: String?): String? {
        val cleaned = mimeType?.trim()?.lowercase()?.substringBefore(';')?.trim()
        return cleaned?.takeIf { it.isNotEmpty() }
    }

    fun isSupportedMimeType(mimeType: String?): Boolean {
        val normalized = normalizeMimeType(mimeType) ?: return false
        return normalized in SUPPORTED_MIME_TYPES
    }

    fun isWithinMaxFileSize(byteSize: Long?): Boolean {
        if (byteSize == null) return true
        return byteSize in 1L..MAX_IMAGE_FILE_BYTES
    }

    fun formatDisplayLabel(mimeType: String?): String = when (normalizeMimeType(mimeType)) {
        "image/jpeg", "image/jpg" -> "JPEG"
        "image/png" -> "PNG"
        "image/webp" -> "WebP"
        "image/heic" -> "HEIC"
        "image/heif" -> "HEIF"
        "image/bmp", "image/x-ms-bmp" -> "BMP"
        "image/gif" -> "GIF"
        else -> "Image"
    }

    suspend fun validateUri(context: Context, uri: Uri): ImageValidationResult =
        withContext(Dispatchers.IO) {
            val resolver = context.contentResolver

            // 1. Check declared MIME type first when available
            val resolverMime = normalizeMimeType(resolver.getType(uri))
            if (resolverMime != null && !isSupportedMimeType(resolverMime)) {
                return@withContext ImageValidationResult.UnsupportedFormat(resolverMime)
            }

            // 2. Check file size safely when provider exposes OpenableColumns.SIZE
            val declaredSize = queryFileSize(context, uri)
            if (declaredSize != null) {
                if (declaredSize <= 0L) {
                    return@withContext ImageValidationResult.Unreadable
                }
                if (!isWithinMaxFileSize(declaredSize)) {
                    return@withContext ImageValidationResult.FileTooLarge
                }
            }

            // 3. Probe actual image header bounds & detected MIME without allocating pixel memory
            val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            val probeOpened = try {
                resolver.openInputStream(uri)?.use { stream ->
                    BitmapFactory.decodeStream(stream, null, bounds)
                    true
                } ?: false
            } catch (_: SecurityException) {
                return@withContext ImageValidationResult.Unreadable
            } catch (_: Exception) {
                false
            }

            if (!probeOpened) {
                return@withContext ImageValidationResult.Unreadable
            }

            val detectedMime = normalizeMimeType(bounds.outMimeType) ?: resolverMime
            if (detectedMime != null && !isSupportedMimeType(detectedMime)) {
                return@withContext ImageValidationResult.UnsupportedFormat(detectedMime)
            }

            if (bounds.outWidth > 0 && bounds.outHeight > 0) {
                val finalMime = detectedMime ?: "image/jpeg"
                return@withContext ImageValidationResult.Valid(
                    mimeType = finalMime,
                    width = bounds.outWidth,
                    height = bounds.outHeight
                )
            }

            // 4. Fallback header probe via ImageDecoder on API 28+ (handles HEIC/HEIF reliably)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                val decodedHeader = probeWithImageDecoder(context, uri)
                if (decodedHeader != null) {
                    val finalMime = normalizeMimeType(decodedHeader.first) ?: detectedMime
                    if (finalMime != null && !isSupportedMimeType(finalMime)) {
                        return@withContext ImageValidationResult.UnsupportedFormat(finalMime)
                    }
                    return@withContext ImageValidationResult.Valid(
                        mimeType = finalMime ?: "image/jpeg",
                        width = decodedHeader.second,
                        height = decodedHeader.third
                    )
                }
            }

            // If MIME looked non-image or header could not be decoded at all
            if (resolverMime == null) {
                ImageValidationResult.UnsupportedFormat(null)
            } else {
                ImageValidationResult.Unreadable
            }
        }

    private fun queryFileSize(context: Context, uri: Uri): Long? {
        return try {
            context.contentResolver.query(
                uri,
                arrayOf(OpenableColumns.SIZE),
                null,
                null,
                null
            )?.use { cursor ->
                val sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE)
                if (sizeIndex != -1 && cursor.moveToFirst() && !cursor.isNull(sizeIndex)) {
                    cursor.getLong(sizeIndex)
                } else {
                    null
                }
            }
        } catch (_: Exception) {
            null
        }
    }

    private fun probeWithImageDecoder(context: Context, uri: Uri): Triple<String?, Int, Int>? {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) return null
        return try {
            var mime: String? = null
            var width = 0
            var height = 0
            val source = ImageDecoder.createSource(context.contentResolver, uri)
            val tiny = ImageDecoder.decodeBitmap(source) { decoder, info, _ ->
                mime = info.mimeType
                width = info.size.width
                height = info.size.height
                decoder.allocator = ImageDecoder.ALLOCATOR_SOFTWARE
                decoder.setTargetSize(1, 1)
            }
            if (!tiny.isRecycled) tiny.recycle()
            if (width > 0 && height > 0) Triple(mime, width, height) else null
        } catch (_: Exception) {
            null
        }
    }
}
