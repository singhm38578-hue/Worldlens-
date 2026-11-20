# WorldLens Release R8 / ProGuard Rules
# Keeps reflection-accessed Firebase, App Check, Room, and model classes intact
# while shrinking unused code and resources for a lightweight MVP APK/AAB.

# Preserve stack trace line numbers for crash diagnostics
-keepattributes SourceFile,LineNumberTable,*Annotation*

# Room database & generated DAO/Database implementations
-keep class * extends androidx.room.RoomDatabase
-keep @androidx.room.Entity class *
-keep @androidx.room.Dao interface *

# Firebase AI Logic & Play Integrity App Check
-keep class com.google.firebase.ai.** { *; }
-keep class com.google.firebase.appcheck.** { *; }
-dontwarn com.google.firebase.appcheck.debug.**

# WorldLens domain models & Application class
-keep class com.worldlens.app.WorldLensApplication { *; }
-keep class com.worldlens.app.domain.model.** { *; }
-keep class com.worldlens.app.data.local.** { *; }

# Strip verbose debug logs in release builds
-assumenosideeffects class android.util.Log {
    public static int v(...);
    public static int d(...);
    public static int i(...);
}
