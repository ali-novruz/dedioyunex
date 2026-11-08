package az.meneuygun.sdk

import org.json.JSONObject

/** Mirrors sdk/web/src/schema.ts. Keep keys and allowed values identical. */
const val SCHEMA_VERSION = 1

enum class Contrast(val json: String) { NORMAL("normal"), HIGH("high"), DARK("dark") }

enum class ColorFilter(val json: String) {
    NONE("none"), PROTANOPIA("protanopia"), DEUTERANOPIA("deuteranopia"), TRITANOPIA("tritanopia"), GRAYSCALE("grayscale")
}

enum class Language(val json: String) { AZ("az"), RU("ru"), EN("en") }

class PreferenceException(message: String, val key: String? = null) : IllegalArgumentException(message)

data class Preferences(
    val version: Int = SCHEMA_VERSION,
    // vision
    val fontScale: Double = 1.0,
    val lineSpacing: Double = 1.0,
    val letterSpacing: Double = 0.0,
    val contrast: Contrast = Contrast.NORMAL,
    val colorFilter: ColorFilter = ColorFilter.NONE,
    val highlightLinks: Boolean = false,
    val largeCursor: Boolean = false,
    val strongFocus: Boolean = false,
    val screenReader: Boolean = false,
    // hearing
    val captions: Boolean = false,
    val visualAlerts: Boolean = false,
    val transcripts: Boolean = false,
    val signLanguage: Boolean = false,
    // motor
    val largeTargets: Boolean = false,
    val extendedTimeouts: Boolean = false,
    val noDrag: Boolean = false,
    val reduceMotion: Boolean = false,
    // cognitive
    val simpleMode: Boolean = false,
    val hideDistractions: Boolean = false,
    val plainLanguage: Boolean = false,
    val stepByStep: Boolean = false,
    val confirmActions: Boolean = false,
    val iconLabels: Boolean = false,
    // reading
    val dyslexiaFont: Boolean = false,
    val readingRuler: Boolean = false,
    val tts: Boolean = false,
    val ttsRate: Double = 1.0,
    // general
    val language: Language = Language.AZ,
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("version", version)
        put("fontScale", fontScale)
        put("lineSpacing", lineSpacing)
        put("letterSpacing", letterSpacing)
        put("contrast", contrast.json)
        put("colorFilter", colorFilter.json)
        put("highlightLinks", highlightLinks)
        put("largeCursor", largeCursor)
        put("strongFocus", strongFocus)
        put("screenReader", screenReader)
        put("captions", captions)
        put("visualAlerts", visualAlerts)
        put("transcripts", transcripts)
        put("signLanguage", signLanguage)
        put("largeTargets", largeTargets)
        put("extendedTimeouts", extendedTimeouts)
        put("noDrag", noDrag)
        put("reduceMotion", reduceMotion)
        put("simpleMode", simpleMode)
        put("hideDistractions", hideDistractions)
        put("plainLanguage", plainLanguage)
        put("stepByStep", stepByStep)
        put("confirmActions", confirmActions)
        put("iconLabels", iconLabels)
        put("dyslexiaFont", dyslexiaFont)
        put("readingRuler", readingRuler)
        put("tts", tts)
        put("ttsRate", ttsRate)
        put("language", language.json)
    }

    companion object {
        val FONT_SCALES = listOf(1.0, 1.25, 1.5, 1.75, 2.0)
        val LINE_SPACINGS = listOf(1.0, 1.5, 2.0)
        val LETTER_SPACINGS = listOf(0.0, 0.05, 0.1)
        val TTS_RATES = listOf(0.6, 0.8, 1.0, 1.2)

        /**
         * Parses a preferences object. Unknown keys are ignored, missing keys take schema defaults,
         * wrong types or values outside the schema throw [PreferenceException].
         */
        fun fromJson(o: JSONObject): Preferences {
            val d = Preferences()
            return Preferences(
                version = SCHEMA_VERSION,
                fontScale = o.choice("fontScale", FONT_SCALES, d.fontScale),
                lineSpacing = o.choice("lineSpacing", LINE_SPACINGS, d.lineSpacing),
                letterSpacing = o.choice("letterSpacing", LETTER_SPACINGS, d.letterSpacing),
                contrast = o.enumValue("contrast", Contrast.entries, { it.json }, d.contrast),
                colorFilter = o.enumValue("colorFilter", ColorFilter.entries, { it.json }, d.colorFilter),
                highlightLinks = o.bool("highlightLinks", d.highlightLinks),
                largeCursor = o.bool("largeCursor", d.largeCursor),
                strongFocus = o.bool("strongFocus", d.strongFocus),
                screenReader = o.bool("screenReader", d.screenReader),
                captions = o.bool("captions", d.captions),
                visualAlerts = o.bool("visualAlerts", d.visualAlerts),
                transcripts = o.bool("transcripts", d.transcripts),
                signLanguage = o.bool("signLanguage", d.signLanguage),
                largeTargets = o.bool("largeTargets", d.largeTargets),
                extendedTimeouts = o.bool("extendedTimeouts", d.extendedTimeouts),
                noDrag = o.bool("noDrag", d.noDrag),
                reduceMotion = o.bool("reduceMotion", d.reduceMotion),
                simpleMode = o.bool("simpleMode", d.simpleMode),
                hideDistractions = o.bool("hideDistractions", d.hideDistractions),
                plainLanguage = o.bool("plainLanguage", d.plainLanguage),
                stepByStep = o.bool("stepByStep", d.stepByStep),
                confirmActions = o.bool("confirmActions", d.confirmActions),
                iconLabels = o.bool("iconLabels", d.iconLabels),
                dyslexiaFont = o.bool("dyslexiaFont", d.dyslexiaFont),
                readingRuler = o.bool("readingRuler", d.readingRuler),
                tts = o.bool("tts", d.tts),
                ttsRate = o.choice("ttsRate", TTS_RATES, d.ttsRate),
                language = o.enumValue("language", Language.entries, { it.json }, d.language),
            )
        }

        fun fromJson(json: String): Preferences = fromJson(JSONObject(json))

        private fun JSONObject.raw(key: String): Any? =
            if (!has(key)) null else get(key).also {
                if (it == JSONObject.NULL) throw PreferenceException("$key must not be null", key)
            }

        private fun JSONObject.bool(key: String, default: Boolean): Boolean = when (val v = raw(key)) {
            null -> default
            is Boolean -> v
            else -> throw PreferenceException("$key must be boolean", key)
        }

        private fun JSONObject.choice(key: String, allowed: List<Double>, default: Double): Double {
            val v = raw(key) ?: return default
            if (v !is Number) throw PreferenceException("$key must be a number", key)
            val d = v.toDouble()
            return allowed.firstOrNull { it == d }
                ?: throw PreferenceException("$key must be one of ${allowed.joinToString()}", key)
        }

        private fun <E> JSONObject.enumValue(key: String, entries: List<E>, json: (E) -> String, default: E): E {
            val v = raw(key) ?: return default
            if (v !is String) throw PreferenceException("$key must be a string", key)
            return entries.firstOrNull { json(it) == v }
                ?: throw PreferenceException("$key must be one of ${entries.joinToString { json(it) }}", key)
        }
    }
}
