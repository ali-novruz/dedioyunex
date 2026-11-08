package az.meneuygun.sdk

import android.app.Activity
import android.content.Context
import android.content.SharedPreferences
import android.net.Uri
import android.util.Base64
import androidx.browser.customtabs.CustomTabsIntent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.security.SecureRandom

/** Error returned by the MƏNƏ UYĞUN API (`error` / `error_description`) or by the SDK itself. */
class MeneUygunException(val code: String, message: String? = null, val httpStatus: Int? = null) :
    Exception(if (message.isNullOrBlank()) code else "$code: $message")

/**
 * MƏNƏ UYĞUN Android SDK entry point.
 *
 * Call [init] once (Application.onCreate), then [connect] from a button, and [refresh] on every app start.
 */
object MeneUygun {
    private const val STORE = "az.meneuygun.sdk"
    private const val K_TOKEN = "access_token"
    private const val K_PREFS = "preferences_json"
    private const val K_STATE = "pending_state"
    private const val K_VERIFIER = "pending_verifier"
    private const val K_RETURN_TO = "pending_return_activity"

    private class Config(val clientId: String, val baseUrl: String, val redirectUri: String)

    private var config: Config? = null
    private lateinit var store: SharedPreferences
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val random = SecureRandom()

    private val _preferences = MutableStateFlow<Preferences?>(null)
    private val _isConnected = MutableStateFlow(false)
    private val _lastError = MutableStateFlow<MeneUygunException?>(null)

    /** Last known preferences (cached locally), or null when not connected. */
    val preferences: StateFlow<Preferences?> = _preferences.asStateFlow()

    /** True while an access token is stored. */
    val isConnected: StateFlow<Boolean> = _isConnected.asStateFlow()

    /** Last error from the authorize redirect / token exchange (these run outside the caller's coroutine). */
    val lastError: StateFlow<MeneUygunException?> = _lastError.asStateFlow()

    val isInitialized: Boolean get() = config != null

    fun init(context: Context, clientId: String, baseUrl: String, redirectUri: String) {
        require(clientId.isNotBlank()) { "clientId is blank" }
        require(baseUrl.startsWith("http://") || baseUrl.startsWith("https://")) { "baseUrl must be http(s): $baseUrl" }
        require(Uri.parse(redirectUri).scheme != null) { "redirectUri has no scheme: $redirectUri" }
        config = Config(clientId, baseUrl.trimEnd('/'), redirectUri)
        store = context.applicationContext.getSharedPreferences(STORE, Context.MODE_PRIVATE)
        _isConnected.value = store.getString(K_TOKEN, null) != null
        _preferences.value = store.getString(K_PREFS, null)?.let { Preferences.fromJson(it) }
    }

    /** Opens the consent screen in a Custom Tab (OAuth 2.0 authorization code + PKCE S256). */
    fun connect(activity: Activity) {
        val c = requireConfig()
        val verifier = randomUrlSafe(32)
        val state = randomUrlSafe(16)
        store.edit()
            .putString(K_VERIFIER, verifier)
            .putString(K_STATE, state)
            .putString(K_RETURN_TO, activity.javaClass.name)
            .apply()
        _lastError.value = null
        val uri = Uri.parse("${c.baseUrl}/oauth/authorize").buildUpon()
            .appendQueryParameter("response_type", "code")
            .appendQueryParameter("client_id", c.clientId)
            .appendQueryParameter("redirect_uri", c.redirectUri)
            .appendQueryParameter("code_challenge", codeChallenge(verifier))
            .appendQueryParameter("code_challenge_method", "S256")
            .appendQueryParameter("state", state)
            .build()
        CustomTabsIntent.Builder().setShowTitle(true).build().launchUrl(activity, uri)
    }

    /** GET /v1/preferences. On 401 the token is deleted and null is returned. */
    suspend fun refresh(): Preferences? = withContext(Dispatchers.IO) {
        val c = requireConfig()
        val token = store.getString(K_TOKEN, null) ?: return@withContext null
        try {
            val body = http("GET", "${c.baseUrl}/v1/preferences", bearer = token)
            val prefs = Preferences.fromJson(body.getJSONObject("preferences"))
            savePreferences(prefs)
            prefs
        } catch (e: MeneUygunException) {
            if (e.httpStatus == 401) {
                clearLocal()
                null
            } else {
                throw e
            }
        }
    }

    /** POST /oauth/revoke, then deletes the local token and preferences (also if revoke fails; the error is rethrown). */
    suspend fun disconnect() = withContext(Dispatchers.IO) {
        val c = requireConfig()
        val token = store.getString(K_TOKEN, null) ?: return@withContext
        try {
            http("POST", "${c.baseUrl}/oauth/revoke", json = JSONObject().put("token", token))
        } finally {
            clearLocal()
        }
    }

    fun clearError() {
        _lastError.value = null
    }

    /** Called by [MeneUygunRedirectActivity]. Returns the activity class that started [connect], if known. */
    internal fun handleRedirect(uri: Uri): String? {
        val c = requireConfig()
        val expectedState = store.getString(K_STATE, null)
        val verifier = store.getString(K_VERIFIER, null)
        val returnTo = store.getString(K_RETURN_TO, null)
        store.edit().remove(K_STATE).remove(K_VERIFIER).remove(K_RETURN_TO).apply()

        val state = uri.getQueryParameter("state")
        when {
            expectedState == null || verifier == null ->
                _lastError.value = MeneUygunException("no_pending_request", "Redirect received without a pending connect()")
            state != expectedState ->
                _lastError.value = MeneUygunException("state_mismatch", "Redirect state does not match")
            uri.getQueryParameter("error") != null ->
                _lastError.value = MeneUygunException(
                    uri.getQueryParameter("error")!!,
                    uri.getQueryParameter("error_description"),
                )
            uri.getQueryParameter("code") == null ->
                _lastError.value = MeneUygunException("invalid_response", "Redirect has neither code nor error")
            else -> {
                val code = uri.getQueryParameter("code")!!
                scope.launch {
                    try {
                        val body = http(
                            "POST", "${c.baseUrl}/oauth/token",
                            json = JSONObject()
                                .put("grant_type", "authorization_code")
                                .put("code", code)
                                .put("code_verifier", verifier)
                                .put("client_id", c.clientId)
                                .put("redirect_uri", c.redirectUri),
                        )
                        val token = body.getString("access_token")
                        val prefs = Preferences.fromJson(body.getJSONObject("preferences"))
                        store.edit().putString(K_TOKEN, token).apply()
                        savePreferences(prefs)
                        _isConnected.value = true
                    } catch (e: MeneUygunException) {
                        _lastError.value = e
                    } catch (e: IOException) {
                        _lastError.value = MeneUygunException("network_error", e.message)
                    } catch (e: PreferenceException) {
                        _lastError.value = MeneUygunException("invalid_preferences", e.message)
                    } catch (e: org.json.JSONException) {
                        _lastError.value = MeneUygunException("invalid_response", e.message)
                    }
                }
            }
        }
        return returnTo
    }

    private fun savePreferences(prefs: Preferences) {
        store.edit().putString(K_PREFS, prefs.toJson().toString()).apply()
        _preferences.value = prefs
    }

    private fun clearLocal() {
        store.edit().remove(K_TOKEN).remove(K_PREFS).apply()
        _isConnected.value = false
        _preferences.value = null
    }

    private fun requireConfig(): Config =
        config ?: throw IllegalStateException("MeneUygun.init(context, clientId, baseUrl, redirectUri) was not called")

    private fun randomUrlSafe(bytes: Int): String =
        ByteArray(bytes).also(random::nextBytes).base64Url()

    internal fun codeChallenge(verifier: String): String =
        MessageDigest.getInstance("SHA-256").digest(verifier.toByteArray(Charsets.US_ASCII)).base64Url()

    private fun ByteArray.base64Url(): String =
        Base64.encodeToString(this, Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP)

    /** Minimal JSON-over-HTTP. Throws [MeneUygunException] for non-2xx responses, [IOException] for network failures. */
    private fun http(method: String, url: String, bearer: String? = null, json: JSONObject? = null): JSONObject {
        val conn = URL(url).openConnection() as HttpURLConnection
        try {
            conn.requestMethod = method
            conn.connectTimeout = 15_000
            conn.readTimeout = 15_000
            conn.setRequestProperty("Accept", "application/json")
            bearer?.let { conn.setRequestProperty("Authorization", "Bearer $it") }
            if (json != null) {
                conn.doOutput = true
                conn.setRequestProperty("Content-Type", "application/json; charset=utf-8")
                conn.outputStream.use { it.write(json.toString().toByteArray(Charsets.UTF_8)) }
            }
            val status = conn.responseCode
            val stream = if (status in 200..299) conn.inputStream else conn.errorStream
            val text = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
            if (status !in 200..299) {
                val err = runCatching { JSONObject(text) }.getOrNull()
                throw MeneUygunException(
                    err?.optString("error")?.takeIf { it.isNotEmpty() } ?: "http_$status",
                    err?.optString("error_description")?.takeIf { it.isNotEmpty() } ?: text.take(200),
                    status,
                )
            }
            return if (text.isBlank()) JSONObject() else JSONObject(text)
        } finally {
            conn.disconnect()
        }
    }
}
