package az.meneuygun.sdk

import android.app.Activity
import android.content.Intent
import android.os.Bundle

/**
 * Receives the OAuth redirect (`{redirectUri}?code=...&state=...` or `?error=...`), hands it to [MeneUygun]
 * and returns to the activity that called [MeneUygun.connect], closing the Custom Tab above it.
 */
class MeneUygunRedirectActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val data = intent?.data
        val returnTo = if (data != null) MeneUygun.handleRedirect(data) else null
        if (returnTo != null) {
            val back = Intent().setClassName(this, returnTo)
                .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            startActivity(back)
        }
        finish()
    }
}
