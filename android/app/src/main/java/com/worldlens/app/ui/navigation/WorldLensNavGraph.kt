package com.worldlens.app.ui.navigation

import android.content.Context
import android.graphics.Bitmap
import android.net.Uri
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CenterFocusWeak
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.Translate
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.worldlens.app.data.image.CameraPhotoFileManager
import com.worldlens.app.data.local.AppLanguagePreferences
import com.worldlens.app.data.local.HistoryOperationResult
import com.worldlens.app.data.local.LocalHistoryRepository
import com.worldlens.app.data.local.NetworkConnectivityHelper
import com.worldlens.app.data.local.ScanThumbnailStorage
import com.worldlens.app.data.repository.FirebaseGeminiVisualRepository
import com.worldlens.app.data.repository.VisualAnalysisResult
import com.worldlens.app.domain.model.AiAnalysisUiState
import com.worldlens.app.domain.model.AppLanguage
import com.worldlens.app.domain.model.LocalScanHistoryItem
import com.worldlens.app.domain.model.LocalizedCopy
import com.worldlens.app.domain.model.ScanAnalysisError
import com.worldlens.app.domain.model.SelectedScanImage
import com.worldlens.app.ui.screens.AboutWorldLensScreen
import com.worldlens.app.ui.screens.AiScanResultScreen
import com.worldlens.app.ui.screens.HistoryScreen
import com.worldlens.app.ui.screens.HomeScreen
import com.worldlens.app.ui.screens.PrivacyPolicyScreen
import com.worldlens.app.ui.screens.ProfileScreen
import com.worldlens.app.ui.screens.ScannerScreen
import com.worldlens.app.ui.screens.SplashScreen
import com.worldlens.app.ui.screens.TranslatorScreen
import com.worldlens.app.ui.translator.TranslatorViewModel
import com.worldlens.app.ui.theme.ElectricBlue
import com.worldlens.app.ui.theme.ElectricBlueTint
import com.worldlens.app.ui.theme.TextMuted
import com.worldlens.app.ui.theme.WorldLensWhite
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import java.util.UUID

object Routes {
    const val SPLASH = "splash"
    const val HOME = "home"
    const val SCANNER = "scanner"
    const val TRANSLATOR = "translator"
    const val AI_RESULT = "ai-result"
    const val HISTORY = "history"
    const val PROFILE = "profile"
    const val ABOUT = "about"
    const val PRIVACY = "privacy"
}

private data class BottomNavDestination(
    val route: String,
    val label: LocalizedCopy,
    val icon: ImageVector
)

/**
 * Retains the shared SelectedScanImage (Gallery URI or Camera preview Bitmap),
 * real Gemini analysis state, and Room-persisted local Scan History across
 * configuration changes, tab switches, and app restarts.
 */
class ScannerStateViewModel : ViewModel() {
    var selectedImage by mutableStateOf<SelectedScanImage?>(null)
        private set

    var analysisState by mutableStateOf<AiAnalysisUiState>(AiAnalysisUiState.Idle)
        private set

    var scanHistory by mutableStateOf<List<LocalScanHistoryItem>>(emptyList())
        private set

    var scanHistoryError by mutableStateOf<String?>(null)
        private set

    private var activeAnalysisJob: Job? = null
    private var historyObserverJob: Job? = null

    fun ensureHistoryLoaded(appContext: Context, forceRestart: Boolean = false) {
        if (historyObserverJob != null && !forceRestart) return
        historyObserverJob?.cancel()
        val historyRepository = LocalHistoryRepository(appContext.applicationContext)
        historyObserverJob = viewModelScope.launch {
            historyRepository.observeScanHistory().collect { feed ->
                scanHistory = feed.items
                if (feed.errorDetail != null) {
                    scanHistoryError = feed.errorDetail
                } else {
                    scanHistoryError = null
                }
            }
        }
    }

    fun dismissHistoryError() {
        scanHistoryError = null
    }

    private fun cleanupTempCameraFile(appContext: Context, image: SelectedScanImage?) {
        if (image is SelectedScanImage.CameraUri) {
            CameraPhotoFileManager.deleteCaptureIfOwned(appContext.applicationContext, image.uri)
        }
    }

    fun selectGalleryUri(appContext: Context, uri: Uri, mimeType: String? = null) {
        activeAnalysisJob?.cancel()
        cleanupTempCameraFile(appContext, selectedImage)
        selectedImage = SelectedScanImage.GalleryUri(uri = uri, mimeType = mimeType)
        analysisState = AiAnalysisUiState.Idle
    }

    fun selectCameraUri(appContext: Context, uri: Uri) {
        activeAnalysisJob?.cancel()
        if ((selectedImage as? SelectedScanImage.CameraUri)?.uri != uri) {
            cleanupTempCameraFile(appContext, selectedImage)
        }
        selectedImage = SelectedScanImage.CameraUri(uri)
        analysisState = AiAnalysisUiState.Idle
    }

    fun selectCameraBitmap(appContext: Context, bitmap: Bitmap) {
        activeAnalysisJob?.cancel()
        cleanupTempCameraFile(appContext, selectedImage)
        selectedImage = SelectedScanImage.CameraPreviewBitmap(bitmap)
        analysisState = AiAnalysisUiState.Idle
    }

    fun clearSelectedImage(appContext: Context) {
        activeAnalysisJob?.cancel()
        cleanupTempCameraFile(appContext, selectedImage)
        selectedImage = null
        analysisState = AiAnalysisUiState.Idle
    }

    fun analyzeSelectedImage(appContext: Context, language: AppLanguage) {
        val currentImage = selectedImage ?: run {
            analysisState = AiAnalysisUiState.Error(ScanAnalysisError.INVALID_IMAGE)
            return
        }

        if (!NetworkConnectivityHelper.isOnline(appContext)) {
            analysisState = AiAnalysisUiState.Error(
                errorType = ScanAnalysisError.NETWORK,
                technicalDetail = null
            )
            return
        }

        ensureHistoryLoaded(appContext.applicationContext)
        activeAnalysisJob?.cancel()
        analysisState = AiAnalysisUiState.Loading

        val repository = FirebaseGeminiVisualRepository(appContext.applicationContext)
        val historyRepository = LocalHistoryRepository(appContext.applicationContext)
        val sourceLabel = when (currentImage) {
            is SelectedScanImage.CameraUri,
            is SelectedScanImage.CameraPreviewBitmap -> "camera"
            is SelectedScanImage.GalleryUri -> "gallery"
        }

        activeAnalysisJob = viewModelScope.launch {
            when (val result = repository.analyzeImage(currentImage, language)) {
                is VisualAnalysisResult.Success -> {
                    analysisState = AiAnalysisUiState.Success(
                        report = result.report,
                        language = language,
                        modelName = result.modelName
                    )
                    // Save structured scan result + optional compact private thumbnail strictly on-device
                    val scanId = UUID.randomUUID().toString()
                    val thumbnailPath = ScanThumbnailStorage.saveThumbnailSafely(
                        context = appContext.applicationContext,
                        scanId = scanId,
                        selectedImage = currentImage
                    )
                    val saveOutcome = historyRepository.saveScan(
                        LocalScanHistoryItem(
                            id = scanId,
                            report = result.report,
                            languageCode = language.code,
                            modelName = result.modelName,
                            sourceLabel = sourceLabel,
                            timestampMillis = System.currentTimeMillis(),
                            thumbnailPath = thumbnailPath
                        )
                    )
                    if (saveOutcome is HistoryOperationResult.Error) {
                        scanHistoryError = saveOutcome.detail
                    }
                }

                is VisualAnalysisResult.Failure -> {
                    analysisState = AiAnalysisUiState.Error(
                        errorType = result.errorType,
                        technicalDetail = result.detail
                    )
                }
            }
        }
    }

    fun deleteScanHistoryItem(appContext: Context, id: String) {
        val historyRepository = LocalHistoryRepository(appContext.applicationContext)
        viewModelScope.launch {
            when (val res = historyRepository.deleteScan(id)) {
                HistoryOperationResult.Success -> scanHistoryError = null
                is HistoryOperationResult.Error -> scanHistoryError = res.detail
            }
        }
    }

    fun clearAllScanHistory(appContext: Context) {
        val historyRepository = LocalHistoryRepository(appContext.applicationContext)
        viewModelScope.launch {
            when (val res = historyRepository.clearAllScans()) {
                HistoryOperationResult.Success -> scanHistoryError = null
                is HistoryOperationResult.Error -> scanHistoryError = res.detail
            }
        }
    }
}

@Composable
fun WorldLensApp(
    scannerStateViewModel: ScannerStateViewModel = viewModel(),
    translatorViewModel: TranslatorViewModel = viewModel()
) {
    val navController = rememberNavController()
    val context = LocalContext.current

    LaunchedEffect(context) {
        scannerStateViewModel.ensureHistoryLoaded(context.applicationContext)
        translatorViewModel.ensureHistoryLoaded(context.applicationContext)
    }

    var language by remember { mutableStateOf(AppLanguagePreferences.load(context)) }

    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route

    val bottomDestinations = listOf(
        BottomNavDestination(Routes.HOME, LocalizedCopy("Home", "होम"), Icons.Outlined.Home),
        BottomNavDestination(Routes.SCANNER, LocalizedCopy("Scanner", "स्कैनर"), Icons.Outlined.CenterFocusWeak),
        BottomNavDestination(Routes.TRANSLATOR, LocalizedCopy("Translator", "अनुवादक"), Icons.Outlined.Translate),
        BottomNavDestination(Routes.HISTORY, LocalizedCopy("History", "इतिहास"), Icons.Outlined.History),
        BottomNavDestination(Routes.PROFILE, LocalizedCopy("Settings", "सेटिंग्स"), Icons.Outlined.Settings)
    )

    val showBottomBar = currentRoute != null && currentRoute != Routes.SPLASH

    fun navigateToTopLevel(route: String) {
        if (currentRoute == route) return
        // If already inside a child route of this tab (e.g. AI_RESULT -> SCANNER or ABOUT/PRIVACY -> PROFILE),
        // pop cleanly back to the tab root instead of stacking duplicate entries.
        if (route == Routes.SCANNER && currentRoute == Routes.AI_RESULT) {
            navController.popBackStack(Routes.SCANNER, inclusive = false)
            return
        }
        if (route == Routes.PROFILE && (currentRoute == Routes.ABOUT || currentRoute == Routes.PRIVACY)) {
            navController.popBackStack(Routes.PROFILE, inclusive = false)
            return
        }
        navController.navigate(route) {
            popUpTo(Routes.HOME) {
                saveState = true
            }
            launchSingleTop = true
            restoreState = true
        }
    }

    Scaffold(
        bottomBar = {
            if (showBottomBar) {
                NavigationBar(containerColor = WorldLensWhite) {
                    bottomDestinations.forEach { dest ->
                        val selected = currentRoute == dest.route ||
                            (dest.route == Routes.SCANNER && currentRoute == Routes.AI_RESULT) ||
                            (dest.route == Routes.PROFILE &&
                                (currentRoute == Routes.ABOUT || currentRoute == Routes.PRIVACY))
                        NavigationBarItem(
                            selected = selected,
                            onClick = { navigateToTopLevel(dest.route) },
                            icon = {
                                Icon(
                                    imageVector = dest.icon,
                                    contentDescription = dest.label.resolve(language)
                                )
                            },
                            label = {
                                Text(
                                    text = dest.label.resolve(language),
                                    maxLines = 1,
                                    softWrap = false,
                                    overflow = TextOverflow.Ellipsis
                                )
                            },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = ElectricBlue,
                                selectedTextColor = ElectricBlue,
                                indicatorColor = ElectricBlueTint,
                                unselectedIconColor = TextMuted,
                                unselectedTextColor = TextMuted
                            )
                        )
                    }
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Routes.SPLASH,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(Routes.SPLASH) {
                SplashScreen(
                    language = language,
                    onContinue = {
                        navController.navigate(Routes.HOME) {
                            popUpTo(Routes.SPLASH) { inclusive = true }
                        }
                    }
                )
            }

            composable(Routes.HOME) {
                HomeScreen(
                    language = language,
                    recentScans = scannerStateViewModel.scanHistory.take(3),
                    onOpenScanner = { navigateToTopLevel(Routes.SCANNER) },
                    onOpenHistory = { navigateToTopLevel(Routes.HISTORY) }
                )
            }

            composable(Routes.SCANNER) {
                ScannerScreen(
                    language = language,
                    selectedImage = scannerStateViewModel.selectedImage,
                    isAnalyzing = scannerStateViewModel.analysisState is AiAnalysisUiState.Loading,
                    onGalleryImageSelected = { uri, mimeType ->
                        scannerStateViewModel.selectGalleryUri(context.applicationContext, uri, mimeType)
                    },
                    onCameraPhotoCaptured = { uri ->
                        scannerStateViewModel.selectCameraUri(context.applicationContext, uri)
                    },
                    onRemoveImage = {
                        scannerStateViewModel.clearSelectedImage(context.applicationContext)
                    },
                    onScanImage = {
                        scannerStateViewModel.analyzeSelectedImage(context.applicationContext, language)
                        navController.navigate(Routes.AI_RESULT)
                    }
                )
            }

            composable(Routes.TRANSLATOR) {
                TranslatorScreen(
                    language = language,
                    viewModel = translatorViewModel,
                    scannerSelectedImage = scannerStateViewModel.selectedImage
                )
            }

            composable(Routes.AI_RESULT) {
                AiScanResultScreen(
                    language = language,
                    selectedImage = scannerStateViewModel.selectedImage,
                    analysisState = scannerStateViewModel.analysisState,
                    onBack = { navController.popBackStack() },
                    onTryAgain = {
                        scannerStateViewModel.analyzeSelectedImage(context.applicationContext, language)
                    }
                )
            }

            composable(Routes.HISTORY) {
                val combinedHistoryError = scannerStateViewModel.scanHistoryError
                    ?: translatorViewModel.historyError
                HistoryScreen(
                    language = language,
                    scanHistory = scannerStateViewModel.scanHistory,
                    translationHistory = translatorViewModel.historyRecords,
                    historyError = combinedHistoryError,
                    onRetryHistory = {
                        scannerStateViewModel.ensureHistoryLoaded(
                            context.applicationContext,
                            forceRestart = true
                        )
                        translatorViewModel.ensureHistoryLoaded(
                            context.applicationContext,
                            forceRestart = true
                        )
                    },
                    onDismissHistoryError = {
                        scannerStateViewModel.dismissHistoryError()
                        translatorViewModel.dismissHistoryError()
                    },
                    onOpenScanner = { navigateToTopLevel(Routes.SCANNER) },
                    onOpenTranslator = { navigateToTopLevel(Routes.TRANSLATOR) },
                    onReuseTranslation = { record ->
                        translatorViewModel.reuseHistoryRecord(record)
                        navigateToTopLevel(Routes.TRANSLATOR)
                    },
                    onDeleteScan = { id ->
                        scannerStateViewModel.deleteScanHistoryItem(context.applicationContext, id)
                    },
                    onClearAllScans = {
                        scannerStateViewModel.clearAllScanHistory(context.applicationContext)
                    },
                    onDeleteTranslation = { id ->
                        translatorViewModel.deleteHistoryRecord(context.applicationContext, id)
                    },
                    onClearAllTranslations = {
                        translatorViewModel.clearAllHistory(context.applicationContext)
                    }
                )
            }

            composable(Routes.PROFILE) {
                val combinedHistoryError = scannerStateViewModel.scanHistoryError
                    ?: translatorViewModel.historyError
                ProfileScreen(
                    language = language,
                    scanHistoryCount = scannerStateViewModel.scanHistory.size,
                    translationHistoryCount = translatorViewModel.historyRecords.size,
                    historyError = combinedHistoryError,
                    onDismissHistoryError = {
                        scannerStateViewModel.dismissHistoryError()
                        translatorViewModel.dismissHistoryError()
                    },
                    onLanguageChange = { selectedLang ->
                        language = selectedLang
                        AppLanguagePreferences.save(context.applicationContext, selectedLang)
                    },
                    onClearAllLocalHistory = {
                        scannerStateViewModel.clearAllScanHistory(context.applicationContext)
                        translatorViewModel.clearAllHistory(context.applicationContext)
                    },
                    onOpenAbout = { navController.navigate(Routes.ABOUT) },
                    onOpenPrivacyPolicy = { navController.navigate(Routes.PRIVACY) },
                    onReplaySplash = {
                        navController.navigate(Routes.SPLASH) {
                            popUpTo(Routes.HOME) { inclusive = true }
                        }
                    }
                )
            }

            composable(Routes.ABOUT) {
                AboutWorldLensScreen(
                    language = language,
                    onBack = { navController.popBackStack() }
                )
            }

            composable(Routes.PRIVACY) {
                PrivacyPolicyScreen(
                    language = language,
                    scanHistoryCount = scannerStateViewModel.scanHistory.size,
                    translationHistoryCount = translatorViewModel.historyRecords.size,
                    onClearAllLocalHistory = {
                        scannerStateViewModel.clearAllScanHistory(context.applicationContext)
                        translatorViewModel.clearAllHistory(context.applicationContext)
                    },
                    onBack = { navController.popBackStack() }
                )
            }
        }
    }
}
