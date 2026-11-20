package com.worldlens.app.data.local

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.State
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import com.worldlens.app.domain.model.AppLanguage

/**
 * Lightweight local preference helper for persisting the user's selected
 * English or Hindi interface language across app restarts.
 */
object AppLanguagePreferences {
    private const val PREFS_NAME = "worldlens_settings"
    private const val KEY_LANGUAGE = "app_language"

    fun load(context: Context): AppLanguage {
        val prefs = context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val saved = prefs.getString(KEY_LANGUAGE, AppLanguage.ENGLISH.code)
        return AppLanguage.entries.firstOrNull { it.code == saved } ?: AppLanguage.ENGLISH
    }

    fun save(context: Context, language: AppLanguage) {
        val prefs = context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(KEY_LANGUAGE, language.code).apply()
    }
}

/**
 * Checks device internet availability cleanly using ConnectivityManager so
 * Scanner and Translator can display localized offline messages immediately
 * without waiting for network timeouts.
 */
object NetworkConnectivityHelper {
    fun isOnline(context: Context): Boolean {
        val cm = context.applicationContext.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
            ?: return true
        val activeNetwork = cm.activeNetwork ?: return false
        val capabilities = cm.getNetworkCapabilities(activeNetwork) ?: return false
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
            capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
    }
}

@Composable
fun rememberIsOnline(): State<Boolean> {
    val context = LocalContext.current.applicationContext
    val onlineState = remember { mutableStateOf(NetworkConnectivityHelper.isOnline(context)) }

    DisposableEffect(context) {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
        if (cm == null) {
            onDispose {}
        } else {
            val callback = object : ConnectivityManager.NetworkCallback() {
                override fun onAvailable(network: Network) {
                    onlineState.value = NetworkConnectivityHelper.isOnline(context)
                }

                override fun onCapabilitiesChanged(
                    network: Network,
                    networkCapabilities: NetworkCapabilities
                ) {
                    onlineState.value =
                        networkCapabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
                        networkCapabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
                }

                override fun onLost(network: Network) {
                    onlineState.value = NetworkConnectivityHelper.isOnline(context)
                }
            }
            runCatching { cm.registerDefaultNetworkCallback(callback) }
            onDispose {
                runCatching { cm.unregisterNetworkCallback(callback) }
            }
        }
    }
    return onlineState
}
