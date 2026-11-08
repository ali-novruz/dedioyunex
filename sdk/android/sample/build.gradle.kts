import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

// Override with: ./gradlew :sample:assembleDebug -Pmeneuygun.baseUrl=http://192.168.1.10:3000
val meneUygunBaseUrl = (findProperty("meneuygun.baseUrl") as String?) ?: "http://10.0.2.2:3000"

android {
    namespace = "az.meneuygun.demo"
    compileSdk = 36

    defaultConfig {
        applicationId = "az.meneuygun.demo"
        minSdk = 24
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"

        buildConfigField("String", "MENEUYGUN_BASE_URL", "\"$meneUygunBaseUrl\"")
        buildConfigField("String", "MENEUYGUN_CLIENT_ID", "\"demo-mobile\"")
        buildConfigField("String", "MENEUYGUN_REDIRECT_URI", "\"meneuygun-demo://callback\"")
        // Scheme of the redirect URI; fills the SDK's redirect activity intent filter.
        manifestPlaceholders["meneuygunRedirectScheme"] = "meneuygun-demo"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
    }
}

dependencies {
    implementation(project(":meneuygun"))
    implementation("androidx.activity:activity-compose:1.12.1")
}
