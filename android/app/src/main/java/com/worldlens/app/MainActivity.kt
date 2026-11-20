package com.worldlens.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.worldlens.app.ui.navigation.WorldLensApp
import com.worldlens.app.ui.theme.WorldLensSurface
import com.worldlens.app.ui.theme.WorldLensTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            WorldLensTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = WorldLensSurface
                ) {
                    WorldLensApp()
                }
            }
        }
    }
}
