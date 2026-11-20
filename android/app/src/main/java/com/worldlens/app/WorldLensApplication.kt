package com.worldlens.app

import android.app.Application
import com.google.firebase.FirebaseApp
import com.google.firebase.appcheck.FirebaseAppCheck
import com.google.firebase.appcheck.playintegrity.PlayIntegrityAppCheckProviderFactory
import com.worldlens.app.data.image.CameraPhotoFileManager
import kotlin.concurrent.thread

/**
 * Application entry point configuring Firebase and Firebase App Check safely.
 *
 * - Debug builds install DebugAppCheckProviderFactory via reflection (only packaged in
 *   debugImplementation) so founders can register the Logcat debug token in Firebase Console
 *   for Google AI Studio / emulator development.
 * - Release builds install PlayIntegrityAppCheckProviderFactory.
 * - If google-services.json has not yet been placed in android/app/, initialization fails
 *   gracefully and marks [isFirebaseConfigured] = false without crashing the app.
 */
class WorldLensApplication : Application() {

    override fun onCreate() {
        super.onCreate()
        thread(isDaemon = true, name = "worldlens-cache-cleanup") {
            CameraPhotoFileManager.cleanupStaleCaptures(applicationContext)
        }
        val initializedApp = try {
            FirebaseApp.initializeApp(this)
        } catch (_: Exception) {
            null
        }

        isFirebaseConfigured = initializedApp != null || FirebaseApp.getApps(this).isNotEmpty()
        if (!isFirebaseConfigured) {
            return
        }

        val appCheck = FirebaseAppCheck.getInstance()
        if (BuildConfig.DEBUG) {
            val debugFactoryInstalled = installDebugAppCheckProvider(appCheck)
            if (!debugFactoryInstalled) {
                appCheck.installAppCheckProviderFactory(
                    PlayIntegrityAppCheckProviderFactory.getInstance()
                )
            }
        } else {
            appCheck.installAppCheckProviderFactory(
                PlayIntegrityAppCheckProviderFactory.getInstance()
            )
        }
    }

    private fun installDebugAppCheckProvider(appCheck: FirebaseAppCheck): Boolean {
        return try {
            val factoryClass = Class.forName(
                "com.google.firebase.appcheck.debug.DebugAppCheckProviderFactory"
            )
            val getInstance = factoryClass.getMethod("getInstance")
            val factory = getInstance.invoke(null) as com.google.firebase.appcheck.AppCheckProviderFactory
            appCheck.installAppCheckProviderFactory(factory)
            true
        } catch (_: Exception) {
            false
        }
    }

    companion object {
        @Volatile
        var isFirebaseConfigured: Boolean = false
            private set
    }
}
