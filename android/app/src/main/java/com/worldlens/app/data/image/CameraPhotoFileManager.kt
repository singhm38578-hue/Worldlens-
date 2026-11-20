package com.worldlens.app.data.image

import android.content.Context
import android.net.Uri
import androidx.core.content.FileProvider
import java.io.File
import java.io.IOException

/**
 * Manages temporary private app-cache JPEG files for [androidx.activity.result.contract.ActivityResultContracts.TakePicture].
 *
 * Security & privacy:
 * - Files live strictly in `context.cacheDir/camera_captures/` (not public external storage).
 * - Requires zero storage permissions and zero CAMERA permission.
 * - Empty/cancelled capture files are deleted immediately, and replaced/removed files are cleaned up.
 */
object CameraPhotoFileManager {
    private const val CAPTURE_DIR_NAME = "camera_captures"

    fun authority(context: Context): String = "${context.packageName}.fileprovider"

    @Throws(IOException::class)
    fun createTempCaptureUri(context: Context): Uri {
        val captureDir = File(context.cacheDir, CAPTURE_DIR_NAME)
        if (!captureDir.exists() && !captureDir.mkdirs()) {
            throw IOException("Unable to create camera capture cache directory.")
        }

        val tempFile = File.createTempFile(
            "worldlens_capture_",
            ".jpg",
            captureDir
        )

        return FileProvider.getUriForFile(context, authority(context), tempFile)
    }

    /**
     * Verifies that the camera app actually wrote non-empty image bytes to [uri].
     * Some OEM camera apps return RESULT_OK even when no bytes were written.
     */
    fun hasNonEmptyFile(context: Context, uri: Uri): Boolean {
        val file = resolveOwnedCacheFile(context, uri)
        if (file != null) {
            return file.exists() && file.length() > 0L
        }
        return try {
            context.contentResolver.openAssetFileDescriptor(uri, "r")?.use { afd ->
                afd.length > 0L || afd.createInputStream().use { it.read() != -1 }
            } ?: false
        } catch (_: Exception) {
            false
        }
    }

    /**
     * Safely deletes [uri] only if it belongs to WorldLens's private camera capture cache folder.
     */
    fun deleteCaptureIfOwned(context: Context, uri: Uri?) {
        if (uri == null) return
        val file = resolveOwnedCacheFile(context, uri) ?: return
        runCatching {
            if (file.exists()) {
                file.delete()
            }
        }
    }

    /**
     * Best-effort cleanup of stale temporary camera captures left behind if the OS killed
     * the app mid-session. Deletes only files inside WorldLens's private camera capture cache.
     */
    fun cleanupStaleCaptures(
        context: Context,
        maxAgeMillis: Long = 24L * 60L * 60L * 1000L
    ) {
        runCatching {
            val captureDir = File(context.applicationContext.cacheDir, CAPTURE_DIR_NAME)
            if (!captureDir.exists() || !captureDir.isDirectory) return
            val cutoff = System.currentTimeMillis() - maxAgeMillis
            captureDir.listFiles()?.forEach { file ->
                if (file.isFile && file.lastModified() < cutoff) {
                    runCatching { file.delete() }
                }
            }
        }
    }

    private fun resolveOwnedCacheFile(context: Context, uri: Uri): File? {
        if (uri.authority != authority(context)) return null
        val fileName = uri.lastPathSegment?.takeIf { it.isNotBlank() } ?: return null
        val captureDir = File(context.cacheDir, CAPTURE_DIR_NAME)
        val candidate = File(captureDir, fileName)
        return try {
            val canonicalDir = captureDir.canonicalPath
            val canonicalFile = candidate.canonicalPath
            if (canonicalFile.startsWith(canonicalDir + File.separator)) candidate else null
        } catch (_: IOException) {
            null
        }
    }
}
