package com.worldlens.app.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.material.icons.outlined.DeleteOutline
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.Language
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.PrivacyTip
import androidx.compose.material.icons.outlined.Replay
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.RadioButton
import androidx.compose.material3.RadioButtonDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.worldlens.app.BuildConfig
import com.worldlens.app.data.local.AppSettingsHelper
import com.worldlens.app.domain.model.AppLanguage
import com.worldlens.app.ui.theme.BorderHairline
import com.worldlens.app.ui.theme.DeepNavy
import com.worldlens.app.ui.theme.ElectricBlue
import com.worldlens.app.ui.theme.ElectricBlueTint
import com.worldlens.app.ui.theme.TextMuted
import com.worldlens.app.ui.theme.TextPrimary
import com.worldlens.app.ui.theme.TextSecondary
import com.worldlens.app.ui.theme.WorldLensSurface
import com.worldlens.app.ui.theme.WorldLensWhite

@Composable
fun ProfileScreen(
    language: AppLanguage,
    scanHistoryCount: Int,
    translationHistoryCount: Int,
    historyError: String? = null,
    onDismissHistoryError: () -> Unit = {},
    onLanguageChange: (AppLanguage) -> Unit,
    onClearAllLocalHistory: () -> Unit,
    onOpenAbout: () -> Unit,
    onOpenPrivacyPolicy: () -> Unit,
    onReplaySplash: () -> Unit
) {
    val context = LocalContext.current
    val isEnglish = language == AppLanguage.ENGLISH
    val totalHistoryCount = scanHistoryCount + translationHistoryCount
    val micGranted = AppSettingsHelper.isMicrophonePermissionGranted(context)
    var showClearDialog by remember { mutableStateOf(false) }
    var clearedBannerVisible by remember { mutableStateOf(false) }
    var settingsLaunchError by remember { mutableStateOf(false) }

    if (showClearDialog) {
        AlertDialog(
            onDismissRequest = { showClearDialog = false },
            title = {
                Text(
                    text = if (isEnglish) "Clear all local history?" else "सभी स्थानीय इतिहास हटाएँ?",
                    style = MaterialTheme.typography.titleMedium,
                    color = TextPrimary
                )
            },
            text = {
                Text(
                    text = if (isEnglish) {
                        "This will permanently delete all $scanHistoryCount saved scans (including local thumbnails) and $translationHistoryCount saved translations from this device. This action cannot be undone."
                    } else {
                        "यह इस डिवाइस से सभी $scanHistoryCount सहेजे गए स्कैन (स्थानीय थंबनेल सहित) और $translationHistoryCount सहेजे गए अनुवादों को स्थायी रूप से हटा देगा। इसे पूर्ववत नहीं किया जा सकता।"
                    },
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextSecondary
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        showClearDialog = false
                        onClearAllLocalHistory()
                        clearedBannerVisible = true
                    }
                ) {
                    Text(
                        text = if (isEnglish) "Clear All" else "सभी हटाएँ",
                        color = Color(0xFFB91C1C),
                        fontWeight = FontWeight.SemiBold
                    )
                }
            },
            dismissButton = {
                TextButton(onClick = { showClearDialog = false }) {
                    Text(if (isEnglish) "Cancel" else "रद्द करें")
                }
            }
        )
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(WorldLensSurface)
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Column {
            Text(
                text = if (isEnglish) "Settings" else "सेटिंग्स",
                style = MaterialTheme.typography.headlineMedium,
                color = TextPrimary,
                modifier = Modifier.semantics { heading() }
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = if (isEnglish) {
                    "Language, privacy, permissions, local storage, and app info"
                } else {
                    "भाषा, गोपनीयता, अनुमतियाँ, स्थानीय स्टोरेज और ऐप जानकारी"
                },
                style = MaterialTheme.typography.bodyMedium,
                color = TextMuted
            )
        }

        // 1. Language Settings Card (English & Hindi)
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(22.dp),
            colors = CardDefaults.cardColors(containerColor = WorldLensWhite),
            border = BorderStroke(1.dp, BorderHairline)
        ) {
            Column(
                modifier = Modifier
                    .padding(20.dp)
                    .selectableGroup()
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Outlined.Language,
                        contentDescription = null,
                        tint = ElectricBlue,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = if (isEnglish) "App Language" else "ऐप भाषा",
                        style = MaterialTheme.typography.titleMedium,
                        color = TextPrimary,
                        modifier = Modifier.semantics { heading() }
                    )
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = if (isEnglish) {
                        "Choose English or Hindi for menus, messages, and scan responses."
                    } else {
                        "मेन्यू, संदेशों और स्कैन परिणामों के लिए अंग्रेज़ी या हिन्दी चुनें।"
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = TextMuted
                )
                Spacer(modifier = Modifier.height(10.dp))

                AppLanguage.entries.forEach { option ->
                    val isSelected = language == option
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(min = 48.dp)
                            .selectable(
                                selected = isSelected,
                                onClick = { onLanguageChange(option) },
                                role = Role.RadioButton
                            )
                            .padding(vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        RadioButton(
                            selected = isSelected,
                            onClick = null,
                            colors = RadioButtonDefaults.colors(selectedColor = ElectricBlue)
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Text(
                            text = option.displayName,
                            style = MaterialTheme.typography.bodyLarge,
                            color = TextPrimary,
                            fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal
                        )
                    }
                }
            }
        }

        // 2. Permissions & Device Access Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(22.dp),
            colors = CardDefaults.cardColors(containerColor = WorldLensWhite),
            border = BorderStroke(1.dp, BorderHairline)
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Outlined.Lock,
                        contentDescription = null,
                        tint = ElectricBlue,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = if (isEnglish) "Permissions & Device Access" else "अनुमतियाँ और डिवाइस एक्सेस",
                        style = MaterialTheme.typography.titleMedium,
                        color = TextPrimary,
                        modifier = Modifier.semantics { heading() }
                    )
                }

                PermissionStatusLine(
                    label = if (isEnglish) "Camera" else "कैमरा",
                    detail = if (isEnglish) {
                        "System camera capture on demand · No persistent camera permission requested"
                    } else {
                        "माँग पर सिस्टम कैमरा कैप्चर · स्थायी कैमरा अनुमति आवश्यक नहीं"
                    }
                )
                HorizontalDivider(color = BorderHairline)
                PermissionStatusLine(
                    label = if (isEnglish) "Gallery / Photos" else "गैलरी / फ़ोटो",
                    detail = if (isEnglish) {
                        "Android Photo Picker · No broad photo library permission requested"
                    } else {
                        "Android फ़ोटो पिकर · व्यापक मीडिया स्टोरेज अनुमति आवश्यक नहीं"
                    }
                )
                HorizontalDivider(color = BorderHairline)
                PermissionStatusLine(
                    label = if (isEnglish) "Microphone" else "माइक्रोफ़ोन",
                    detail = if (micGranted) {
                        if (isEnglish) {
                            "Allowed · Used only when you tap Speak in Voice or Conversation Translator"
                        } else {
                            "अनुमत · केवल वॉइस या संवाद अनुवाद में बोलने पर उपयोग होता है"
                        }
                    } else {
                        if (isEnglish) {
                            "Not granted · Requested only if you use Voice or Conversation speech input"
                        } else {
                            "अनुमत नहीं · केवल वॉइस या संवाद इनपुट उपयोग करने पर माँगा जाता है"
                        }
                    }
                )

                OutlinedButton(
                    onClick = {
                        settingsLaunchError = !AppSettingsHelper.openAppSettings(context)
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(min = 48.dp),
                    shape = RoundedCornerShape(14.dp),
                    border = BorderStroke(1.dp, BorderHairline)
                ) {
                    Icon(
                        imageVector = Icons.Outlined.Settings,
                        contentDescription = null,
                        tint = ElectricBlue,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = if (isEnglish) "Manage in Android App Settings" else "Android ऐप सेटिंग्स में प्रबंधित करें",
                        color = TextPrimary
                    )
                }

                if (settingsLaunchError) {
                    Text(
                        text = if (isEnglish) {
                            "Unable to open Android Settings directly. Open your device Settings > Apps > WorldLens."
                        } else {
                            "Android सेटिंग्स सीधे नहीं खुल सकीं। कृपया अपने डिवाइस की Settings > Apps > WorldLens खोलें।"
                        },
                        style = MaterialTheme.typography.bodySmall,
                        color = Color(0xFFB91C1C)
                    )
                }
            }
        }

        // 3. Local Data & Clear History Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(22.dp),
            colors = CardDefaults.cardColors(containerColor = WorldLensWhite),
            border = BorderStroke(1.dp, BorderHairline)
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Text(
                    text = if (isEnglish) "Local History" else "स्थानीय इतिहास",
                    style = MaterialTheme.typography.titleMedium,
                    color = TextPrimary,
                    modifier = Modifier.semantics { heading() }
                )
                Text(
                    text = if (isEnglish) {
                        "$scanHistoryCount saved scans · $translationHistoryCount saved translations stored locally on this device"
                    } else {
                        "इस डिवाइस पर $scanHistoryCount सहेजे गए स्कैन · $translationHistoryCount सहेजे गए अनुवाद"
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary
                )

                if (historyError != null) {
                    Surface(
                        color = Color(0xFFFEF2F2),
                        shape = RoundedCornerShape(12.dp),
                        border = BorderStroke(1.dp, Color(0xFFFECACA)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = if (isEnglish) {
                                    "Could not update local storage. Please try again."
                                } else {
                                    "स्थानीय स्टोरेज अपडेट नहीं हो सका। कृपया पुनः प्रयास करें।"
                                },
                                style = MaterialTheme.typography.bodySmall,
                                color = Color(0xFFB91C1C),
                                modifier = Modifier.weight(1f)
                            )
                            TextButton(onClick = onDismissHistoryError) {
                                Text(if (isEnglish) "Dismiss" else "बंद करें")
                            }
                        }
                    }
                } else if (clearedBannerVisible && totalHistoryCount == 0) {
                    Surface(
                        color = ElectricBlueTint,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = if (isEnglish) {
                                "All local scan and translation history has been cleared from this device."
                            } else {
                                "इस डिवाइस से सभी स्थानीय स्कैन और अनुवाद इतिहास हटा दिया गया है।"
                            },
                            style = MaterialTheme.typography.bodySmall,
                            color = DeepNavy,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp)
                        )
                    }
                }

                OutlinedButton(
                    onClick = { showClearDialog = true },
                    enabled = totalHistoryCount > 0,
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(min = 48.dp),
                    shape = RoundedCornerShape(14.dp),
                    border = BorderStroke(
                        1.dp,
                        if (totalHistoryCount > 0) Color(0xFFFECACA) else BorderHairline
                    )
                ) {
                    Icon(
                        imageVector = Icons.Outlined.DeleteOutline,
                        contentDescription = null,
                        tint = if (totalHistoryCount > 0) Color(0xFFB91C1C) else TextMuted,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = if (isEnglish) "Clear All History" else "सभी इतिहास हटाएँ",
                        color = if (totalHistoryCount > 0) Color(0xFFB91C1C) else TextMuted
                    )
                }
            }
        }

        // 4. Privacy Center & About WorldLens
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(22.dp),
            colors = CardDefaults.cardColors(containerColor = WorldLensWhite),
            border = BorderStroke(1.dp, BorderHairline)
        ) {
            Column(modifier = Modifier.padding(vertical = 6.dp)) {
                SettingsNavRow(
                    icon = Icons.Outlined.PrivacyTip,
                    title = if (isEnglish) "Privacy Center" else "गोपनीयता केंद्र",
                    subtitle = if (isEnglish) {
                        "Image processing, Gemini AI, what is stored, and history controls"
                    } else {
                        "छवि प्रसंस्करण, Gemini AI, संग्रहीत डेटा और इतिहास नियंत्रण"
                    },
                    onClick = onOpenPrivacyPolicy
                )
                HorizontalDivider(
                    color = BorderHairline,
                    modifier = Modifier.padding(horizontal = 20.dp)
                )
                SettingsNavRow(
                    icon = Icons.Outlined.Info,
                    title = if (isEnglish) "About WorldLens" else "WorldLens के बारे में",
                    subtitle = if (isEnglish) {
                        "App details, version info, responsible AI, and support status"
                    } else {
                        "ऐप विवरण, संस्करण जानकारी, ज़िम्मेदार AI और सहायता स्थिति"
                    },
                    onClick = onOpenAbout
                )
                if (BuildConfig.DEBUG) {
                    HorizontalDivider(
                        color = BorderHairline,
                        modifier = Modifier.padding(horizontal = 20.dp)
                    )
                    SettingsNavRow(
                        icon = Icons.Outlined.Replay,
                        title = if (isEnglish) "Replay Splash Screen" else "स्प्लैश स्क्रीन फिर से देखें",
                        subtitle = if (isEnglish) {
                            "Preview the WorldLens launch experience"
                        } else {
                            "WorldLens लॉन्च स्क्रीन फिर से देखें"
                        },
                        onClick = onReplaySplash
                    )
                }
            }
        }

        // 5. App Version Information
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 4.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = if (isEnglish) {
                    "WorldLens · Version ${BuildConfig.VERSION_NAME} (Build ${BuildConfig.VERSION_CODE})"
                } else {
                    "WorldLens · संस्करण ${BuildConfig.VERSION_NAME} (बिल्ड ${BuildConfig.VERSION_CODE})"
                },
                style = MaterialTheme.typography.labelMedium,
                color = TextMuted
            )
        }
    }
}

@Composable
private fun PermissionStatusLine(
    label: String,
    detail: String
) {
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelLarge,
            color = TextPrimary,
            fontWeight = FontWeight.SemiBold
        )
        Text(
            text = detail,
            style = MaterialTheme.typography.bodySmall,
            color = TextMuted
        )
    }
}

@Composable
private fun SettingsNavRow(
    icon: ImageVector,
    title: String,
    subtitle: String,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 60.dp)
            .clickable(onClick = onClick)
            .padding(horizontal = 20.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = ElectricBlue,
            modifier = Modifier.size(22.dp)
        )
        Spacer(modifier = Modifier.width(14.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleSmall,
                color = TextPrimary,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = TextMuted
            )
        }
        Spacer(modifier = Modifier.width(8.dp))
        Icon(
            imageVector = Icons.Outlined.ChevronRight,
            contentDescription = null,
            tint = TextMuted,
            modifier = Modifier.size(20.dp)
        )
    }
}
