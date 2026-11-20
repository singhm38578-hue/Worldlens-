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
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.DeleteOutline
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
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

/**
 * Honest, plain-language Privacy Center screen accurately describing:
 * 1. How camera and gallery images are handled on-device
 * 2. Whether and when images/text are sent to Gemini AI over HTTPS
 * 3. How scan and translation history is stored locally on the device
 * 4. Exactly what data is stored vs. what is not stored or collected
 * 5. How users can clear local history and manage device permissions
 */
@Composable
fun PrivacyPolicyScreen(
    language: AppLanguage,
    scanHistoryCount: Int = 0,
    translationHistoryCount: Int = 0,
    onClearAllLocalHistory: () -> Unit = {},
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val isEnglish = language == AppLanguage.ENGLISH
    val totalHistoryCount = scanHistoryCount + translationHistoryCount
    var showClearDialog by remember { mutableStateOf(false) }
    var historyClearedNotice by remember { mutableStateOf(false) }

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
                        "This permanently deletes $scanHistoryCount saved scans (including local thumbnails) and $translationHistoryCount saved translations stored on this device. This action cannot be undone."
                    } else {
                        "यह इस डिवाइस पर सहेजे गए $scanHistoryCount स्कैन (स्थानीय थंबनेल सहित) और $translationHistoryCount अनुवादों को स्थायी रूप से हटा देगा। इसे पूर्ववत नहीं किया जा सकता।"
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
                        historyClearedNotice = true
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
                text = if (isEnglish) "Privacy Center" else "गोपनीयता केंद्र",
                style = MaterialTheme.typography.titleLarge,
                color = TextPrimary,
                modifier = Modifier.semantics { heading() }
            )
        }

        Text(
            text = if (isEnglish) {
                "Only actual implemented behavior is described below. WorldLens never makes privacy guarantees it cannot enforce on third-party AI servers."
            } else {
                "नीचे केवल वास्तव में लागू किया गया व्यवहार बताया गया है। WorldLens ऐसे कोई गोपनीयता वादे नहीं करता जिन्हें वह थर्ड-पार्टी AI सर्वर पर लागू नहीं कर सकता।"
            },
            style = MaterialTheme.typography.bodyMedium,
            color = TextMuted
        )

        // Core Privacy Disclosures
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(22.dp),
            colors = CardDefaults.cardColors(containerColor = WorldLensWhite),
            border = BorderStroke(1.dp, BorderHairline)
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                PrivacySection(
                    title = if (isEnglish) "1. Camera & Gallery Images" else "1. कैमरा और गैलरी छवियाँ",
                    body = if (isEnglish) {
                        "Photos you capture with Take Photo are stored temporarily in WorldLens's private app cache while you preview or scan them, and removed when replaced, cleared, or cleaned up. Gallery photos are opened through Android's Photo Picker so WorldLens only receives the single image you choose, without requesting broad gallery or storage access."
                    } else {
                        "फ़ोटो लें से ली गई तस्वीरें प्रीव्यू या स्कैन के दौरान केवल WorldLens के निजी ऐप कैश में अस्थायी रूप से रखी जाती हैं और बदलने या हटाने पर मिटा दी जाती हैं। गैलरी फ़ोटो Android फ़ोटो पिकर से खोली जाती हैं ताकि ऐप केवल आपके द्वारा चुनी गई एक छवि को ही पढ़ सके, बिना व्यापक स्टोरेज अनुमति के।"
                    }
                )

                HorizontalDivider(color = BorderHairline)

                PrivacySection(
                    title = if (isEnglish) "2. Sending Images & Text to Gemini AI" else "2. Gemini AI को छवियाँ और टेक्स्ट भेजना",
                    body = if (isEnglish) {
                        "Yes — when you explicitly tap Scan, Translate, or Extract & Translate, the image (resized locally) or text you submit is sent over HTTPS (cleartext HTTP is disabled) to Google's Gemini AI service via Firebase AI Logic so the model can generate your result. Nothing is transmitted before you tap Scan or Translate. Processing by Gemini and Firebase is governed by Google's and Firebase's service terms and privacy policies. Avoid submitting sensitive IDs, financial cards, passwords, or private medical documents."
                    } else {
                        "हाँ — जब आप स्पष्ट रूप से स्कैन, अनुवाद या टेक्स्ट निकालें व अनुवाद करें पर टैप करते हैं, तो आपकी चयनित छवि (डिवाइस पर रीसाइज़ की हुई) या टेक्स्ट को केवल HTTPS (असुरक्षित HTTP अक्षम है) के माध्यम से Firebase AI Logic के ज़रिए Google की Gemini AI सेवा को भेजा जाता है। आपके टैप करने से पहले कुछ भी नहीं भेजा जाता। Gemini और Firebase द्वारा प्रसंस्करण Google और Firebase की सेवा शर्तों व गोपनीयता नीतियों के अधीन है। संवेदनशील पहचान पत्र, भुगतान कार्ड, पासवर्ड या निजी दस्तावेज़ स्कैन करने से बचें।"
                    }
                )

                HorizontalDivider(color = BorderHairline)

                PrivacySection(
                    title = if (isEnglish) "3. Local History Storage on This Device" else "3. इस डिवाइस पर स्थानीय इतिहास स्टोरेज",
                    body = if (isEnglish) {
                        "Completed scan reports and translations are saved locally in an Android Room (SQLite) database on your device, along with an optional compact thumbnail (<=240px) stored in app-private storage when available. Android cloud auto-backup is disabled (allowBackup=false), and WorldLens does not upload your history to any cloud account or server."
                    } else {
                        "पूर्ण स्कैन रिपोर्ट और अनुवाद आपके डिवाइस के Android Room (SQLite) डेटाबेस में स्थानीय रूप से सहेजे जाते हैं, साथ ही उपलब्ध होने पर ऐप-निजी स्टोरेज में एक छोटा थंबनेल (<=240px) रखा जाता है। Android क्लाउड ऑटो-बैकअप अक्षम है (allowBackup=false) और WorldLens आपका इतिहास किसी क्लाउड सर्वर पर अपलोड नहीं करता।"
                    }
                )
            }
        }

        // Explicit What Is Stored vs. What Is Not Stored Card
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
                    text = if (isEnglish) "4. What Is Stored vs. What Is Not" else "4. क्या सहेजा जाता है और क्या नहीं",
                    style = MaterialTheme.typography.titleSmall,
                    color = ElectricBlue,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.semantics { heading() }
                )

                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(
                        text = if (isEnglish) "Stored locally on your device:" else "केवल आपके डिवाइस पर सहेजा जाता है:",
                        style = MaterialTheme.typography.labelLarge,
                        color = TextPrimary,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = if (isEnglish) {
                            "• Your chosen app language (English or Hindi)\n" +
                                "• Saved scan reports (object name, category, explanation, characteristics, facts, confidence note, language, and timestamp)\n" +
                                "• Optional compact scan thumbnail in app-private storage\n" +
                                "• Saved translations (original text, translated text, languages, mode, and timestamp)"
                        } else {
                            "• आपकी चुनी गई ऐप भाषा (अंग्रेज़ी या हिन्दी)\n" +
                                "• सहेजी गई स्कैन रिपोर्ट (वस्तु का नाम, श्रेणी, विवरण, विशेषताएँ, तथ्य, विश्वास नोट, भाषा और दिनांक-समय)\n" +
                                "• ऐप-निजी स्टोरेज में वैकल्पिक छोटा स्कैन थंबनेल\n" +
                                "• सहेजे गए अनुवाद (मूल टेक्स्ट, अनुवादित टेक्स्ट, भाषाएँ, मोड और दिनांक-समय)"
                        },
                        style = MaterialTheme.typography.bodySmall,
                        color = TextSecondary
                    )
                }

                HorizontalDivider(color = BorderHairline)

                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(
                        text = if (isEnglish) "Not collected or stored by WorldLens:" else "WorldLens द्वारा एकत्र या संग्रहीत नहीं किया जाता:",
                        style = MaterialTheme.typography.labelLarge,
                        color = TextPrimary,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = if (isEnglish) {
                            "• No user account, email address, phone number, or password\n" +
                                "• No contacts, SMS, call logs, or GPS location data\n" +
                                "• No background camera or background microphone recordings\n" +
                                "• No full-resolution photo gallery scanning or cloud history sync\n" +
                                "• No advertisements, ad SDKs, or third-party ad trackers"
                        } else {
                            "• कोई उपयोगकर्ता खाता, ईमेल पता, फ़ोन नंबर या पासवर्ड नहीं\n" +
                                "• कोई संपर्क सूची, SMS, कॉल लॉग या GPS लोकेशन डेटा नहीं\n" +
                                "• कोई बैकग्राउंड कैमरा या बैकग्राउंड माइक्रोफ़ोन रिकॉर्डिंग नहीं\n" +
                                "• कोई पूर्ण-रिज़ॉल्यूशन गैलरी स्कैनिंग या क्लाउड इतिहास सिंक नहीं\n" +
                                "• कोई विज्ञापन, विज्ञापन SDK या थर्ड-पार्टी विज्ञापन ट्रैकर नहीं"
                        },
                        style = MaterialTheme.typography.bodySmall,
                        color = TextSecondary
                    )
                }
            }
        }

        // How to Clear Local History + Direct Control
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
                PrivacySection(
                    title = if (isEnglish) "5. How to Clear Your Local History" else "5. अपना स्थानीय इतिहास कैसे हटाएँ",
                    body = if (isEnglish) {
                        "You can delete individual records anytime inside the History tab, or clear all saved scans, thumbnails, and translations below or from Settings. Currently stored on this device: $scanHistoryCount scans and $translationHistoryCount translations."
                    } else {
                        "आप इतिहास टैब में किसी भी एक रिकॉर्ड को कभी भी हटा सकते हैं, या नीचे अथवा सेटिंग्स से सभी सहेजे गए स्कैन, थंबनेल और अनुवाद एक साथ हटा सकते हैं। इस डिवाइस पर अभी $scanHistoryCount स्कैन और $translationHistoryCount अनुवाद सहेजे गए हैं।"
                    }
                )

                if (historyClearedNotice && totalHistoryCount == 0) {
                    Surface(
                        color = ElectricBlueTint,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = if (isEnglish) {
                                "Local scan and translation history has been cleared."
                            } else {
                                "स्थानीय स्कैन और अनुवाद इतिहास हटा दिया गया है।"
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
                        text = if (isEnglish) "Clear All Local History" else "सभी स्थानीय इतिहास हटाएँ",
                        color = if (totalHistoryCount > 0) Color(0xFFB91C1C) else TextMuted
                    )
                }

                OutlinedButton(
                    onClick = { AppSettingsHelper.openAppSettings(context) },
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
                        text = if (isEnglish) "Review Android App Permissions" else "Android ऐप अनुमतियाँ देखें",
                        color = TextPrimary
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(4.dp))
    }
}

@Composable
private fun PrivacySection(
    title: String,
    body: String
) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleSmall,
            color = ElectricBlue,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.semantics { heading() }
        )
        Text(
            text = body,
            style = MaterialTheme.typography.bodyMedium,
            color = TextSecondary
        )
    }
}
