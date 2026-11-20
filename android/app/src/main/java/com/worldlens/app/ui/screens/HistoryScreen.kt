package com.worldlens.app.ui.screens

import android.content.Intent
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CenterFocusWeak
import androidx.compose.material.icons.outlined.ContentCopy
import androidx.compose.material.icons.outlined.DeleteOutline
import androidx.compose.material.icons.outlined.ErrorOutline
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.Replay
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material.icons.outlined.Translate
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.worldlens.app.data.local.LocalHistoryDateFormatter
import com.worldlens.app.data.local.LocalHistoryLanguageFormatter
import com.worldlens.app.data.local.ScanThumbnailStorage
import com.worldlens.app.domain.model.AppLanguage
import com.worldlens.app.domain.model.LocalScanHistoryItem
import com.worldlens.app.domain.model.LocalTranslationRecord
import com.worldlens.app.ui.theme.BorderHairline
import com.worldlens.app.ui.theme.DeepNavy
import com.worldlens.app.ui.theme.ElectricBlue
import com.worldlens.app.ui.theme.ElectricBlueTint
import com.worldlens.app.ui.theme.TextMuted
import com.worldlens.app.ui.theme.TextPrimary
import com.worldlens.app.ui.theme.TextSecondary
import com.worldlens.app.ui.theme.WorldLensWhite

private enum class LocalHistoryTab {
    SCANS,
    TRANSLATIONS
}

/**
 * Local on-device Scan History and Translation History backed by Room (SQLite).
 * Displays only genuinely saved records — never fake or placeholder entries.
 */
@Composable
fun HistoryScreen(
    language: AppLanguage,
    scanHistory: List<LocalScanHistoryItem>,
    translationHistory: List<LocalTranslationRecord>,
    historyError: String? = null,
    onRetryHistory: (() -> Unit)? = null,
    onDismissHistoryError: (() -> Unit)? = null,
    onOpenScanner: () -> Unit,
    onOpenTranslator: () -> Unit,
    onReuseTranslation: (LocalTranslationRecord) -> Unit,
    onDeleteScan: (String) -> Unit,
    onClearAllScans: () -> Unit,
    onDeleteTranslation: (String) -> Unit,
    onClearAllTranslations: () -> Unit
) {
    val isEnglish = language == AppLanguage.ENGLISH
    val context = LocalContext.current
    val clipboard = LocalClipboardManager.current

    var activeTab by remember { mutableStateOf(LocalHistoryTab.SCANS) }
    var selectedScan by remember { mutableStateOf<LocalScanHistoryItem?>(null) }
    var selectedTranslation by remember { mutableStateOf<LocalTranslationRecord?>(null) }
    var showClearAllDialog by remember { mutableStateOf(false) }

    val activeCount = when (activeTab) {
        LocalHistoryTab.SCANS -> scanHistory.size
        LocalHistoryTab.TRANSLATIONS -> translationHistory.size
    }

    if (showClearAllDialog) {
        val isScansTab = activeTab == LocalHistoryTab.SCANS
        AlertDialog(
            onDismissRequest = { showClearAllDialog = false },
            title = {
                Text(
                    text = if (isScansTab) {
                        if (isEnglish) "Clear all scan history?" else "सभी स्कैन इतिहास हटाएँ?"
                    } else {
                        if (isEnglish) "Clear all translation history?" else "सभी अनुवाद इतिहास हटाएँ?"
                    },
                    style = MaterialTheme.typography.titleMedium,
                    color = TextPrimary
                )
            },
            text = {
                Text(
                    text = if (isScansTab) {
                        if (isEnglish) {
                            "This will permanently delete all saved scan results from this device. This action cannot be undone."
                        } else {
                            "यह इस डिवाइस से सभी सहेजे गए स्कैन परिणामों को स्थायी रूप से हटा देगा। इसे पूर्ववत नहीं किया जा सकता।"
                        }
                    } else {
                        if (isEnglish) {
                            "This will permanently delete all saved translations from this device. This action cannot be undone."
                        } else {
                            "यह इस डिवाइस से सभी सहेजे गए अनुवादों को स्थायी रूप से हटा देगा। इसे पूर्ववत नहीं किया जा सकता।"
                        }
                    },
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextSecondary
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        showClearAllDialog = false
                        if (isScansTab) {
                            selectedScan = null
                            onClearAllScans()
                        } else {
                            selectedTranslation = null
                            onClearAllTranslations()
                        }
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
                TextButton(onClick = { showClearAllDialog = false }) {
                    Text(if (isEnglish) "Cancel" else "रद्द करें")
                }
            }
        )
    }

    selectedScan?.let { item ->
        SavedScanDetailDialog(
            language = language,
            item = item,
            onDismiss = { selectedScan = null },
            onDelete = {
                onDeleteScan(item.id)
                selectedScan = null
            }
        )
    }

    selectedTranslation?.let { record ->
        SavedTranslationDetailDialog(
            language = language,
            record = record,
            onDismiss = { selectedTranslation = null },
            onCopy = {
                clipboard.setText(AnnotatedString(record.translatedText))
            },
            onShare = {
                val intent = Intent(Intent.ACTION_SEND).apply {
                    type = "text/plain"
                    putExtra(Intent.EXTRA_TEXT, record.translatedText)
                }
                runCatching {
                    context.startActivity(
                        Intent.createChooser(intent, if (isEnglish) "Share translation" else "अनुवाद साझा करें")
                    )
                }
            },
            onReuse = {
                selectedTranslation = null
                onReuseTranslation(record)
            },
            onDelete = {
                onDeleteTranslation(record.id)
                selectedTranslation = null
            }
        )
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Header + Clear All button
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = if (isEnglish) "History" else "इतिहास",
                    style = MaterialTheme.typography.headlineMedium,
                    color = TextPrimary
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = if (isEnglish) {
                        "Saved locally on this device · Private photos are never uploaded to cloud storage"
                    } else {
                        "केवल इस डिवाइस पर स्थानीय रूप से सहेजा गया · निजी फ़ोटो क्लाउड पर अपलोड नहीं होते"
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = TextMuted
                )
            }

            if (activeCount > 0) {
                TextButton(onClick = { showClearAllDialog = true }) {
                    Text(
                        text = if (isEnglish) "Clear All" else "सभी हटाएँ",
                        color = Color(0xFFB91C1C),
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }

        // Graceful local database error banner (never crashes the UI)
        if (!historyError.isNullOrBlank()) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFFEF2F2)),
                border = BorderStroke(1.dp, Color(0xFFFECACA))
            ) {
                Column(
                    modifier = Modifier.padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.ErrorOutline,
                            contentDescription = null,
                            tint = Color(0xFFB91C1C),
                            modifier = Modifier.size(18.dp)
                        )
                        Text(
                            text = if (isEnglish) "Local storage notice" else "स्थानीय स्टोरेज सूचना",
                            style = MaterialTheme.typography.titleSmall,
                            color = Color(0xFF991B1B),
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                    Text(
                        text = if (isEnglish) {
                            "Could not complete a local history database operation. Your screen remains safe to use."
                        } else {
                            "स्थानीय इतिहास डेटाबेस कार्य पूरा नहीं हो सका। आप ऐप का सुरक्षित उपयोग जारी रख सकते हैं।"
                        },
                        style = MaterialTheme.typography.bodySmall,
                        color = Color(0xFF7F1D1D)
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        if (onRetryHistory != null) {
                            TextButton(onClick = onRetryHistory) {
                                Text(
                                    text = if (isEnglish) "Retry" else "पुनः प्रयास करें",
                                    color = Color(0xFFB91C1C),
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }
                        if (onDismissHistoryError != null) {
                            TextButton(onClick = onDismissHistoryError) {
                                Text(
                                    text = if (isEnglish) "Dismiss" else "हटाएँ",
                                    color = TextSecondary
                                )
                            }
                        }
                    }
                }
            }
        }

        // Interactive Segmented Tab Bar: Scans vs Translations
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            HistoryTabButton(
                selected = activeTab == LocalHistoryTab.SCANS,
                label = if (isEnglish) "Scans (${scanHistory.size})" else "स्कैन (${scanHistory.size})",
                icon = Icons.Outlined.CenterFocusWeak,
                onClick = { activeTab = LocalHistoryTab.SCANS },
                modifier = Modifier.weight(1f)
            )
            HistoryTabButton(
                selected = activeTab == LocalHistoryTab.TRANSLATIONS,
                label = if (isEnglish) "Translations (${translationHistory.size})" else "अनुवाद (${translationHistory.size})",
                icon = Icons.Outlined.Translate,
                onClick = { activeTab = LocalHistoryTab.TRANSLATIONS },
                modifier = Modifier.weight(1f)
            )
        }

        when (activeTab) {
            LocalHistoryTab.SCANS -> {
                if (scanHistory.isEmpty()) {
                    EmptyHistoryCard(
                        title = if (isEnglish) "No saved scans yet" else "अभी तक कोई सहेजा गया स्कैन नहीं है",
                        body = if (isEnglish) {
                            "Successful visual scans are saved automatically on this device with date and time so you can revisit them anytime."
                        } else {
                            "सफल दृश्य स्कैन दिनांक और समय के साथ इस डिवाइस पर स्वतः सहेजे जाते हैं ताकि आप उन्हें कभी भी देख सकें।"
                        },
                        actionLabel = if (isEnglish) "Open Scanner" else "स्कैनर खोलें",
                        onAction = onOpenScanner
                    )
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(bottom = 16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(scanHistory, key = { it.id }) { item ->
                            val formattedDate = remember(item.timestampMillis, language) {
                                LocalHistoryDateFormatter.formatDateTime(item.timestampMillis, language)
                            }
                            val scanLangLabel = remember(item.languageCode, language) {
                                LocalHistoryLanguageFormatter.formatLanguageLabel(item.languageCode, language)
                            }
                            val thumbnailFile = remember(item.thumbnailPath) {
                                ScanThumbnailStorage.resolveValidThumbnailFile(item.thumbnailPath)
                            }
                            val sourceText = when (item.sourceLabel.lowercase()) {
                                "camera" -> if (isEnglish) "Camera" else "कैमरा"
                                "gallery" -> if (isEnglish) "Gallery" else "गैलरी"
                                else -> item.sourceLabel
                            }

                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { selectedScan = item },
                                shape = RoundedCornerShape(18.dp),
                                colors = CardDefaults.cardColors(containerColor = WorldLensWhite),
                                border = BorderStroke(1.dp, BorderHairline)
                            ) {
                                Column(
                                    modifier = Modifier.padding(16.dp),
                                    verticalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        verticalAlignment = Alignment.Top,
                                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                                    ) {
                                        if (thumbnailFile != null) {
                                            AsyncImage(
                                                model = thumbnailFile,
                                                contentDescription = item.report.objectName,
                                                contentScale = ContentScale.Crop,
                                                modifier = Modifier
                                                    .size(64.dp)
                                                    .clip(RoundedCornerShape(12.dp))
                                            )
                                        }
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(
                                                text = "${item.report.category} · $sourceText · $scanLangLabel",
                                                style = MaterialTheme.typography.labelSmall,
                                                color = ElectricBlue,
                                                fontWeight = FontWeight.SemiBold
                                            )
                                            Spacer(modifier = Modifier.height(2.dp))
                                            Text(
                                                text = formattedDate,
                                                style = MaterialTheme.typography.labelSmall,
                                                color = TextMuted
                                            )
                                            Spacer(modifier = Modifier.height(4.dp))
                                            Text(
                                                text = item.report.objectName,
                                                style = MaterialTheme.typography.titleMedium,
                                                color = TextPrimary,
                                                fontWeight = FontWeight.SemiBold,
                                                maxLines = 2,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                        }
                                        IconButton(onClick = { onDeleteScan(item.id) }) {
                                            Icon(
                                                imageVector = Icons.Outlined.DeleteOutline,
                                                contentDescription = if (isEnglish) "Delete scan" else "स्कैन हटाएँ",
                                                tint = Color(0xFFB91C1C)
                                            )
                                        }
                                    }

                                    if (item.report.explanation.isNotBlank()) {
                                        Text(
                                            text = item.report.explanation,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = TextSecondary,
                                            maxLines = 2,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                    }

                                    Text(
                                        text = if (isEnglish) "Tap to open full scan report" else "पूर्ण स्कैन रिपोर्ट देखने के लिए टैप करें",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = TextMuted
                                    )
                                }
                            }
                        }
                    }
                }
            }

            LocalHistoryTab.TRANSLATIONS -> {
                if (translationHistory.isEmpty()) {
                    EmptyHistoryCard(
                        title = if (isEnglish) "No saved translations yet" else "अभी तक कोई सहेजा गया अनुवाद नहीं है",
                        body = if (isEnglish) {
                            "Your Text, Camera, Voice, and Conversation translations are saved locally on this device with date and time."
                        } else {
                            "आपके टेक्स्ट, कैमरा, वॉइस और संवाद अनुवाद दिनांक और समय के साथ इस डिवाइस पर स्थानीय रूप से सहेजे जाते हैं।"
                        },
                        actionLabel = if (isEnglish) "Open Translator" else "अनुवादक खोलें",
                        onAction = onOpenTranslator
                    )
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(bottom = 16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(translationHistory, key = { it.id }) { record ->
                            val formattedDate = remember(record.timestampMillis, language) {
                                LocalHistoryDateFormatter.formatDateTime(record.timestampMillis, language)
                            }

                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { selectedTranslation = record },
                                shape = RoundedCornerShape(18.dp),
                                colors = CardDefaults.cardColors(containerColor = WorldLensWhite),
                                border = BorderStroke(1.dp, BorderHairline)
                            ) {
                                Column(
                                    modifier = Modifier.padding(16.dp),
                                    verticalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        verticalAlignment = Alignment.Top,
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(
                                                text = "${record.mode.uppercase()} · ${record.sourceLanguageName} → ${record.targetLanguageName}",
                                                style = MaterialTheme.typography.labelSmall,
                                                color = ElectricBlue,
                                                fontWeight = FontWeight.SemiBold
                                            )
                                            Spacer(modifier = Modifier.height(2.dp))
                                            Text(
                                                text = formattedDate,
                                                style = MaterialTheme.typography.labelSmall,
                                                color = TextMuted
                                            )
                                        }
                                        IconButton(onClick = { onDeleteTranslation(record.id) }) {
                                            Icon(
                                                imageVector = Icons.Outlined.DeleteOutline,
                                                contentDescription = if (isEnglish) "Delete translation" else "अनुवाद हटाएँ",
                                                tint = Color(0xFFB91C1C)
                                            )
                                        }
                                    }

                                    Text(
                                        text = record.sourceText,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = TextSecondary,
                                        maxLines = 2,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    Text(
                                        text = record.translatedText,
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = TextPrimary,
                                        fontWeight = FontWeight.Medium,
                                        maxLines = 3,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun HistoryTabButton(
    selected: Boolean,
    label: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Button(
        onClick = onClick,
        modifier = modifier.height(46.dp),
        shape = RoundedCornerShape(14.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = if (selected) DeepNavy else WorldLensWhite,
            contentColor = if (selected) WorldLensWhite else TextPrimary
        ),
        border = if (selected) null else BorderStroke(1.dp, BorderHairline),
        contentPadding = PaddingValues(horizontal = 12.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            modifier = Modifier.size(18.dp)
        )
        Spacer(modifier = Modifier.width(6.dp))
        Text(
            text = label,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            style = MaterialTheme.typography.labelLarge
        )
    }
}

@Composable
private fun EmptyHistoryCard(
    title: String,
    body: String,
    actionLabel: String,
    onAction: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = WorldLensWhite),
        border = BorderStroke(1.dp, BorderHairline)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 40.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                imageVector = Icons.Outlined.History,
                contentDescription = null,
                tint = ElectricBlue,
                modifier = Modifier.size(44.dp)
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = title,
                style = MaterialTheme.typography.titleLarge,
                color = TextPrimary,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = body,
                style = MaterialTheme.typography.bodyMedium,
                color = TextSecondary,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(22.dp))
            Button(
                onClick = onAction,
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = ElectricBlue)
            ) {
                Text(actionLabel)
            }
        }
    }
}

@Composable
private fun SavedScanDetailDialog(
    language: AppLanguage,
    item: LocalScanHistoryItem,
    onDismiss: () -> Unit,
    onDelete: () -> Unit
) {
    val isEnglish = language == AppLanguage.ENGLISH
    val report = item.report
    val formattedDate = remember(item.timestampMillis, language) {
        LocalHistoryDateFormatter.formatDateTime(item.timestampMillis, language)
    }
    val scanLangLabel = remember(item.languageCode, language) {
        LocalHistoryLanguageFormatter.formatLanguageLabel(item.languageCode, language)
    }
    val thumbnailFile = remember(item.thumbnailPath) {
        ScanThumbnailStorage.resolveValidThumbnailFile(item.thumbnailPath)
    }
    val confidenceLabel = when (report.confidenceLevel.lowercase()) {
        "high" -> if (isEnglish) "High confidence" else "उच्च विश्वास"
        "moderate" -> if (isEnglish) "Moderate confidence" else "मध्यम विश्वास"
        "low" -> if (isEnglish) "Low confidence" else "कम विश्वास"
        else -> if (isEnglish) "Uncertain identification" else "अनिश्चित पहचान"
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = "${report.category} · $confidenceLabel",
                    style = MaterialTheme.typography.labelMedium,
                    color = ElectricBlue
                )
                Text(
                    text = report.objectName,
                    style = MaterialTheme.typography.titleLarge,
                    color = TextPrimary
                )
                Text(
                    text = "$formattedDate · ${if (isEnglish) "Language" else "भाषा"}: $scanLangLabel",
                    style = MaterialTheme.typography.labelSmall,
                    color = TextMuted
                )
            }
        },
        text = {
            Column(
                modifier = Modifier
                    .heightIn(max = 420.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                if (thumbnailFile != null) {
                    AsyncImage(
                        model = thumbnailFile,
                        contentDescription = report.objectName,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(176.dp)
                            .clip(RoundedCornerShape(14.dp))
                    )
                }

                if (report.explanation.isNotBlank()) {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(
                            text = if (isEnglish) "Explanation" else "विवरण",
                            style = MaterialTheme.typography.titleSmall,
                            color = TextPrimary
                        )
                        Text(
                            text = report.explanation,
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextSecondary
                        )
                    }
                }

                if (report.characteristics.isNotEmpty()) {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(
                            text = if (isEnglish) "Key Characteristics" else "मुख्य विशेषताएँ",
                            style = MaterialTheme.typography.titleSmall,
                            color = TextPrimary
                        )
                        report.characteristics.forEach { entry ->
                            Text(
                                text = "• $entry",
                                style = MaterialTheme.typography.bodySmall,
                                color = TextSecondary
                            )
                        }
                    }
                }

                if (report.usefulFacts.isNotEmpty()) {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(
                            text = if (isEnglish) "Useful Facts" else "उपयोगी तथ्य",
                            style = MaterialTheme.typography.titleSmall,
                            color = TextPrimary
                        )
                        report.usefulFacts.forEach { fact ->
                            Text(
                                text = "• $fact",
                                style = MaterialTheme.typography.bodySmall,
                                color = TextSecondary
                            )
                        }
                    }
                }

                if (report.confidenceExplanation.isNotBlank()) {
                    Surface(
                        color = ElectricBlueTint,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier.padding(12.dp),
                            verticalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Text(
                                text = if (isEnglish) "Confidence & Uncertainty Note" else "विश्वास और अनिश्चितता नोट",
                                style = MaterialTheme.typography.labelMedium,
                                color = DeepNavy,
                                fontWeight = FontWeight.SemiBold
                            )
                            Text(
                                text = report.confidenceExplanation,
                                style = MaterialTheme.typography.bodySmall,
                                color = TextSecondary
                            )
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text(if (isEnglish) "Close" else "बंद करें")
            }
        },
        dismissButton = {
            TextButton(onClick = onDelete) {
                Text(
                    text = if (isEnglish) "Delete" else "हटाएँ",
                    color = Color(0xFFB91C1C)
                )
            }
        }
    )
}

@Composable
private fun SavedTranslationDetailDialog(
    language: AppLanguage,
    record: LocalTranslationRecord,
    onDismiss: () -> Unit,
    onCopy: () -> Unit,
    onShare: () -> Unit,
    onReuse: () -> Unit,
    onDelete: () -> Unit
) {
    val isEnglish = language == AppLanguage.ENGLISH
    val formattedDate = remember(record.timestampMillis, language) {
        LocalHistoryDateFormatter.formatDateTime(record.timestampMillis, language)
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = "${record.mode.uppercase()} · ${record.sourceLanguageName} → ${record.targetLanguageName}",
                    style = MaterialTheme.typography.labelMedium,
                    color = ElectricBlue
                )
                Text(
                    text = formattedDate,
                    style = MaterialTheme.typography.labelSmall,
                    color = TextMuted
                )
            }
        },
        text = {
            Column(
                modifier = Modifier
                    .heightIn(max = 380.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(
                        text = if (isEnglish) "Original (${record.sourceLanguageName})" else "मूल (${record.sourceLanguageName})",
                        style = MaterialTheme.typography.labelMedium,
                        color = TextMuted
                    )
                    Text(
                        text = record.sourceText,
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextSecondary
                    )
                }

                HorizontalDivider(color = BorderHairline)

                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(
                        text = if (isEnglish) "Translation (${record.targetLanguageName})" else "अनुवाद (${record.targetLanguageName})",
                        style = MaterialTheme.typography.labelMedium,
                        color = ElectricBlue
                    )
                    Text(
                        text = record.translatedText,
                        style = MaterialTheme.typography.bodyLarge,
                        color = TextPrimary
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedButton(
                        onClick = onCopy,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp),
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 6.dp)
                    ) {
                        Icon(Icons.Outlined.ContentCopy, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(if (isEnglish) "Copy" else "कॉपी")
                    }
                    OutlinedButton(
                        onClick = onShare,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp),
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 6.dp)
                    ) {
                        Icon(Icons.Outlined.Share, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(if (isEnglish) "Share" else "साझा करें")
                    }
                }

                Button(
                    onClick = onReuse,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = ElectricBlue)
                ) {
                    Icon(Icons.Outlined.Replay, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(if (isEnglish) "Open in Translator" else "अनुवादक में खोलें")
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text(if (isEnglish) "Close" else "बंद करें")
            }
        },
        dismissButton = {
            TextButton(onClick = onDelete) {
                Text(
                    text = if (isEnglish) "Delete" else "हटाएँ",
                    color = Color(0xFFB91C1C)
                )
            }
        }
    )
}
