package com.worldlens.app.data.local

import android.content.Context
import android.graphics.Bitmap
import com.worldlens.app.data.image.SafeBitmapDecoder
import com.worldlens.app.domain.model.SelectedScanImage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import kotlin.math.max
import kotlin.math.roundToInt

/**
 * Generates and manages small, compressed on-device JPEG thumbnails for saved AI scans.
 *
 * Privacy & safety guarantees:
 * - Stored strictly in app-private internal storage (`filesDir/scan_thumbnails`).
 * - Requires zero external storage permissions and is never uploaded to any cloud service.
 * - Downscaled to at most 240px on the longest edge (~15–25 KB) to keep device storage tiny.
 * - Any I/O or decoding failure safely returns null so scan history saving never fails.
 */
object ScanThumbnailStorage {
    private const val THUMBNAIL_DIR_NAME = "scan_thumbnails"
    private const val MAX_THUMBNAIL_DIM_PX = 240
    private const val JPEG_QUALITY = 72

    internal fun sanitizeFileId(scanId: String): String {
        val cleaned = scanId.trim().replace(Regex("[^A-Za-z0-9_-]"), "_")
        return cleaned.ifEmpty { "scan_${System.currentTimeMillis()}" }
    }

    suspend fun saveThumbnailSafely(
        context: Context,
        scanId: String,
        selectedImage: SelectedScanImage
    ): String? = withContext(Dispatchers.IO) {
        var decoded = SafeBitmapDecoder.decodeForAnalysis(context.applicationContext, selectedImage)
            ?: return@withContext null
        var scaledBitmap: Bitmap? = null

        try {
            val source = decoded.bitmap
            if (source.isRecycled || source.width <= 0 || source.height <= 0) {
                return@withContext null
            }

            val longest = max(source.width, source.height)
            val bitmapToCompress = if (longest > MAX_THUMBNAIL_DIM_PX) {
                val scale = MAX_THUMBNAIL_DIM_PX.toFloat() / longest.toFloat()
                val targetW = max(1, (source.width * scale).roundToInt())
                val targetH = max(1, (source.height * scale).roundToInt())
                Bitmap.createScaledBitmap(source, targetW, targetH, true).also { created ->
                    if (created !== source) {
                        scaledBitmap = created
                    }
                }
            } else {
                source
            }

            val dir = File(context.applicationContext.filesDir, THUMBNAIL_DIR_NAME)
            if (!dir.exists() && !dir.mkdirs()) {
                return@withContext null
            }

            val outFile = File(dir, "${sanitizeFileId(scanId)}.jpg")
            FileOutputStream(outFile).use { stream ->
                val ok = bitmapToCompress.compress(Bitmap.CompressFormat.JPEG, JPEG_QUALITY, stream)
                stream.flush()
                if (!ok) {
                    outFile.delete()
                    return@withContext null
                }
            }

            outFile.absolutePath
        } catch (_: Throwable) {
            null
        } finally {
            scaledBitmap?.let { bmp ->
                if (!bmp.isRecycled) bmp.recycle()
            }
            if (decoded.shouldRecycleAfterUse && !decoded.bitmap.isRecycled) {
                decoded.bitmap.recycle()
            }
        }
    }

    fun resolveValidThumbnailFile(thumbnailPath: String?): File? {
        if (thumbnailPath.isNullOrBlank()) return null
        return try {
            val file = File(thumbnailPath)
            if (file.exists() && file.isFile && file.length() > 0L) file else null
        } catch (_: Exception) {
            null
        }
    }

    fun deleteThumbnailSafely(thumbnailPath: String?) {
        if (thumbnailPath.isNullOrBlank()) return
        try {
            val file = File(thumbnailPath)
            if (file.exists() && file.isFile) {
                file.delete()
            }
        } catch (_: Exception) {
            // Never let file cleanup break history deletion
        }
    }

    fun clearAllThumbnailsSafely(context: Context) {
        try {
            val dir = File(context.applicationContext.filesDir, THUMBNAIL_DIR_NAME)
            if (dir.exists() && dir.isDirectory) {
                dir.listFiles()?.forEach { child ->
                    try {
                        child.delete()
                    } catch (_: Exception) {
                        // Best-effort cleanup
                    }
                }
            }
        } catch (_: Exception) {
            // Never let file cleanup break Clear All
        }
    }
}
