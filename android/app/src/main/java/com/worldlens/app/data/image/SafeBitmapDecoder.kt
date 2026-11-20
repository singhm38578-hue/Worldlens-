package com.worldlens.app.data.image

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.ImageDecoder
import android.net.Uri
import android.os.Build
import com.worldlens.app.domain.model.SelectedScanImage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlin.math.max
import kotlin.math.roundToInt

/**
 * Holds a memory-safe Bitmap ready for Gemini multimodal upload.
 * [shouldRecycleAfterUse] is true only for newly allocated temporary Bitmaps so
 * Compose-displayed Bitmaps held in ViewModel state are never recycled prematurely.
 */
data class DecodedScanBitmap(
    val bitmap: Bitmap,
    val shouldRecycleAfterUse: Boolean
)

object SafeBitmapDecoder {
    private const val MAX_DIMENSION_PX = 1024

    suspend fun decodeForAnalysis(
        context: Context,
        selectedImage: SelectedScanImage
    ): DecodedScanBitmap? = withContext(Dispatchers.IO) {
        when (selectedImage) {
            is SelectedScanImage.CameraPreviewBitmap -> {
                val source = selectedImage.bitmap
                if (source.isRecycled || source.width <= 0 || source.height <= 0) {
                    return@withContext null
                }
                val longest = max(source.width, source.height)
                if (longest <= MAX_DIMENSION_PX) {
                    DecodedScanBitmap(bitmap = source, shouldRecycleAfterUse = false)
                } else {
                    val scale = MAX_DIMENSION_PX.toFloat() / longest.toFloat()
                    val targetW = max(1, (source.width * scale).roundToInt())
                    val targetH = max(1, (source.height * scale).roundToInt())
                    val scaled = Bitmap.createScaledBitmap(source, targetW, targetH, true)
                    DecodedScanBitmap(
                        bitmap = scaled,
                        shouldRecycleAfterUse = scaled !== source
                    )
                }
            }

            is SelectedScanImage.CameraUri -> {
                decodeUriSafely(context, selectedImage.uri)
            }

            is SelectedScanImage.GalleryUri -> {
                decodeUriSafely(context, selectedImage.uri)
            }
        }
    }

    private fun decodeUriSafely(context: Context, uri: Uri): DecodedScanBitmap? {
        val resolver = context.contentResolver
        val declaredMime = ImageInputValidator.normalizeMimeType(resolver.getType(uri))
        if (declaredMime != null && !ImageInputValidator.isSupportedMimeType(declaredMime)) {
            return null
        }

        // API 28+: ImageDecoder automatically respects EXIF orientation (critical for
        // full-resolution camera photos) and supports JPEG, PNG, WebP, HEIC/HEIF, BMP, GIF.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            val decodedWithImageDecoder = decodeWithImageDecoder(context, uri)
            if (decodedWithImageDecoder != null) {
                return decodedWithImageDecoder
            }
        }

        return decodeWithBitmapFactory(context, uri)
    }

    private fun decodeWithImageDecoder(context: Context, uri: Uri): DecodedScanBitmap? {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) return null
        return try {
            val source = ImageDecoder.createSource(context.contentResolver, uri)
            val bitmap = ImageDecoder.decodeBitmap(source) { decoder, info, _ ->
                val rawWidth = info.size.width
                val rawHeight = info.size.height
                if (rawWidth > 0 && rawHeight > 0) {
                    val longest = max(rawWidth, rawHeight)
                    if (longest > MAX_DIMENSION_PX) {
                        val scale = MAX_DIMENSION_PX.toFloat() / longest.toFloat()
                        val targetW = max(1, (rawWidth * scale).roundToInt())
                        val targetH = max(1, (rawHeight * scale).roundToInt())
                        decoder.setTargetSize(targetW, targetH)
                    }
                }
                decoder.allocator = ImageDecoder.ALLOCATOR_SOFTWARE
                decoder.isMutableRequired = false
            }
            if (bitmap.width <= 0 || bitmap.height <= 0) {
                if (!bitmap.isRecycled) bitmap.recycle()
                null
            } else {
                DecodedScanBitmap(bitmap = bitmap, shouldRecycleAfterUse = true)
            }
        } catch (_: Exception) {
            null
        }
    }

    private fun decodeWithBitmapFactory(context: Context, uri: Uri): DecodedScanBitmap? {
        val resolver = context.contentResolver

        // Pass 1: inspect image dimensions without allocating pixel memory
        val boundsOptions = BitmapFactory.Options().apply {
            inJustDecodeBounds = true
        }
        resolver.openInputStream(uri)?.use { stream ->
            BitmapFactory.decodeStream(stream, null, boundsOptions)
        } ?: return null

        val rawWidth = boundsOptions.outWidth
        val rawHeight = boundsOptions.outHeight
        if (rawWidth <= 0 || rawHeight <= 0) {
            return null
        }

        val detectedMime = ImageInputValidator.normalizeMimeType(boundsOptions.outMimeType)
        if (detectedMime != null && !ImageInputValidator.isSupportedMimeType(detectedMime)) {
            return null
        }

        // Pass 2: decode downsampled bitmap using power-of-two inSampleSize
        val sampleSize = calculateInSampleSize(rawWidth, rawHeight, MAX_DIMENSION_PX)
        val decodeOptions = BitmapFactory.Options().apply {
            inSampleSize = sampleSize
            inPreferredConfig = Bitmap.Config.ARGB_8888
        }

        val decoded = resolver.openInputStream(uri)?.use { stream ->
            BitmapFactory.decodeStream(stream, null, decodeOptions)
        } ?: return null

        val longest = max(decoded.width, decoded.height)
        if (longest <= MAX_DIMENSION_PX) {
            return DecodedScanBitmap(bitmap = decoded, shouldRecycleAfterUse = true)
        }

        val scale = MAX_DIMENSION_PX.toFloat() / longest.toFloat()
        val targetW = max(1, (decoded.width * scale).roundToInt())
        val targetH = max(1, (decoded.height * scale).roundToInt())
        val scaled = Bitmap.createScaledBitmap(decoded, targetW, targetH, true)
        if (scaled !== decoded) {
            decoded.recycle()
        }
        return DecodedScanBitmap(bitmap = scaled, shouldRecycleAfterUse = true)
    }

    private fun calculateInSampleSize(width: Int, height: Int, maxDim: Int): Int {
        var inSampleSize = 1
        var halfWidth = width / 2
        var halfHeight = height / 2
        while (halfWidth / inSampleSize >= maxDim || halfHeight / inSampleSize >= maxDim) {
            inSampleSize *= 2
        }
        return inSampleSize
    }
}
