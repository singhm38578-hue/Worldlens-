package com.worldlens.app.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.CenterFocusWeak
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.worldlens.app.BuildConfig
import com.worldlens.app.domain.model.AppLanguage
import com.worldlens.app.ui.theme.BorderHairline
import com.worldlens.app.ui.theme.DeepNavy
import com.worldlens.app.ui.theme.ElectricBlue
import com.worldlens.app.ui.theme.TextMuted
import com.worldlens.app.ui.theme.TextPrimary
import com.worldlens.app.ui.theme.TextSecondary
import com.worldlens.app.ui.theme.WorldLensSurface
import com.worldlens.app.ui.theme.WorldLensWhite

@Composable
fun AboutWorldLensScreen(
    language: AppLanguage,
    onBack: () -> Unit
) {
    val isEnglish = language == AppLanguage.ENGLISH

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(WorldLensSurface)
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.fillMaxWidth()
        ) {
            IconButton(onClick = onBack) {
                Icon(
                    imageVector = Icons.AutoMirrored.Outlined.ArrowBack,
                    contentDescription = if (isEnglish) "Back to Settings" else "सेटिंग्स पर वापस जाएँ",
                    tint = TextPrimary
                )
            }
            Text(
                text = if (isEnglish) "About WorldLens" else "WorldLens के बारे में",
                style = MaterialTheme.typography.titleLarge,
                color = TextPrimary,
                modifier = Modifier.semantics { heading() }
            )
        }

        // Brand Identity Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = DeepNavy)
        ) {
            Column(
                modifier = Modifier.padding(22.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Surface(
                    shape = RoundedCornerShape(14.dp),
                    color = ElectricBlue,
                    modifier = Modifier.size(48.dp)
                ) {
                    Icon(
                        imageVector = Icons.Outlined.CenterFocusWeak,
                        contentDescription = null,
                        tint = WorldLensWhite,
                        modifier = Modifier.padding(11.dp)
                    )
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "WORLDLENS",
                    style = MaterialTheme.typography.headlineSmall,
                    color = WorldLensWhite,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = if (isEnglish) {
                        "See the World. Understand Everything."
                    } else {
                        "दुनिया देखें। सब कुछ समझें।"
                    },
                    style = MaterialTheme.typography.bodyMedium,
                    color = WorldLensWhite.copy(alpha = 0.85f)
                )
                Text(
                    text = if (isEnglish) {
                        "Version ${BuildConfig.VERSION_NAME} (Build ${BuildConfig.VERSION_CODE})"
                    } else {
                        "संस्करण ${BuildConfig.VERSION_NAME} (बिल्ड ${BuildConfig.VERSION_CODE})"
                    },
                    style = MaterialTheme.typography.labelMedium,
                    color = ElectricBlue
                )
            }
        }

        // Core Capabilities
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
                    text = if (isEnglish) "What WorldLens Does" else "WorldLens क्या करता है",
                    style = MaterialTheme.typography.titleMedium,
                    color = TextPrimary,
                    modifier = Modifier.semantics { heading() }
                )

                AboutFeatureBlock(
                    title = if (isEnglish) "AI Smart Visual Scanner" else "AI स्मार्ट दृश्य स्कैनर",
                    body = if (isEnglish) {
                        "Identify everyday objects, plants, animals, products, machines, and places from photos captured with your camera or selected from your gallery."
                    } else {
                        "कैमरे से ली गई या गैलरी से चुनी गई तस्वीरों से वस्तुओं, पौधों, जानवरों, उत्पादों, मशीनों और स्थानों की पहचान करें।"
                    }
                )

                HorizontalDivider(color = BorderHairline)

                AboutFeatureBlock(
                    title = if (isEnglish) "Global AI Translator" else "ग्लोबल AI अनुवादक",
                    body = if (isEnglish) {
                        "Translate text, printed text in photos, spoken phrases, and two-person conversations across 100+ supported languages while preserving context and meaning."
                    } else {
                        "संदर्भ और अर्थ को सुरक्षित रखते हुए 100+ समर्थित भाषाओं में टेक्स्ट, फ़ोटो में लिखा टेक्स्ट, आवाज़ और दो-व्यक्ति संवाद का अनुवाद करें।"
                    }
                )

                HorizontalDivider(color = BorderHairline)

                AboutFeatureBlock(
                    title = if (isEnglish) "Local On-Device History" else "स्थानीय ऑन-डिवाइस इतिहास",
                    body = if (isEnglish) {
                        "Keep your past scan reports and translations stored locally on your device with timestamps, full viewing, individual deletion, and Clear All controls."
                    } else {
                        "अपने पिछले स्कैन परिणाम और अनुवाद दिनांक व समय के साथ केवल इस डिवाइस पर सुरक्षित रखें और आवश्यकता होने पर कभी भी हटाएँ।"
                    }
                )
            }
        }

        // Honest AI Notice
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(22.dp),
            colors = CardDefaults.cardColors(containerColor = WorldLensWhite),
            border = BorderStroke(1.dp, BorderHairline)
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = if (isEnglish) "Responsible AI Use" else "ज़िम्मेदार AI उपयोग",
                    style = MaterialTheme.typography.titleMedium,
                    color = TextPrimary,
                    modifier = Modifier.semantics { heading() }
                )
                Text(
                    text = if (isEnglish) {
                        "AI visual recognition and translation can occasionally make mistakes, especially with blurry photos or specialized subjects. Always double-check important medical, legal, electrical, or safety information with qualified sources."
                    } else {
                        "AI दृश्य पहचान और अनुवाद कभी-कभी त्रुटि कर सकते हैं, विशेषकर धुंधली तस्वीरों या विशिष्ट विषयों में। महत्वपूर्ण चिकित्सा, कानूनी, विद्युत या सुरक्षा जानकारी की पुष्टि हमेशा योग्य स्रोतों से करें।"
                    },
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextSecondary
                )
            }
        }

        // Contact & Support Placeholder (Clearly Marked Not Configured)
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(22.dp),
            colors = CardDefaults.cardColors(containerColor = WorldLensWhite),
            border = BorderStroke(1.dp, BorderHairline)
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Text(
                    text = if (isEnglish) "Contact & Support" else "संपर्क और सहायता",
                    style = MaterialTheme.typography.titleMedium,
                    color = TextPrimary,
                    modifier = Modifier.semantics { heading() }
                )
                Text(
                    text = if (isEnglish) {
                        "Support contact: Not configured yet"
                    } else {
                        "सहायता संपर्क: अभी कॉन्फ़िगर नहीं किया गया"
                    },
                    style = MaterialTheme.typography.labelLarge,
                    color = TextMuted,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = if (isEnglish) {
                        "No support email address or help URL has been configured for this build yet. Add your official support contact before public Play Store distribution."
                    } else {
                        "इस बिल्ड के लिए अभी कोई सहायता ईमेल या वेब लिंक कॉन्फ़िगर नहीं किया गया है। सार्वजनिक रिलीज़ से पहले अपना आधिकारिक सहायता संपर्क जोड़ें।"
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary
                )
            }
        }
    }
}

@Composable
private fun AboutFeatureBlock(
    title: String,
    body: String
) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleSmall,
            color = TextPrimary,
            fontWeight = FontWeight.SemiBold
        )
        Text(
            text = body,
            style = MaterialTheme.typography.bodyMedium,
            color = TextSecondary
        )
    }
}
