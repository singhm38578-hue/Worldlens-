package com.worldlens.app.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.ErrorOutline
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.worldlens.app.BuildConfig
import com.worldlens.app.domain.model.AiAnalysisUiState
import com.worldlens.app.domain.model.AppLanguage
import com.worldlens.app.domain.model.ScanAnalysisError
import com.worldlens.app.domain.model.SelectedScanImage
import com.worldlens.app.ui.theme.BorderHairline
import com.worldlens.app.ui.theme.DeepNavy
import com.worldlens.app.ui.theme.ElectricBlue
import com.worldlens.app.ui.theme.TextMuted
import com.worldlens.app.ui.theme.TextPrimary
import com.worldlens.app.ui.theme.TextSecondary
import com.worldlens.app.ui.theme.WorldLensWhite

@Composable
fun AiScanResultScreen(
    language: AppLanguage,
    selectedImage: SelectedScanImage?,
    analysisState: AiAnalysisUiState,
    onBack: () -> Unit,
    onTryAgain: () -> Unit
) {
    val isEnglish = language == AppLanguage.ENGLISH
    val context = LocalContext.current

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onBack) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Outlined.ArrowBack,
                        contentDescription = if (isEnglish) "Back to Scanner" else "स्कैनर पर वापस जाएँ"
                    )
                }
                Text(
                    text = if (isEnglish) "Visual Analysis" else "दृश्य विश्लेषण",
                    style = MaterialTheme.typography.titleLarge,
                    color = TextPrimary
                )
            }
        }

        // Real selected image preview (Camera Bitmap or Gallery URI)
        if (selectedImage != null) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .aspectRatio(4f / 3f)
                        .clip(RoundedCornerShape(22.dp))
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
                                    "Analyzed gallery photo"
                                } else {
                                    "विश्लेषित गैलरी फ़ोटो"
                                },
                                contentScale = ContentScale.Fit,
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(8.dp)
                                    .clip(RoundedCornerShape(16.dp))
                            )
                        }

                        is SelectedScanImage.CameraUri -> {
                            AsyncImage(
                                model = ImageRequest.Builder(context)
                                    .data(selectedImage.uri)
                                    .crossfade(true)
                                    .build(),
                                contentDescription = if (isEnglish) {
                                    "Analyzed camera photo"
                                } else {
                                    "विश्लेषित कैमरा फ़ोटो"
                                },
                                contentScale = ContentScale.Fit,
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(8.dp)
                                    .clip(RoundedCornerShape(16.dp))
                            )
                        }

                        is SelectedScanImage.CameraPreviewBitmap -> {
                            val imageBitmap = remember(selectedImage.bitmap) {
                                selectedImage.bitmap.asImageBitmap()
                            }
                            Image(
                                bitmap = imageBitmap,
                                contentDescription = if (isEnglish) {
                                    "Analyzed camera photo"
                                } else {
                                    "विश्लेषित कैमरा फ़ोटो"
                                },
                                contentScale = ContentScale.Fit,
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(8.dp)
                                    .clip(RoundedCornerShape(16.dp))
                            )
                        }
                    }
                }
            }
        }

        // Loading / Success / Error Card
        item {
            when (analysisState) {
                AiAnalysisUiState.Idle,
                AiAnalysisUiState.Loading -> {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(22.dp),
                        colors = CardDefaults.cardColors(containerColor = WorldLensWhite),
                        border = BorderStroke(1.dp, BorderHairline)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 24.dp, vertical = 36.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            CircularProgressIndicator(
                                color = ElectricBlue,
                                modifier = Modifier.size(36.dp)
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                text = if (isEnglish) {
                                    "Analyzing image with WorldLens AI..."
                                } else {
                                    "WorldLens AI आपकी छवि का विश्लेषण कर रहा है..."
                                },
                                style = MaterialTheme.typography.titleMedium,
                                color = TextPrimary,
                                textAlign = TextAlign.Center
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = if (isEnglish) {
                                    "Sending image securely via Firebase AI Logic."
                                } else {
                                    "Firebase AI Logic के माध्यम से सुरक्षित रूप से विश्लेषण किया जा रहा है।"
                                },
                                style = MaterialTheme.typography.bodyMedium,
                                color = TextMuted,
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                }

                is AiAnalysisUiState.Success -> {
                    val report = analysisState.report
                    val confidenceLabel = when (report.confidenceLevel.lowercase()) {
                        "high" -> if (isEnglish) "High confidence" else "उच्च विश्वास"
                        "moderate" -> if (isEnglish) "Moderate confidence" else "मध्यम विश्वास"
                        "low" -> if (isEnglish) "Low confidence" else "कम विश्वास"
                        else -> if (isEnglish) "Uncertain identification" else "अनिश्चित पहचान"
                    }

                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(22.dp),
                        colors = CardDefaults.cardColors(containerColor = WorldLensWhite),
                        border = BorderStroke(1.dp, BorderHairline)
                    ) {
                        Column(
                            modifier = Modifier.padding(20.dp),
                            verticalArrangement = Arrangement.spacedBy(14.dp)
                        ) {
                            Text(
                                text = "${report.category} · $confidenceLabel · ${analysisState.modelName}",
                                style = MaterialTheme.typography.labelMedium,
                                color = ElectricBlue
                            )
                            Text(
                                text = report.objectName,
                                style = MaterialTheme.typography.headlineSmall,
                                color = TextPrimary
                            )

                            if (report.explanation.isNotBlank()) {
                                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Text(
                                        text = if (isEnglish) "Explanation" else "विवरण",
                                        style = MaterialTheme.typography.titleSmall,
                                        color = TextPrimary
                                    )
                                    Text(
                                        text = report.explanation,
                                        style = MaterialTheme.typography.bodyLarge,
                                        color = TextSecondary
                                    )
                                }
                            }

                            if (report.characteristics.isNotEmpty()) {
                                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Text(
                                        text = if (isEnglish) "Key Characteristics" else "मुख्य विशेषताएँ",
                                        style = MaterialTheme.typography.titleSmall,
                                        color = TextPrimary
                                    )
                                    report.characteristics.forEach { item ->
                                        Text(
                                            text = "• $item",
                                            style = MaterialTheme.typography.bodyMedium,
                                            color = TextSecondary
                                        )
                                    }
                                }
                            }

                            if (report.usefulFacts.isNotEmpty()) {
                                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Text(
                                        text = if (isEnglish) "Useful Facts" else "उपयोगी तथ्य",
                                        style = MaterialTheme.typography.titleSmall,
                                        color = TextPrimary
                                    )
                                    report.usefulFacts.forEach { fact ->
                                        Text(
                                            text = "• $fact",
                                            style = MaterialTheme.typography.bodyMedium,
                                            color = TextSecondary
                                        )
                                    }
                                }
                            }

                            if (report.confidenceExplanation.isNotBlank()) {
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(14.dp),
                                    colors = CardDefaults.cardColors(containerColor = Color(0xFFEEF4FF))
                                ) {
                                    Column(
                                        modifier = Modifier.padding(14.dp),
                                        verticalArrangement = Arrangement.spacedBy(4.dp)
                                    ) {
                                        Text(
                                            text = if (isEnglish) "Confidence & Uncertainty Note" else "विश्वास और अनिश्चितता नोट",
                                            style = MaterialTheme.typography.labelLarge,
                                            color = DeepNavy
                                        )
                                        Text(
                                            text = report.confidenceExplanation,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = TextSecondary
                                        )
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(4.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                OutlinedButton(
                                    onClick = onTryAgain,
                                    modifier = Modifier
                                        .weight(1f)
                                        .height(48.dp),
                                    shape = RoundedCornerShape(14.dp),
                                    border = BorderStroke(1.dp, BorderHairline)
                                ) {
                                    Icon(
                                        imageVector = Icons.Outlined.Refresh,
                                        contentDescription = null,
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(if (isEnglish) "Try Again" else "पुनः प्रयास करें")
                                }
                                Button(
                                    onClick = onBack,
                                    modifier = Modifier
                                        .weight(1f)
                                        .height(48.dp),
                                    shape = RoundedCornerShape(14.dp),
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = ElectricBlue,
                                        contentColor = WorldLensWhite
                                    )
                                ) {
                                    Text(if (isEnglish) "New Scan" else "नया स्कैन")
                                }
                            }
                        }
                    }
                }

                is AiAnalysisUiState.Error -> {
                    val (errorTitle, errorDescription) = errorCopy(analysisState.errorType, isEnglish)
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(22.dp),
                        colors = CardDefaults.cardColors(containerColor = WorldLensWhite),
                        border = BorderStroke(1.dp, Color(0xFFFECACA))
                    ) {
                        Column(
                            modifier = Modifier.padding(20.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Outlined.ErrorOutline,
                                    contentDescription = null,
                                    tint = Color(0xFFB91C1C),
                                    modifier = Modifier.size(22.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = errorTitle,
                                    style = MaterialTheme.typography.titleMedium,
                                    color = TextPrimary
                                )
                            }
                            Text(
                                text = errorDescription,
                                style = MaterialTheme.typography.bodyMedium,
                                color = TextSecondary
                            )
                            if (BuildConfig.DEBUG && !analysisState.technicalDetail.isNullOrBlank()) {
                                Text(
                                    text = analysisState.technicalDetail,
                                    style = MaterialTheme.typography.labelSmall,
                                    color = TextMuted
                                )
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                Button(
                                    onClick = onTryAgain,
                                    modifier = Modifier
                                        .weight(1f)
                                        .height(48.dp),
                                    shape = RoundedCornerShape(14.dp),
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = ElectricBlue,
                                        contentColor = WorldLensWhite
                                    )
                                ) {
                                    Icon(
                                        imageVector = Icons.Outlined.Refresh,
                                        contentDescription = null,
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(if (isEnglish) "Try Again" else "पुनः प्रयास करें")
                                }
                                OutlinedButton(
                                    onClick = onBack,
                                    modifier = Modifier
                                        .weight(1f)
                                        .height(48.dp),
                                    shape = RoundedCornerShape(14.dp),
                                    border = BorderStroke(1.dp, BorderHairline)
                                ) {
                                    Text(if (isEnglish) "Back" else "वापस")
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

private fun errorCopy(type: ScanAnalysisError, isEnglish: Boolean): Pair<String, String> =
    when (type) {
        ScanAnalysisError.NETWORK -> if (isEnglish) {
            "Network connection failed" to "Please check your internet connection and tap Try Again."
        } else {
            "नेटवर्क कनेक्शन विफल" to "कृपया अपना इंटरनेट कनेक्शन जाँचें और पुनः प्रयास करें।"
        }

        ScanAnalysisError.QUOTA_EXCEEDED -> if (isEnglish) {
            "AI quota limit reached" to "The Gemini API request quota was temporarily exceeded. Please wait a moment and try again."
        } else {
            "AI सीमा समाप्त हो गई" to "Gemini API अनुरोध सीमा अस्थायी रूप से पूरी हो गई है। कृपया थोड़ी देर बाद पुनः प्रयास करें।"
        }

        ScanAnalysisError.INVALID_IMAGE -> if (isEnglish) {
            "Invalid or unreadable image" to "WorldLens could not decode this image safely. Try retaking the photo or selecting another JPEG or PNG image."
        } else {
            "अमान्य या अपठनीय छवि" to "WorldLens इस छवि को सुरक्षित रूप से पढ़ नहीं सका। कृपया नई फ़ोटो लें या दूसरी छवि चुनें।"
        }

        ScanAnalysisError.AI_UNAVAILABLE -> if (isEnglish) {
            "AI service unavailable" to "WorldLens AI is temporarily unavailable right now. Please try again in a few moments."
        } else {
            "AI सेवा उपलब्ध नहीं है" to "WorldLens AI सेवा वर्तमान में अस्थायी रूप से अनुपलब्ध है। कृपया थोड़ी देर बाद पुनः प्रयास करें।"
        }

        ScanAnalysisError.UNKNOWN -> if (isEnglish) {
            "Analysis could not be completed" to "An unexpected error occurred while analyzing your image. Tap Try Again to retry."
        } else {
            "विश्लेषण पूरा नहीं हो सका" to "आपकी छवि का विश्लेषण करते समय एक अप्रत्याशित त्रुटि हुई। कृपया पुनः प्रयास करें।"
        }
    }
