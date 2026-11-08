package az.meneuygun.demo

import android.app.Application
import az.meneuygun.sdk.MeneUygun

class DemoApp : Application() {
    override fun onCreate() {
        super.onCreate()
        MeneUygun.init(
            context = this,
            clientId = BuildConfig.MENEUYGUN_CLIENT_ID,
            baseUrl = BuildConfig.MENEUYGUN_BASE_URL,
            redirectUri = BuildConfig.MENEUYGUN_REDIRECT_URI,
        )
    }
}
