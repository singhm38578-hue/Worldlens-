package com.worldlens.app.ui.screens

import android.content.ActivityNotFoundException
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CameraAlt
import androidx.compose.material.icons.outlined.CenterFocusWeak
import androidx.compose.material.icons.outlined.DeleteOutline
import androidx.compose.material.icons.outlined.ErrorOutline
import androidx.compose.material.icons.outlined.PhotoLibrary
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.SwapHoriz
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.worldlens.app.data.image.CameraPhotoFileManager
import com.worldlens.app.data.image.ImageInputValidator
import com.worldlens.app.data.image.ImageValidationResult
import com.worldlens.app.data.local.AppSettingsHelper
import com.worldlens.app.data.local.rememberIsOnline
import com.worldlens.app.domain.model.AppLanguage
import com.worldlens.app.domain.model.SelectedScanImage
import com.worldlens.app.ui.components.PrototypeNoticeBanner
import com.worldlens.app.ui.theme.BorderHairline
import com.worldlens.app.ui.theme.DeepNavy
import com.worldlens.app.ui.theme.DeepNavyElevated
import com.worldlens.app.ui.theme.ElectricBlue
import com.worldlens.app.ui.theme.TextMuted
import com.worldlens.app.ui.theme.TextPrimary
import com.worldlens.app.ui.theme.WorldLensWhite
import kotlinx.coroutines.launch

private enum class ScannerFeedbackState {
    NONE,
    GALLERY_CANCELLED,
    CAMERA_CANCELLED,
    CAMERA_PERMISSION_DENIED,
    PICKER_UNAVAILABLE,
    CAMERA_UNAVAILABLE,
    UNSUPPORTED_FORMAT,
    FILE_TOO_LARGE,
    IMAGE_LOAD_ERROR
}

@Composable
fun ScannerScreen(
    language: AppLanguage,
    selectedImage: SelectedScanImage?,
    isAnalyzing: Boolean,
    onGalleryImageSelected: (Uri, String?) -> Unit,
    onCameraPhotoCaptured: (Uri) -> Unit,
    onRemoveImage: () -> Unit,
    onScanImage: () -> Unit
) {
    val isEnglish = language == AppLanguage.ENGLISH
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val isOnline by rememberIsOnline()

    var feedbackState by remember { mutableStateOf(ScannerFeedbackState.NONE) }
    var imageLoadFailed by remember(selectedImage) { mutableStateOf(false) }
    var isValidatingImage by remember { mutableStateOf(false) }

    // Stored with rememberSaveable so the pending FileProvider URI survives Activity
    // recreation if Android destroys the calling activity while the camera app is open.
    var pendingCameraUriString by rememberSaveable { mutableStateOf<String?>(null) }

    fun handlePickedGalleryUri(uri: Uri?) {
        if (uri == null) {
            feedbackState = ScannerFeedbackState.GALLERY_CANCELLED
            return
        }
        isValidatingImage = true
        feedbackState = ScannerFeedbackState.NONE
        coroutineScope.launch {
            when (val validation = ImageInputValidator.validateUri(context.applicationContext, uri)) {
                is ImageValidationResult.Valid -> {
                    imageLoadFailed = false
                    feedbackState = ScannerFeedbackState.NONE
                    onGalleryImageSelected(uri, validation.mimeType)
                }

                is ImageValidationResult.UnsupportedFormat -> {
                    feedbackState = ScannerFeedbackState.UNSUPPORTED_FORMAT
                }

                ImageValidationResult.FileTooLarge -> {
                    feedbackState = ScannerFeedbackState.FILE_TOO_LARGE
                }

                ImageValidationResult.Unreadable -> {
                    feedbackState = ScannerFeedbackState.IMAGE_LOAD_ERROR
                }
            }
            isValidatingImage = false
        }
    }

    // Primary modern Android Photo Picker (requires no storage permissions)
    val photoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri: Uri? ->
        handlePickedGalleryUri(uri)
    }

    // Safe fallback if a device lacks Photo Picker support (still requires no storage permissions)
    val fallbackGalleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        handlePickedGalleryUri(uri)
    }

    // Full-resolution device camera capture using private FileProvider cache URI
    // (delegates to the system camera app without requesting unnecessary CAMERA or storage permissions)
    val takePictureLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicture()
    ) { success: Boolean ->
        val capturedUri = pendingCameraUriString?.let(Uri::parse)
        pendingCameraUriString = null

        if (!success || capturedUri == null) {
            CameraPhotoFileManager.deleteCaptureIfOwned(context.applicationContext, capturedUri)
            feedbackState = ScannerFeedbackState.CAMERA_CANCELLED
            return@rememberLauncherForActivityResult
        }

        isValidatingImage = true
        feedbackState = ScannerFeedbackState.NONE
        coroutineScope.launch {
            val nonEmpty = CameraPhotoFileManager.hasNonEmptyFile(context.applicationContext, capturedUri)
            if (!nonEmpty) {
                CameraPhotoFileManager.deleteCaptureIfOwned(context.applicationContext, capturedUri)
                feedbackState = ScannerFeedbackState.IMAGE_LOAD_ERROR
                isValidatingImage = false
                return@launch
            }

            when (ImageInputValidator.validateUri(context.applicationContext, capturedUri)) {
                is ImageValidationResult.Valid -> {
                    imageLoadFailed = false
                    feedbackState = ScannerFeedbackState.NONE
                    onCameraPhotoCaptured(capturedUri)
                }

                is ImageValidationResult.UnsupportedFormat -> {
                    CameraPhotoFileManager.deleteCaptureIfOwned(context.applicationContext, capturedUri)
                    feedbackState = ScannerFeedbackState.UNSUPPORTED_FORMAT
                }

                ImageValidationResult.FileTooLarge -> {
                    CameraPhotoFileManager.deleteCaptureIfOwned(context.applicationContext, capturedUri)
                    feedbackState = ScannerFeedbackState.FILE_TOO_LARGE
                }

                ImageValidationResult.Unreadable -> {
                    CameraPhotoFileManager.deleteCaptureIfOwned(context.applicationContext, capturedUri)
                    feedbackState = ScannerFeedbackState.IMAGE_LOAD_ERROR
                }
            }
            isValidatingImage = false
        }
    }

    fun openGalleryPicker() {
        feedbackState = ScannerFeedbackState.NONE
        try {
            photoPickerLauncher.launch(
                PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
            )
        } catch (_: ActivityNotFoundException) {
            try {
                fallbackGalleryLauncher.launch("image/*")
            } catch (_: Exception) {
                feedbackState = ScannerFeedbackState.PICKER_UNAVAILABLE
            }
        } catch (_: SecurityException) {
            feedbackState = ScannerFeedbackState.PICKER_UNAVAILABLE
        } catch (_: Exception) {
            feedbackState = ScannerFeedbackState.PICKER_UNAVAILABLE
        }
    }

    fun launchCameraCapture() {
        feedbackState = ScannerFeedbackState.NONE
        val tempUri = try {
            CameraPhotoFileManager.createTempCaptureUri(context.applicationContext)
        } catch (_: Exception) {
            feedbackState = ScannerFeedbackState.CAMERA_UNAVAILABLE
            return
        }

        pendingCameraUriString = tempUri.toString()
        try {
            takePictureLauncher.launch(tempUri)
        } catch (_: SecurityException) {
            pendingCameraUriString = null
            CameraPhotoFileManager.deleteCaptureIfOwned(context.applicationContext, tempUri)
            feedbackState = ScannerFeedbackState.CAMERA_PERMISSION_DENIED
        } catch (_: ActivityNotFoundException) {
            pendingCameraUriString = null
            CameraPhotoFileManager.deleteCaptureIfOwned(context.applicationContext, tempUri)
            feedbackState = ScannerFeedbackState.CAMERA_UNAVAILABLE
        } catch (_: Exception) {
            pendingCameraUriString = null
            CameraPhotoFileManager.deleteCaptureIfOwned(context.applicationContext, tempUri)
            feedbackState = ScannerFeedbackState.CAMERA_UNAVAILABLE
        }
    }

    val controlsEnabled = !isAnalyzing && !isValidatingImage
    val canScan = selectedImage != null && !imageLoadFailed && !isAnalyzing && !isValidatingImage

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Column {
            Text(
                text = if (isEnglish) "Smart Scanner" else "स्मार्ट स्कैनर",
                style = MaterialTheme.typography.headlineMedium,
                color = TextPrimary
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = if (isEnglish) {
                    "Capture a photo with your camera or choose an image from your gallery to analyze with Gemini AI."
                } else {
                    "Gemini AI के साथ विश्लेषण करने के लिए अपने कैमरे से फ़ोटो लें या गैलरी से छवि चुनें।"
                },
                style = MaterialTheme.typography.bodyMedium,
                color = TextMuted
            )
        }

        if (!isOnline) {
            PrototypeNoticeBanner(
                title = if (isEnglish) "No internet connection" else "इंटरनेट कनेक्शन नहीं है",
                body = if (isEnglish) {
                    "You can capture or choose an image now, but an internet connection is required to run Gemini visual analysis."
                } else {
                    "आप अभी फ़ोटो ले सकते हैं या चुन सकते हैं, लेकिन Gemini दृश्य विश्लेषण के लिए इंटरनेट कनेक्शन आवश्यक है।"
                }
            )
        }

        // Shared Image Preview / Friendly Empty State Container
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(4f / 3f),
            shape = RoundedCornerShape(24.dp),
            color = DeepNavy
        ) {
            if (isValidatingImage) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(24.dp),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    CircularProgressIndicator(
                        color = ElectricBlue,
                        modifier = Modifier.size(32.dp)
                    )
                    Spacer(modifier = Modifier.height(14.dp))
                    Text(
                        text = if (isEnglish) "Preparing selected image..." else "चयनित छवि तैयार की जा रही है...",
                        style = MaterialTheme.typography.bodyMedium,
                        color = WorldLensWhite,
                        textAlign = TextAlign.Center
                    )
                }
            } else if (selectedImage != null && !imageLoadFailed) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(DeepNavy),
                    contentAlignment = Alignment.Center
                ) {
                    when (selectedImage) {
                        is SelectedScanImage.GalleryUri -> {
                            AsyncImage(
                                model = ImageRequest.Builder(context)
                                    .data(selectedImage.uri)
                                    .crossfade(true)
                                    .build(),
                                contentDescription = if (isEnglish) {
                                    "Selected image from device gallery"
                                } else {
                                    "डिवाइस गैलरी से चयनित छवि"
                                },
                                contentScale = ContentScale.Fit,
                                onError = {
                                    imageLoadFailed = true
                                    feedbackState = ScannerFeedbackState.IMAGE_LOAD_ERROR
                                },
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(8.dp)
                                    .clip(RoundedCornerShape(18.dp))
                            )
                        }

                        is SelectedScanImage.CameraUri -> {
                            AsyncImage(
                                model = ImageRequest.Builder(context)
                                    .data(selectedImage.uri)
                                    .crossfade(true)
                                    .build(),
                                contentDescription = if (isEnglish) {
                                    "Captured photo from device camera"
                                } else {
                                    "डिवाइस कैमरे से ली गई फ़ोटो"
                                },
                                contentScale = ContentScale.Fit,
                                onError = {
                                    imageLoadFailed = true
                                    feedbackState = ScannerFeedbackState.IMAGE_LOAD_ERROR
                                },
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(8.dp)
                                    .clip(RoundedCornerShape(18.dp))
                            )
                        }

                        is SelectedScanImage.CameraPreviewBitmap -> {
                            val imageBitmap = remember(selectedImage.bitmap) {
                                selectedImage.bitmap.asImageBitmap()
                            }
                            Image(
                                bitmap = imageBitmap,
                                contentDescription = if (isEnglish) {
                                    "Captured camera photo"
                                } else {
                                    "कैमरे से ली गई फ़ोटो"
                                },
                                contentScale = ContentScale.Fit,
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(8.dp)
                                    .clip(RoundedCornerShape(18.dp))
                            )
                        }
                    }
                }
            } else {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(24.dp),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(
                        modifier = Modifier
                            .size(64.dp)
                            .clip(RoundedCornerShape(18.dp))
                            .background(DeepNavyElevated),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = if (imageLoadFailed) {
                                Icons.Outlined.ErrorOutline
                            } else {
                                Icons.Outlined.CameraAlt
                            },
                            contentDescription = null,
                            tint = ElectricBlue,
                            modifier = Modifier.size(30.dp)
                        )
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = if (imageLoadFailed) {
                            if (isEnglish) "Unable to display selected image" else "चयनित छवि प्रदर्शित नहीं हो सकी"
                        } else {
                            if (isEnglish) "No image selected yet" else "अभी तक कोई छवि नहीं चुनी गई"
                        },
                        style = MaterialTheme.typography.titleMedium,
                        color = WorldLensWhite,
                        textAlign = TextAlign.Center
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = if (imageLoadFailed) {
                            if (isEnglish) {
                                "Please take a new photo or pick a supported JPEG, PNG, WebP, or HEIC image."
                            } else {
                                "कृपया नई फ़ोटो लें या समर्थित JPEG, PNG, WebP या HEIC छवि चुनें।"
                            }
                        } else {
                            if (isEnglish) {
                                "Tap Take Photo to capture with your device camera, or Gallery to choose an image."
                            } else {
                                "अपने डिवाइस कैमरे से फ़ोटो लेने के लिए फ़ोटो लें पर टैप करें, या छवि चुनने के लिए गैलरी खोलें।"
                            }
                        },
                        style = MaterialTheme.typography.bodyMedium,
                        color = WorldLensWhite.copy(alpha = 0.74f),
                        textAlign = TextAlign.Center
                    )
                }
            }
        }

        // Source metadata caption when an image is loaded
        if (selectedImage != null && !imageLoadFailed && !isValidatingImage) {
            val sourceSummary = when (selectedImage) {
                is SelectedScanImage.CameraUri -> {
                    if (isEnglish) {
                        "Camera photo · Full resolution JPEG ready to scan"
                    } else {
                        "कैमरा फ़ोटो · स्कैन के लिए पूर्ण रिज़ॉल्यूशन JPEG तैयार"
                    }
                }

                is SelectedScanImage.CameraPreviewBitmap -> {
                    val dims = "${selectedImage.bitmap.width}×${selectedImage.bitmap.height}"
                    if (isEnglish) {
                        "Camera photo · $dims"
                    } else {
                        "कैमरा फ़ोटो · $dims"
                    }
                }

                is SelectedScanImage.GalleryUri -> {
                    val format = ImageInputValidator.formatDisplayLabel(selectedImage.mimeType)
                    if (isEnglish) {
                        "Gallery image · $format · Ready to scan"
                    } else {
                        "गैलरी छवि · $format · स्कैन के लिए तैयार"
                    }
                }
            }
            Text(
                text = sourceSummary,
                style = MaterialTheme.typography.labelSmall,
                color = TextMuted
            )
        }

        // Input Controls: Take Photo & Gallery before selection; Retake, Change Image & Remove Image after selection
        if (selectedImage == null) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedButton(
                    onClick = { launchCameraCapture() },
                    enabled = controlsEnabled,
                    modifier = Modifier
                        .weight(1f)
                        .height(52.dp),
                    shape = RoundedCornerShape(16.dp),
                    border = BorderStroke(1.dp, BorderHairline),
                    colors = ButtonDefaults.outlinedButtonColors(
                        containerColor = WorldLensWhite,
                        contentColor = TextPrimary
                    )
                ) {
                    Icon(
                        imageVector = Icons.Outlined.CameraAlt,
                        contentDescription = null,
                        tint = ElectricBlue,
                        modifier = Modifier.size(19.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = if (isEnglish) "Take Photo" else "फ़ोटो लें",
                        style = MaterialTheme.typography.labelLarge,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                OutlinedButton(
                    onClick = { openGalleryPicker() },
                    enabled = controlsEnabled,
                    modifier = Modifier
                        .weight(1f)
                        .height(52.dp),
                    shape = RoundedCornerShape(16.dp),
                    border = BorderStroke(1.dp, BorderHairline),
                    colors = ButtonDefaults.outlinedButtonColors(
                        containerColor = WorldLensWhite,
                        contentColor = TextPrimary
                    )
                ) {
                    Icon(
                        imageVector = Icons.Outlined.PhotoLibrary,
                        contentDescription = null,
                        tint = ElectricBlue,
                        modifier = Modifier.size(19.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = if (isEnglish) "Gallery" else "गैलरी",
                        style = MaterialTheme.typography.labelLarge,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OutlinedButton(
                        onClick = { launchCameraCapture() },
                        enabled = controlsEnabled,
                        modifier = Modifier
                            .weight(1f)
                            .height(48.dp),
                        shape = RoundedCornerShape(14.dp),
                        border = BorderStroke(1.dp, BorderHairline),
                        colors = ButtonDefaults.outlinedButtonColors(
                            containerColor = WorldLensWhite,
                            contentColor = TextPrimary
                        )
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.Refresh,
                            contentDescription = null,
                            tint = ElectricBlue,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = if (isEnglish) "Retake" else "दोबारा लें",
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }

                    OutlinedButton(
                        onClick = { openGalleryPicker() },
                        enabled = controlsEnabled,
                        modifier = Modifier
                            .weight(1f)
                            .height(48.dp),
                        shape = RoundedCornerShape(14.dp),
                        border = BorderStroke(1.dp, BorderHairline),
                        colors = ButtonDefaults.outlinedButtonColors(
                            containerColor = WorldLensWhite,
                            contentColor = TextPrimary
                        )
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.SwapHoriz,
                            contentDescription = null,
                            tint = ElectricBlue,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = if (isEnglish) "Change Image" else "छवि बदलें",
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                OutlinedButton(
                    onClick = {
                        onRemoveImage()
                        imageLoadFailed = false
                        feedbackState = ScannerFeedbackState.NONE
                    },
                    enabled = controlsEnabled,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(46.dp),
                    shape = RoundedCornerShape(14.dp),
                    border = BorderStroke(1.dp, BorderHairline),
                    colors = ButtonDefaults.outlinedButtonColors(
                        containerColor = WorldLensWhite,
                        contentColor = Color(0xFFB91C1C)
                    )
                ) {
                    Icon(
                        imageVector = Icons.Outlined.DeleteOutline,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = if (isEnglish) "Remove Image" else "छवि हटाएँ",
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }

        // Primary Scan Button — triggers real Firebase AI Logic Gemini analysis
        Button(
            onClick = {
                if (canScan) {
                    onScanImage()
                }
            },
            enabled = canScan,
            modifier = Modifier
                .fillMaxWidth()
                .height(54.dp),
            shape = RoundedCornerShape(16.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = ElectricBlue,
                contentColor = WorldLensWhite,
                disabledContainerColor = Color(0xFFE2E8F0),
                disabledContentColor = TextMuted
            )
        ) {
            if (isAnalyzing) {
                CircularProgressIndicator(
                    color = ElectricBlue,
                    strokeWidth = 2.dp,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(10.dp))
                Text(
                    text = if (isEnglish) "Analyzing..." else "विश्लेषण हो रहा है...",
                    style = MaterialTheme.typography.labelLarge
                )
            } else {
                Icon(
                    imageVector = Icons.Outlined.CenterFocusWeak,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = if (isEnglish) "Scan" else "स्कैन करें",
                    style = MaterialTheme.typography.labelLarge
                )
            }
        }

        // Graceful Permission, Cancellation, Format & Picker Error Feedback
        when (feedbackState) {
            ScannerFeedbackState.GALLERY_CANCELLED -> {
                PrototypeNoticeBanner(
                    title = if (isEnglish) "Gallery selection cancelled" else "गैलरी चयन रद्द किया गया",
                    body = if (isEnglish) {
                        "No new image was chosen. You can tap Gallery or Take Photo anytime."
                    } else {
                        "कोई नई छवि नहीं चुनी गई। आप कभी भी गैलरी या फ़ोटो लें चुन सकते हैं।"
                    }
                )
            }

            ScannerFeedbackState.CAMERA_CANCELLED -> {
                PrototypeNoticeBanner(
                    title = if (isEnglish) "Camera capture cancelled" else "कैमरा कैप्चर रद्द किया गया",
                    body = if (isEnglish) {
                        "No photo was captured. Tap Take Photo or Retake whenever you are ready."
                    } else {
                        "कोई फ़ोटो नहीं ली गई। तैयार होने पर फिर से फ़ोटो लें पर टैप करें।"
                    }
                )
            }

            ScannerFeedbackState.CAMERA_PERMISSION_DENIED -> {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    PrototypeNoticeBanner(
                        title = if (isEnglish) "Camera permission denied" else "कैमरा अनुमति अस्वीकृत",
                        body = if (isEnglish) {
                            "Camera access was blocked by your device or system camera settings. Open Android App Settings to allow access, or choose a photo from Gallery instead."
                        } else {
                            "आपके डिवाइस या सिस्टम कैमरा सेटिंग्स द्वारा कैमरा एक्सेस रोका गया है। अनुमति देने के लिए Android ऐप सेटिंग्स खोलें, या गैलरी से फ़ोटो चुनें।"
                        }
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        OutlinedButton(
                            onClick = { AppSettingsHelper.openAppSettings(context) },
                            modifier = Modifier
                                .weight(1f)
                                .height(48.dp),
                            shape = RoundedCornerShape(14.dp),
                            border = BorderStroke(1.dp, BorderHairline),
                            colors = ButtonDefaults.outlinedButtonColors(
                                containerColor = WorldLensWhite,
                                contentColor = TextPrimary
                            )
                        ) {
                            Text(
                                text = if (isEnglish) "Open App Settings" else "ऐप सेटिंग्स खोलें",
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        OutlinedButton(
                            onClick = { openGalleryPicker() },
                            modifier = Modifier
                                .weight(1f)
                                .height(48.dp),
                            shape = RoundedCornerShape(14.dp),
                            border = BorderStroke(1.dp, BorderHairline),
                            colors = ButtonDefaults.outlinedButtonColors(
                                containerColor = WorldLensWhite,
                                contentColor = ElectricBlue
                            )
                        ) {
                            Text(
                                text = if (isEnglish) "Use Gallery" else "गैलरी चुनें",
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                }
            }

            ScannerFeedbackState.PICKER_UNAVAILABLE -> {
                PrototypeNoticeBanner(
                    title = if (isEnglish) "Photo Picker unavailable" else "फ़ोटो पिकर उपलब्ध नहीं है",
                    body = if (isEnglish) {
                        "Could not open a gallery app on this device. Please ensure a photo picker or gallery app is installed."
                    } else {
                        "इस डिवाइस पर गैलरी ऐप नहीं खुल सका। कृपया सुनिश्चित करें कि फ़ोटो पिकर या गैलरी ऐप उपलब्ध है।"
                    }
                )
            }

            ScannerFeedbackState.CAMERA_UNAVAILABLE -> {
                PrototypeNoticeBanner(
                    title = if (isEnglish) "Camera app unavailable" else "कैमरा ऐप उपलब्ध नहीं है",
                    body = if (isEnglish) {
                        "Could not launch the device camera right now. You can still choose an image from Gallery."
                    } else {
                        "इस डिवाइस पर कैमरा ऐप अभी नहीं खुल सका। आप अभी भी गैलरी से छवि चुन सकते हैं।"
                    }
                )
            }

            ScannerFeedbackState.UNSUPPORTED_FORMAT -> {
                PrototypeNoticeBanner(
                    title = if (isEnglish) "Unsupported file format" else "असमर्थित फ़ाइल फ़ॉर्मेट",
                    body = if (isEnglish) {
                        "Please select a standard JPEG, PNG, WebP, HEIC/HEIF, or BMP photo. Vector, video, and document files are not supported here."
                    } else {
                        "कृपया मानक JPEG, PNG, WebP, HEIC/HEIF या BMP छवि चुनें। वेक्टर, वीडियो या दस्तावेज़ फ़ाइलें यहाँ समर्थित नहीं हैं।"
                    }
                )
            }

            ScannerFeedbackState.FILE_TOO_LARGE -> {
                PrototypeNoticeBanner(
                    title = if (isEnglish) "Image file is too large" else "छवि फ़ाइल बहुत बड़ी है",
                    body = if (isEnglish) {
                        "Please choose an image smaller than 25 MB, or capture a new photo with your camera."
                    } else {
                        "कृपया 25 MB से छोटी छवि चुनें, या अपने कैमरे से नई फ़ोटो लें।"
                    }
                )
            }

            ScannerFeedbackState.IMAGE_LOAD_ERROR -> {
                PrototypeNoticeBanner(
                    title = if (isEnglish) "Image could not be loaded" else "छवि लोड नहीं हो सकी",
                    body = if (isEnglish) {
                        "The selected file appears empty or unreadable. Try taking a new photo or choosing another JPEG, PNG, or WebP image."
                    } else {
                        "चयनित फ़ाइल खाली या अपठनीय है। कृपया नई फ़ोटो लें या कोई अन्य JPEG, PNG या WebP छवि चुनें।"
                    }
                )
            }

            ScannerFeedbackState.NONE -> {
                Text(
                    text = if (isEnglish) {
                        "Camera and gallery access run only when you tap Take Photo or Gallery via Android's system pickers — no background camera or broad storage permission is requested."
                    } else {
                        "कैमरा और गैलरी केवल तब खुलते हैं जब आप फ़ोटो लें या गैलरी चुनते हैं — कोई बैकग्राउंड कैमरा या व्यापक स्टोरेज अनुमति नहीं माँगी जाती।"
                    },
                    style = MaterialTheme.typography.labelSmall,
                    color = TextMuted
                )
            }
        }
    }
}
