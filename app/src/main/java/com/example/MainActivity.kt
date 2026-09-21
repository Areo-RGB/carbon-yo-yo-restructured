package com.example

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Bitmap
import android.media.AudioManager
import android.os.Build
import android.os.Bundle
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.view.WindowCompat
import androidx.webkit.WebViewAssetLoader
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.example.ui.theme.MyApplicationTheme

private const val LOCAL_APP_URL = "https://appassets.androidplatform.net/assets/webapp/index.html"
private const val LOCAL_APP_HOST = "appassets.androidplatform.net"

class MainActivity : ComponentActivity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    volumeControlStream = AudioManager.STREAM_MUSIC
    setupImmersiveFullscreen()

    setContent {
      MyApplicationTheme(darkTheme = true) {
        Surface(
          modifier = Modifier.fillMaxSize(),
          color = Color.Black
        ) {
          ImmersiveWebViewScreen(
            targetUrl = LOCAL_APP_URL
          )
        }
      }
    }
  }

  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)
    if (hasFocus) {
      applyImmersiveSystemBars()
    }
  }

  override fun onResume() {
    super.onResume()
    applyImmersiveSystemBars()
  }

  private fun setupImmersiveFullscreen() {
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    WindowCompat.setDecorFitsSystemWindows(window, false)

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      window.attributes.layoutInDisplayCutoutMode =
        WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
    }

    applyImmersiveSystemBars()
  }

  private fun applyImmersiveSystemBars() {
    val windowInsetsController = WindowCompat.getInsetsController(window, window.decorView)
    windowInsetsController.systemBarsBehavior =
      WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
    windowInsetsController.hide(WindowInsetsCompat.Type.systemBars())
  }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun ImmersiveWebViewScreen(
  targetUrl: String,
  modifier: Modifier = Modifier
) {
  var webViewInstance by remember { mutableStateOf<WebView?>(null) }
  var canGoBack by remember { mutableStateOf(false) }
  var isLoading by remember { mutableStateOf(true) }
  var hasLoadError by remember { mutableStateOf(false) }

  BackHandler(enabled = canGoBack) {
    webViewInstance?.goBack()
  }

  DisposableEffect(Unit) {
    onDispose {
      webViewInstance?.destroy()
      webViewInstance = null
    }
  }

  Box(
    modifier = modifier
      .fillMaxSize()
      .background(Color.Black)
  ) {
    AndroidView(
      modifier = Modifier
        .fillMaxSize()
        .testTag("carbon_yoyo_webview"),
      factory = { context ->
        val assetLoader = WebViewAssetLoader.Builder()
          .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(context))
          .build()

        WebView(context).apply {
          layoutParams = ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
          )
          setBackgroundColor(android.graphics.Color.BLACK)
          isFocusable = true
          isFocusableInTouchMode = true

          settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            loadWithOverviewMode = true
            useWideViewPort = true
            builtInZoomControls = false
            displayZoomControls = false
            setSupportZoom(false)
            allowFileAccess = false
            allowContentAccess = false
            cacheMode = WebSettings.LOAD_DEFAULT
            mediaPlaybackRequiresUserGesture = false
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
          }

          webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
              view: WebView,
              request: WebResourceRequest
            ): WebResourceResponse? {
              return assetLoader.shouldInterceptRequest(request.url)
                ?: super.shouldInterceptRequest(view, request)
            }

            override fun shouldOverrideUrlLoading(
              view: WebView,
              request: WebResourceRequest
            ): Boolean {
              val uri = request.url

              // Keep the bundled app inside this WebView. Open real external links normally.
              if (uri.scheme == "https" && uri.host == LOCAL_APP_HOST) {
                return false
              }

              return try {
                view.context.startActivity(Intent(Intent.ACTION_VIEW, uri))
                true
              } catch (_: Exception) {
                false
              }
            }

            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
              super.onPageStarted(view, url, favicon)
              canGoBack = view?.canGoBack() ?: false
              hasLoadError = false
            }

            override fun onPageFinished(view: WebView?, url: String?) {
              super.onPageFinished(view, url)
              isLoading = false
              canGoBack = view?.canGoBack() ?: false
            }

            override fun onReceivedError(
              view: WebView,
              request: WebResourceRequest,
              error: WebResourceError
            ) {
              super.onReceivedError(view, request, error)
              if (request.isForMainFrame) {
                isLoading = false
                hasLoadError = true
              }
            }
          }

          webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
              if (newProgress >= 100) {
                isLoading = false
              }
            }
          }

          loadUrl(targetUrl)
          webViewInstance = this
        }
      },
      update = { webView ->
        canGoBack = webView.canGoBack()
      }
    )

    AnimatedVisibility(
      visible = isLoading && !hasLoadError,
      enter = fadeIn(),
      exit = fadeOut(),
      modifier = Modifier.align(Alignment.Center)
    ) {
      CircularProgressIndicator(
        modifier = Modifier
          .size(36.dp)
          .testTag("loading_indicator"),
        color = Color(0xFF64B5F6),
        strokeWidth = 3.dp
      )
    }

    if (hasLoadError) {
      Column(
        modifier = Modifier
          .fillMaxSize()
          .background(Color(0xFF0F0F12))
          .padding(32.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
      ) {
        Text(
          text = stringResource(R.string.unable_to_connect),
          style = MaterialTheme.typography.titleMedium.copy(
            color = Color.White,
            fontWeight = FontWeight.SemiBold
          )
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
          text = stringResource(R.string.check_network),
          style = MaterialTheme.typography.bodyMedium.copy(
            color = Color(0xFF9E9E9E)
          )
        )
        Spacer(modifier = Modifier.height(24.dp))
        FilledTonalButton(
          onClick = {
            hasLoadError = false
            isLoading = true
            webViewInstance?.loadUrl(targetUrl)
          },
          colors = ButtonDefaults.filledTonalButtonColors(
            containerColor = Color(0xFF24242A),
            contentColor = Color.White
          ),
          modifier = Modifier.testTag("retry_button")
        ) {
          Icon(
            imageVector = Icons.Default.Refresh,
            contentDescription = stringResource(R.string.retry),
            modifier = Modifier.size(18.dp)
          )
          Spacer(modifier = Modifier.size(8.dp))
          Text(stringResource(R.string.retry))
        }
      }
    }
  }
}

@Composable
fun Greeting(name: String, modifier: Modifier = Modifier) {
  Text(text = "Hello $name!", modifier = modifier)
}

@Preview(showBackground = true)
@Composable
fun GreetingPreview() {
  MyApplicationTheme { Greeting("Android") }
}
