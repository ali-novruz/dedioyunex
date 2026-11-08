package az.meneuygun.sdk.compose

import androidx.compose.material3.ColorScheme
import androidx.compose.material3.LocalMinimumInteractiveComponentSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.isSpecified
import az.meneuygun.sdk.Contrast
import az.meneuygun.sdk.MeneUygun
import az.meneuygun.sdk.Preferences

/**
 * Effective preferences inside [MeneUygunTheme] (schema defaults when not connected).
 * Use it for type-B flags the app implements itself: `LocalMeneUygun.current.confirmActions`.
 */
val LocalMeneUygun = staticCompositionLocalOf { Preferences() }

/** High contrast: black on white, saturated dark blue actions. */
val MeneUygunHighContrastColors: ColorScheme = lightColorScheme(
    primary = Color(0xFF0000B3),
    onPrimary = Color.White,
    secondary = Color(0xFF000000),
    onSecondary = Color.White,
    background = Color.White,
    onBackground = Color.Black,
    surface = Color.White,
    onSurface = Color.Black,
    surfaceVariant = Color(0xFFF0F0F0),
    onSurfaceVariant = Color.Black,
    outline = Color.Black,
    error = Color(0xFFB00000),
    onError = Color.White,
)

/** Dark background: white text on black, yellow actions. */
val MeneUygunDarkColors: ColorScheme = darkColorScheme(
    primary = Color(0xFFFFD600),
    onPrimary = Color.Black,
    secondary = Color(0xFF80D8FF),
    onSecondary = Color.Black,
    background = Color.Black,
    onBackground = Color.White,
    surface = Color(0xFF121212),
    onSurface = Color.White,
    surfaceVariant = Color(0xFF222222),
    onSurfaceVariant = Color.White,
    outline = Color.White,
    error = Color(0xFFFF6E6E),
    onError = Color.Black,
)

/** Applies the user's MƏNƏ UYĞUN preferences collected from [MeneUygun.preferences]. Requires [MeneUygun.init]. */
@Composable
fun MeneUygunTheme(
    colorScheme: ColorScheme = MaterialTheme.colorScheme,
    typography: Typography = MaterialTheme.typography,
    content: @Composable () -> Unit,
) {
    check(MeneUygun.isInitialized) { "MeneUygun.init(...) must be called before MeneUygunTheme" }
    val prefs by MeneUygun.preferences.collectAsState()
    MeneUygunTheme(prefs ?: Preferences(), colorScheme, typography, content)
}

/** Applies an explicit [preferences] object (previews, tests). */
@Composable
fun MeneUygunTheme(
    preferences: Preferences,
    colorScheme: ColorScheme = MaterialTheme.colorScheme,
    typography: Typography = MaterialTheme.typography,
    content: @Composable () -> Unit,
) {
    val density = LocalDensity.current
    val scaled = Density(density.density, density.fontScale * preferences.fontScale.toFloat())
    val colors = when (preferences.contrast) {
        Contrast.NORMAL -> colorScheme
        Contrast.HIGH -> MeneUygunHighContrastColors
        Contrast.DARK -> MeneUygunDarkColors
    }
    val minTarget = if (preferences.largeTargets) 56.dp else LocalMinimumInteractiveComponentSize.current

    MaterialTheme(colorScheme = colors, typography = typography.spaced(preferences)) {
        CompositionLocalProvider(
            LocalDensity provides scaled,
            LocalMinimumInteractiveComponentSize provides minTarget,
            LocalMeneUygun provides preferences,
            content = content,
        )
    }
}

private fun Typography.spaced(p: Preferences): Typography {
    if (p.lineSpacing == 1.0 && p.letterSpacing == 0.0) return this
    fun TextStyle.s(): TextStyle = copy(
        lineHeight = if (lineHeight.isSpecified) lineHeight * p.lineSpacing.toFloat() else lineHeight,
        letterSpacing = if (p.letterSpacing > 0.0) p.letterSpacing.toFloat().em else letterSpacing,
    )
    return Typography(
        displayLarge = displayLarge.s(), displayMedium = displayMedium.s(), displaySmall = displaySmall.s(),
        headlineLarge = headlineLarge.s(), headlineMedium = headlineMedium.s(), headlineSmall = headlineSmall.s(),
        titleLarge = titleLarge.s(), titleMedium = titleMedium.s(), titleSmall = titleSmall.s(),
        bodyLarge = bodyLarge.s(), bodyMedium = bodyMedium.s(), bodySmall = bodySmall.s(),
        labelLarge = labelLarge.s(), labelMedium = labelMedium.s(), labelSmall = labelSmall.s(),
    )
}
