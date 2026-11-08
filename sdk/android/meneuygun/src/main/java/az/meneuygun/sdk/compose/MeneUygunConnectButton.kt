package az.meneuygun.sdk.compose

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import az.meneuygun.sdk.Language
import az.meneuygun.sdk.MeneUygun
import java.util.Locale
import kotlinx.coroutines.launch

private val Amber = Color(0xFFF5BC4A)
private val Ink = Color(0xFF262626)

/** The connect key when disconnected; connected state with a disconnect button otherwise. Azerbaijani or English. Shows SDK errors. */
@Composable
fun MeneUygunConnectButton(modifier: Modifier = Modifier) {
    val connected by MeneUygun.isConnected.collectAsState()
    val sdkError by MeneUygun.lastError.collectAsState()
    var disconnectError by remember { mutableStateOf<String?>(null) }
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val prefs by MeneUygun.preferences.collectAsState()
    val english = (prefs?.language == Language.EN) || (prefs == null && Locale.getDefault().language == "en")
    fun l(az: String, en: String) = if (english) en else az
    val keyShape = RoundedCornerShape(10.dp)

    Column(modifier, verticalArrangement = Arrangement.spacedBy(4.dp)) {
        if (!connected) {
            Button(
                onClick = { MeneUygun.connect(context.findActivity()) },
                shape = keyShape,
                border = BorderStroke(2.dp, Ink),
                colors = ButtonDefaults.buttonColors(containerColor = Amber, contentColor = Ink),
                modifier = Modifier.drawBehind {
                    val lift = 5.dp.toPx()
                    drawRoundRect(Ink, topLeft = Offset(lift, lift), size = size, cornerRadius = CornerRadius(10.dp.toPx()))
                },
            ) {
                Text(l("MƏNƏ UYĞUN-dan ayarları gətir", "Bring my MƏNƏ UYĞUN settings"))
            }
        } else {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(l("Qoşulub", "Connected"), style = MaterialTheme.typography.titleMedium)
                OutlinedButton(onClick = {
                    disconnectError = null
                    scope.launch {
                        try {
                            MeneUygun.disconnect()
                        } catch (e: Exception) {
                            disconnectError = l("Ayırmaq alınmadı", "Could not disconnect") + ": ${e.message}"
                        }
                    }
                }, shape = keyShape, border = BorderStroke(2.dp, Ink)) { Text(l("Ayır", "Disconnect"), color = Ink) }
            }
        }
        val error = disconnectError ?: sdkError?.let { l("Xəta", "Error") + ": ${it.message}" }
        if (error != null) {
            Text(error, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
        }
    }
}

private tailrec fun Context.findActivity(): Activity = when (this) {
    is Activity -> this
    is ContextWrapper -> baseContext.findActivity()
    else -> throw IllegalStateException("MeneUygunConnectButton must be hosted in an Activity")
}
