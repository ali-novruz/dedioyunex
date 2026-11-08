package az.meneuygun.demo

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import az.meneuygun.sdk.MeneUygun
import az.meneuygun.sdk.MeneUygunTts
import az.meneuygun.sdk.compose.LocalMeneUygun
import az.meneuygun.sdk.compose.MeneUygunConnectButton
import az.meneuygun.sdk.compose.MeneUygunTheme
import kotlinx.coroutines.launch
import java.util.Locale

private data class Product(val name: String, val price: Double)

private val PRODUCTS = listOf(
    Product("Alma, 1 kq", 1.20),
    Product("Təndir çörəyi", 0.80),
    Product("Süd, 1 litr", 2.10),
)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MeneUygunTheme {
                Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                    DemoMarketScreen()
                }
            }
        }
    }
}

private fun money(v: Double) = String.format(Locale.US, "%.2f ₼", v)

@Composable
private fun DemoMarketScreen() {
    val prefs = LocalMeneUygun.current
    val connected by MeneUygun.isConnected.collectAsState()
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val tts = remember { MeneUygunTts(context) }
    val ttsState by tts.state.collectAsState()
    DisposableEffect(Unit) { onDispose { tts.shutdown() } }

    var status by remember { mutableStateOf<String?>(null) }
    var cart by remember { mutableIntStateOf(0) }
    var total by remember { mutableStateOf(0.0) }
    var askConfirm by remember { mutableStateOf(false) }

    suspend fun refresh() {
        status = try {
            if (MeneUygun.refresh() == null) "Qoşulmayıb" else "Ayarlar yeniləndi"
        } catch (e: Exception) {
            "Yeniləmək alınmadı: ${e.message}"
        }
    }

    // Fetch on every app start; the cached result is already applied.
    LaunchedEffect(Unit) { if (MeneUygun.isConnected.value) refresh() }

    fun pay() {
        status = "Ödəniş qəbul edildi: ${money(total)} (demo)"
        cart = 0
        total = 0.0
    }

    Column(
        Modifier
            .fillMaxSize()
            .safeDrawingPadding()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        MeneUygunConnectButton()
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(onClick = { scope.launch { refresh() } }, enabled = connected) { Text("Yenilə") }
            if (prefs.tts) {
                OutlinedButton(onClick = {
                    status = try {
                        tts.speak("DEMO Market. Səbətdə $cart məhsul var. Cəmi ${money(total)}.", prefs)
                        null
                    } catch (e: IllegalStateException) {
                        e.message
                    }
                }) { Text("Səslə oxu") }
            }
        }
        if (prefs.tts) {
            Text(
                when (val s = ttsState) {
                    MeneUygunTts.State.Initializing -> "Səs: hazırlanır"
                    is MeneUygunTts.State.Ready -> "Səs dili: ${s.language}"
                    is MeneUygunTts.State.Unavailable -> "Səs: ${s.reason}"
                },
                style = MaterialTheme.typography.bodySmall,
            )
        }

        Text("DEMO Market", style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Bold)
        Text("Səbət: $cart məhsul · ${money(total)}", style = MaterialTheme.typography.titleMedium)

        if (!prefs.simpleMode && !prefs.hideDistractions) {
            Text(
                "🔥 Həftəsonu endirimi! Bütün meyvələrə −30%",
                Modifier
                    .fillMaxWidth()
                    .background(Color(0xFFFF7043), RoundedCornerShape(12.dp))
                    .padding(16.dp),
                color = Color.White,
                style = MaterialTheme.typography.titleMedium,
            )
        }

        PRODUCTS.forEach { p ->
            Card(Modifier.fillMaxWidth()) {
                Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(p.name, style = MaterialTheme.typography.titleMedium)
                        Text(money(p.price), style = MaterialTheme.typography.bodyLarge)
                    }
                    Button(onClick = { cart += 1; total += p.price }) { Text("Səbətə at") }
                }
            }
        }

        Spacer(Modifier.padding(4.dp))
        Button(
            onClick = { if (prefs.confirmActions) askConfirm = true else pay() },
            enabled = cart > 0,
            modifier = Modifier.fillMaxWidth(),
        ) { Text("Ödə · ${money(total)}") }

        status?.let { Text(it, style = MaterialTheme.typography.bodyMedium) }
    }

    if (askConfirm) {
        AlertDialog(
            onDismissRequest = { askConfirm = false },
            title = { Text("Əminsiniz?") },
            text = { Text("${money(total)} ödəniləcək. Davam edilsin?") },
            confirmButton = { Button(onClick = { askConfirm = false; pay() }) { Text("Bəli, ödə") } },
            dismissButton = { TextButton(onClick = { askConfirm = false }) { Text("Xeyr") } },
        )
    }
}
