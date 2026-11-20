package com.worldlens.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val WorldLensColorScheme = lightColorScheme(
    primary = ElectricBlue,
    onPrimary = WorldLensWhite,
    primaryContainer = ElectricBlueTint,
    onPrimaryContainer = DeepNavy,
    secondary = DeepNavy,
    onSecondary = WorldLensWhite,
    background = WorldLensSurface,
    onBackground = TextPrimary,
    surface = WorldLensWhite,
    onSurface = TextPrimary,
    surfaceVariant = WorldLensSurface,
    onSurfaceVariant = TextSecondary,
    outline = BorderHairline
)

@Composable
fun WorldLensTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = WorldLensColorScheme,
        typography = WorldLensTypography,
        content = content
    )
}
