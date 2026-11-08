package az.meneuygun.sdk

import android.content.Context
import android.speech.tts.TextToSpeech
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.Locale

/**
 * TextToSpeech helper honoring `tts` and `ttsRate`.
 * Tries Azerbaijani first; if the engine has no `az` voice it uses Turkish. [state] tells which was chosen.
 * Call [shutdown] when the owner is destroyed.
 */
class MeneUygunTts(context: Context) {
    sealed interface State {
        data object Initializing : State
        /** `language` is "az" or "tr". */
        data class Ready(val language: String) : State
        /** Engine failed to start or has neither az nor tr. */
        data class Unavailable(val reason: String) : State
    }

    private val _state = MutableStateFlow<State>(State.Initializing)
    val state: StateFlow<State> = _state.asStateFlow()

    private val tts: TextToSpeech = TextToSpeech(context.applicationContext) { status ->
        _state.value = if (status != TextToSpeech.SUCCESS) {
            State.Unavailable("TextToSpeech init failed ($status)")
        } else {
            pickLanguage()
        }
    }

    private fun pickLanguage(): State {
        for (tag in listOf("az", "tr")) {
            val r = tts.setLanguage(Locale.forLanguageTag(tag))
            if (r != TextToSpeech.LANG_MISSING_DATA && r != TextToSpeech.LANG_NOT_SUPPORTED) return State.Ready(tag)
        }
        return State.Unavailable("No az or tr voice installed")
    }

    /**
     * Speaks [text] if `preferences.tts` is on. Returns false when TTS is off for this user.
     * Throws if the engine is not ready.
     */
    fun speak(text: String, preferences: Preferences): Boolean {
        if (!preferences.tts) return false
        when (val s = _state.value) {
            is State.Ready -> Unit
            State.Initializing -> throw IllegalStateException("TextToSpeech is still initializing")
            is State.Unavailable -> throw IllegalStateException("TextToSpeech unavailable: ${s.reason}")
        }
        tts.setSpeechRate(preferences.ttsRate.toFloat())
        tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "meneuygun-${System.nanoTime()}")
        return true
    }

    fun stop() {
        tts.stop()
    }

    fun shutdown() {
        tts.shutdown()
    }
}
