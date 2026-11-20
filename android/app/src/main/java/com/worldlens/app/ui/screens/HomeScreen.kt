package com.worldlens.app.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CameraAlt
import androidx.compose.material.icons.outlined.CenterFocusWeak
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.PhotoLibrary
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.worldlens.app.data.local.LocalHistoryDateFormatter
import com.worldlens.app.domain.model.AppLanguage
import com.worldlens.app.domain.model.LocalScanHistoryItem
import com.worldlens.app.ui.components.QuickActionTile
import com.worldlens.app.ui.theme.BorderHairline
import com.worldlens.app.ui.theme.DeepNavy
import com.worldlens.app.ui.theme.ElectricBlue
import com.worldlens.app.ui.theme.TextMuted
import com.worldlens.app.ui.theme.TextPrimary
import com.worldlens.app.ui.theme.TextSecondary
import com.worldlens.app.ui.theme.WorldLensWhite

@Composable
fun HomeScreen(
    language: AppLanguage,
    recentScans: List<LocalScanHistoryItem>,
    onOpenScanner: () -> Unit,
    onOpenHistory: () -> Unit
) {
    val isEnglish = language == AppLanguage.ENGLISH

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Column {
                Text(
                    text = if (isEnglish) "See the World. Understand Everything." else "दुनिया देखें। सब कुछ समझें।",
                    style = MaterialTheme.typography.labelLarge,
                    color = ElectricBlue
                )
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = if (isEnglish) "Welcome to WorldLens" else "WorldLens में आपका स्वागत है",
                    style = MaterialTheme.typography.headlineMedium,
                    color = TextPrimary,
                    modifier = Modifier.semantics { heading() }
                )
            }
        }

        // Prominent AI Smart Scanner Card
        item {
            Card(
                onClick = onOpenScanner,
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = DeepNavy)
            ) {
                Column(modifier = Modifier.padding(22.dp)) {
                    Icon(
                        imageVector = Icons.Outlined.CenterFocusWeak,
                        contentDescription = null,
                        tint = ElectricBlue
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = if (isEnglish) "AI Smart Scanner" else "AI स्मार्ट स्कैनर",
                        style = MaterialTheme.typography.titleLarge,
                        color = WorldLensWhite
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = if (isEnglish) {
                            "Capture a photo or pick from gallery for Gemini visual recognition."
                        } else {
                            "Gemini दृश्य पहचान के लिए फ़ोटो लें या गैलरी से छवि चुनें।"
                        },
                        style = MaterialTheme.typography.bodyMedium,
                        color = WorldLensWhite.copy(alpha = 0.78f)
                    )
                    Spacer(modifier = Modifier.height(18.dp))
                    Button(
                        onClick = onOpenScanner,
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = ElectricBlue,
                            contentColor = WorldLensWhite
                        )
                    ) {
                        Text(if (isEnglish) "Launch Scanner" else "स्कैनर खोलें")
                    }
                }
            }
        }

        item {
            QuickActionTile(
                title = if (isEnglish) "Take Photo" else "फ़ोटो लें",
                subtitle = if (isEnglish) "Capture using your device camera" else "अपने डिवाइस कैमरे से फ़ोटो लें",
                icon = Icons.Outlined.CameraAlt,
                onClick = onOpenScanner
            )
        }

        item {
            QuickActionTile(
                title = if (isEnglish) "Upload from Gallery" else "गैलरी से अपलोड करें",
                subtitle = if (isEnglish) "Choose an image with Android Photo Picker" else "Android फ़ोटो पिकर से छवि चुनें",
                icon = Icons.Outlined.PhotoLibrary,
                onClick = onOpenScanner
            )
        }

        // Real Local Recent Scans Section (Zero fake sample data)
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = if (isEnglish) "Recent Scans" else "हाल के स्कैन",
                        style = MaterialTheme.typography.titleLarge,
                        color = TextPrimary,
                        modifier = Modifier.semantics { heading() }
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = if (isEnglish) {
                            "Saved locally on this device"
                        } else {
                            "इस डिवाइस पर स्थानीय रूप से सहेजे गए"
                        },
                        style = MaterialTheme.typography.labelSmall,
                        color = TextMuted
                    )
                }

                if (recentScans.isNotEmpty()) {
                    TextButton(onClick = onOpenHistory) {
                        Text(
                            text = if (isEnglish) "View all" else "सभी देखें",
                            color = ElectricBlue,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
            }
        }

        if (recentScans.isEmpty()) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = WorldLensWhite),
                    border = BorderStroke(1.dp, BorderHairline)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 20.dp, vertical = 28.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.History,
                            contentDescription = null,
                            tint = ElectricBlue
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        Text(
                            text = if (isEnglish) "No scans yet" else "अभी तक कोई स्कैन नहीं है",
                            style = MaterialTheme.typography.titleMedium,
                            color = TextPrimary,
                            textAlign = TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = if (isEnglish) {
                                "Your completed visual scans will appear here automatically on this device."
                            } else {
                                "आपके पूर्ण किए गए दृश्य स्कैन इस डिवाइस पर यहाँ स्वतः दिखाई देंगे।"
                            },
                            style = MaterialTheme.typography.bodySmall,
                            color = TextSecondary,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }
        } else {
            items(recentScans, key = { it.id }) { scan ->
                val formattedDate = remember(scan.timestampMillis, language) {
                    LocalHistoryDateFormatter.formatDateTime(scan.timestampMillis, language)
                }
                Card(
                    onClick = onOpenHistory,
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(containerColor = WorldLensWhite),
                    border = BorderStroke(1.dp, BorderHairline)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = scan.report.objectName,
                                style = MaterialTheme.typography.titleMedium,
                                color = TextPrimary,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = "${scan.report.category} · $formattedDate",
                                style = MaterialTheme.typography.labelSmall,
                                color = TextMuted,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Icon(
                            imageVector = Icons.Outlined.ChevronRight,
                            contentDescription = null,
                            tint = TextMuted
                        )
                    }
                }
            }
        }
    }
}
