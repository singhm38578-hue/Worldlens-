# WorldLens Android — Export & Release Build Checklist

This folder (`android/`) is a complete Android Kotlin + Jetpack Compose project ready to open directly in Android Studio (Ladybug 2024.2+ / Meerkat+ with JDK 17 and Android SDK 35).

## Project Identity
- **App Name**: `WORLDLENS`
- **Tagline**: `See the World. Understand Everything.`
- **Application ID**: `com.worldlens.app`
- **Version Name**: `1.0.0` (`versionCode = 1`)
- **SDK**: `minSdk = 26`, `targetSdk = 35`, `compileSdk = 35`

## Required Manual Setup Before Signed Release Build
1. **Open in Android Studio**:
   - Open the `android/` directory in Android Studio.
   - Let Gradle Sync finish (uses `gradle/wrapper/gradle-wrapper.properties` pinned to Gradle 8.9). If running from terminal and `./gradlew` is not present yet, run `gradle wrapper` once or let Android Studio generate the wrapper scripts.
2. **Add Firebase Configuration (`google-services.json`)**:
   - In Firebase Console, add an Android app with package name `com.worldlens.app`.
   - Enable **Firebase AI Logic (Gemini Developer API)**.
   - Enable **Firebase App Check** (Play Integrity for release builds; Debug provider for local testing).
   - Download `google-services.json` and place it at `android/app/google-services.json` (gitignored — never commit).
3. **Create a Private Release Keystore (Once)**:
   ```bash
   keytool -genkeypair -v -storetype PKCS12 \
     -keystore ~/worldlens-release.jks \
     -alias worldlens-release \
     -keyalg RSA -keysize 2048 -validity 10000
   ```
   Back up the `.jks` file and passwords securely offline. Never commit them.
4. **Configure Release Signing Locally**:
   - Copy `android/keystore.properties.example` to `android/keystore.properties` (gitignored) and enter your real `storeFile`, `storePassword`, `keyAlias`, and `keyPassword`.
   - Or supply `WORLDLENS_KEYSTORE_PATH`, `WORLDLENS_KEYSTORE_PASSWORD`, `WORLDLENS_KEY_ALIAS`, and `WORLDLENS_KEY_PASSWORD` as CI environment variables.

## Build & Verify Commands
Run from inside the `android/` directory:

1. **Run unit tests**:
   ```bash
   ./gradlew testDebugUnitTest
   ```
2. **Build signed Release APK** (for beta installation on Android phones):
   ```bash
   ./gradlew clean assembleRelease
   ```
   - Output APK: `android/app/build/outputs/apk/release/app-release.apk`
3. **Build signed Release AAB** (for Google Play Console upload):
   ```bash
   ./gradlew clean bundleRelease
   ```
   - Output AAB: `android/app/build/outputs/bundle/release/app-release.aab`
4. **Verify APK signature**:
   ```bash
   $ANDROID_HOME/build-tools/35.0.0/apksigner verify --print-certs \
     android/app/build/outputs/apk/release/app-release.apk
   ```
