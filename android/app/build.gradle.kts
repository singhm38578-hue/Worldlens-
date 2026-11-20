import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("com.google.devtools.ksp")
}

// Automatically applies Google Services once the founder places google-services.json
// in android/app/google-services.json, without breaking local debug compilation before setup.
val googleServicesFile = file("google-services.json")
if (googleServicesFile.exists()) {
    apply(plugin = "com.google.gms.google-services")
}

// Secure release signing configuration: reads strictly from gitignored android/keystore.properties
// or CI environment variables. Never hardcode passwords or keystores in Gradle files.
val keystoreProps = Properties()
val keystorePropsFile = rootProject.file("keystore.properties")
if (keystorePropsFile.exists()) {
    keystorePropsFile.inputStream().use { keystoreProps.load(it) }
}

fun signingProp(propKey: String, envKey: String): String? {
    val fromFile = keystoreProps.getProperty(propKey)?.trim()
    if (!fromFile.isNullOrEmpty()) return fromFile
    return System.getenv(envKey)?.trim()?.takeIf { it.isNotEmpty() }
}

val releaseStoreFilePath = signingProp("storeFile", "WORLDLENS_KEYSTORE_PATH")
val releaseStoreFile = releaseStoreFilePath?.let { rootProject.file(it) }
val releaseStorePassword = signingProp("storePassword", "WORLDLENS_KEYSTORE_PASSWORD")
val releaseKeyAlias = signingProp("keyAlias", "WORLDLENS_KEY_ALIAS")
val releaseKeyPassword = signingProp("keyPassword", "WORLDLENS_KEY_PASSWORD")
val hasReleaseSigning = releaseStoreFile != null &&
    !releaseStorePassword.isNullOrEmpty() &&
    !releaseKeyAlias.isNullOrEmpty() &&
    !releaseKeyPassword.isNullOrEmpty() &&
    releaseStoreFile.exists()

android {
    namespace = "com.worldlens.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.worldlens.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }

        // Security rule: NEVER place raw Gemini Developer API keys or secrets in BuildConfig,
        // source code, assets, or APK. Firebase AI Logic routes requests securely via Firebase
        // project configuration (google-services.json) and Firebase App Check.
        buildConfigField("boolean", "ENABLE_CLOUD_SYNC", "false")
    }

    signingConfigs {
        create("release") {
            if (hasReleaseSigning) {
                storeFile = releaseStoreFile
                storePassword = releaseStorePassword
                keyAlias = releaseKeyAlias
                keyPassword = releaseKeyPassword
                enableV1Signing = true
                enableV2Signing = true
                enableV3Signing = true
            }
        }
    }

    buildTypes {
        debug {
            isMinifyEnabled = false
            isDebuggable = true
        }
        release {
            isDebuggable = false
            isMinifyEnabled = true
            isShrinkResources = true
            if (hasReleaseSigning) {
                signingConfig = signingConfigs.getByName("release")
            }
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

val verifyReleaseReadiness = tasks.register("verifyReleaseReadiness") {
    doLast {
        if (!hasReleaseSigning) {
            throw GradleException(
                "Release signing is not configured. Create android/keystore.properties " +
                    "(see android/keystore.properties.example) or set WORLDLENS_KEYSTORE_PATH, " +
                    "WORLDLENS_KEYSTORE_PASSWORD, WORLDLENS_KEY_ALIAS, and WORLDLENS_KEY_PASSWORD."
            )
        }
        if (!googleServicesFile.exists()) {
            throw GradleException(
                "Missing android/app/google-services.json. Download it from Firebase Console " +
                    "for package com.worldlens.app before generating a release APK or AAB."
            )
        }
    }
}

tasks.configureEach {
    if (name == "assembleRelease" || name == "bundleRelease") {
        dependsOn(verifyReleaseReadiness)
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2024.12.01")
    implementation(composeBom)
    androidTestImplementation(composeBom)

    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")

    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.navigation:navigation-compose:2.8.5")
    implementation("io.coil-kt:coil-compose:2.7.0")

    // Official Firebase BoM + Firebase AI Logic (Gemini Developer API backend) + App Check
    implementation(platform("com.google.firebase:firebase-bom:34.0.0"))
    implementation("com.google.firebase:firebase-ai")
    implementation("com.google.firebase:firebase-appcheck-playintegrity")
    debugImplementation("com.google.firebase:firebase-appcheck-debug")

    // Local on-device persistence with Room (SQLite) — private photos & data stay strictly on-device
    val roomVersion = "2.6.1"
    implementation("androidx.room:room-runtime:$roomVersion")
    implementation("androidx.room:room-ktx:$roomVersion")
    ksp("androidx.room:room-compiler:$roomVersion")

    // Unit testing
    testImplementation("junit:junit:4.13.2")

    // Future milestone slots (Auth & optional cloud sync):
    // implementation("com.google.firebase:firebase-auth")
    // implementation("com.google.firebase:firebase-firestore")

    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}
