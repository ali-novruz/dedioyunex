package az.meneuygun.sdk.compose

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.material3.Button
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import az.meneuygun.sdk.MeneUygun
import kotlinx.coroutines.launch

/** "MƏNƏ UYĞUN-dan ayarları gətir" when disconnected; "Qoşulub ✓" + "Ayır" when connected. Shows SDK errors. */
@Composable
fun MeneUygunConnectButton(modifier: Modifier = Modifier) {
    val connected by MeneUygun.isConnected.collectAsState()
    val sdkError by MeneUygun.lastError.collectAsState()
    var disconnectError by remember { mutableStateOf<String?>(null) }
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    Column(modifier, verticalArrangement = Arrangement.spacedBy(4.dp)) {
        if (!connected) {
            Button(onClick = { MeneUygun.connect(context.findActivity()) }) {
                Text("MƏNƏ UYĞUN-dan ayarları gətir")
            }
        } else {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Qoşulub ✓", style = MaterialTheme.typography.titleMedium)
                OutlinedButton(onClick = {
                    disconnectError = null
                    scope.launch {
                        try {
                            MeneUygun.disconnect()
                        } catch (e: Exception) {
                            disconnectError = "Ayırmaq alınmadı: ${e.message}"
                        }
                    }
                }) { Text("Ayır") }
            }
        }
        val error = disconnectError ?: sdkError?.let { "Xəta: ${it.message}" }
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
