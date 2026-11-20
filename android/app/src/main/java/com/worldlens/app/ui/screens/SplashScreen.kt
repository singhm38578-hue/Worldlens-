package com.worldlens.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.worldlens.app.domain.model.AppLanguage
import com.worldlens.app.ui.components.WorldLensEmblem
import com.worldlens.app.ui.theme.DeepNavy
import com.worldlens.app.ui.theme.ElectricBlue
import com.worldlens.app.ui.theme.WorldLensWhite

@Composable
fun SplashScreen(
    language: AppLanguage,
    onContinue: () -> Unit
) {
    val tagline = if (language == AppLanguage.ENGLISH) {
        "See the World. Understand Everything."
    } else {
        "दुनिया देखें। सब कुछ समझें।"
    }
    val ctaLabel = if (language == AppLanguage.ENGLISH) "Enter WorldLens" else "WorldLens शुरू करें"

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DeepNavy)
            .padding(horizontal = 28.dp, vertical = 48.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        WorldLensEmblem(size = 80.dp, onDarkSurface = true)
        Spacer(modifier = Modifier.height(28.dp))
        Text(
            text = "WORLDLENS",
            style = MaterialTheme.typography.displaySmall,
            color = WorldLensWhite
        )
        Spacer(modifier = Modifier.height(10.dp))
        Text(
            text = tagline,
            style = MaterialTheme.typography.bodyLarge,
            color = WorldLensWhite.copy(alpha = 0.82f),
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(40.dp))
        Button(
            onClick = onContinue,
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            shape = RoundedCornerShape(16.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = ElectricBlue,
                contentColor = WorldLensWhite
            )
        ) {
            Text(text = ctaLabel, style = MaterialTheme.typography.labelLarge)
        }
    }
}
