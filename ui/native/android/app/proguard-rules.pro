# Add project specific ProGuard rules here.

# Keep fedi-android bridge JNI classes
-keep class org.fedi.** { *; }

# Zendesk
-keep class zendesk.** { *; }
-dontwarn zendesk.**

# Firebase
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**

# Fresco
-keep class com.facebook.imagepipeline.** { *; }
-keep class com.facebook.fresco.** { *; }

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }

# react-native-vision-camera
-keep class com.mrousavy.camera.** { *; }

# Suppress warnings for common third-party libraries
-dontwarn javax.annotation.**
-dontwarn sun.misc.**

# Missing classes from JDK/desktop APIs not available on Android
-dontwarn java.awt.Component
-dontwarn java.beans.ConstructorProperties
-dontwarn java.beans.Transient
-dontwarn javax.xml.bind.DatatypeConverter
