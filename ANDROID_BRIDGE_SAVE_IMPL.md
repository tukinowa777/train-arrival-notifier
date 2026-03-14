# Android Bridge Save Implementation

## 目的
- Android Studio 側で `homeStation.set` と `dropoffTarget.set` を受信して保存できる最小実装を用意する
- 限定テスト用 APK へ進む前に、WebView からの駅設定が Android 側に残る状態を作る

## 今回追加するもの
- `MainActivity.kt` の `AndroidBridge` に保存処理を追加する
- `SharedPreferences` に `homeStation` / `dropoffTarget` を保存する
- 受信確認ログを `Logcat` に出す

## 保存キー
- `homeStation`
- `dropoffTarget`

## Kotlin コード
以下を `MainActivity.kt` の全文置き換えとして使う。

```kotlin
package com.example.trainapp

import android.Manifest
import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.net.http.SslError
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.webkit.ConsoleMessage
import android.webkit.JavascriptInterface
import android.webkit.SslErrorHandler
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import org.json.JSONObject

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private val appPreferences by lazy {
        getSharedPreferences("train_notifier_prefs", Context.MODE_PRIVATE)
    }

    companion object {
        private const val notificationRequestCode = 1001
        private const val notificationChannelId = "train_test_channel"
        private const val notificationId = 1001
        private const val homeStationKey = "homeStation"
        private const val dropoffTargetKey = "dropoffTarget"
    }

    inner class AndroidBridge {
        @JavascriptInterface
        fun postMessage(rawMessage: String) {
            try {
                Log.d("TrainAppBridge", "message: $rawMessage")
                val json = JSONObject(rawMessage)
                val type = json.optString("type")
                val payload = json.optJSONObject("payload")

                when (type) {
                    "notification.test" -> {
                        val title = payload?.optString("title") ?: "通知テスト"
                        val body = payload?.optString("body") ?: "Androidアプリの通知テストです。"
                        runOnUiThread {
                            showNativeNotification(title, body)
                        }
                    }

                    "homeStation.set" -> {
                        if (payload != null) {
                            appPreferences.edit().putString(homeStationKey, payload.toString()).apply()
                            Log.d("TrainAppBridge", "homeStation saved: ${payload.toString()}")
                        }
                    }

                    "homeStation.clear" -> {
                        appPreferences.edit().remove(homeStationKey).apply()
                        Log.d("TrainAppBridge", "homeStation cleared")
                    }

                    "dropoffTarget.set" -> {
                        if (payload != null) {
                            appPreferences.edit().putString(dropoffTargetKey, payload.toString()).apply()
                            Log.d("TrainAppBridge", "dropoffTarget saved: ${payload.toString()}")
                        }
                    }

                    "dropoffTarget.clear" -> {
                        appPreferences.edit().remove(dropoffTargetKey).apply()
                        Log.d("TrainAppBridge", "dropoffTarget cleared")
                    }

                    "station.preview" -> {
                        Log.d("TrainAppBridge", "station preview: ${payload?.toString()}")
                    }

                    else -> {
                        Log.d("TrainAppBridge", "unsupported type: $type")
                    }
                }
            } catch (error: Exception) {
                Log.e("TrainAppBridge", "bridge error", error)
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        createNotificationChannel()
        requestNotificationPermissionIfNeeded()

        WebView.setWebContentsDebuggingEnabled(true)

        webView = findViewById(R.id.webView)

        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.databaseEnabled = true
        webView.settings.loadsImagesAutomatically = true
        webView.settings.javaScriptCanOpenWindowsAutomatically = true
        webView.settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        webView.settings.allowFileAccess = true
        webView.settings.allowContentAccess = true

        webView.addJavascriptInterface(AndroidBridge(), "AndroidBridge")

        webView.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                Log.d("TrainAppWebView", "onPageStarted: $url")
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                Log.d("TrainAppWebView", "onPageFinished: $url")
            }

            override fun onReceivedSslError(
                view: WebView?,
                handler: SslErrorHandler?,
                error: SslError?
            ) {
                Log.e("TrainAppWebView", "SSL error: ${error?.primaryError}")
                handler?.proceed()
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                Log.d(
                    "TrainAppWebView",
                    "console: ${consoleMessage?.message()} @${consoleMessage?.sourceId()}:${consoleMessage?.lineNumber()}"
                )
                return true
            }
        }

        webView.loadUrl("https://161.33.151.114")
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                notificationChannelId,
                "Train Test Notifications",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Android通知テスト用"
            }

            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (
                ActivityCompat.checkSelfPermission(
                    this,
                    Manifest.permission.POST_NOTIFICATIONS
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                ActivityCompat.requestPermissions(
                    this,
                    arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                    notificationRequestCode
                )
            }
        }
    }

    private fun showNativeNotification(title: String, body: String) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (
                ActivityCompat.checkSelfPermission(
                    this,
                    Manifest.permission.POST_NOTIFICATIONS
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                Log.d("TrainAppBridge", "notification permission not granted")
                return
            }
        }

        val notification = NotificationCompat.Builder(this, notificationChannelId)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .build()

        NotificationManagerCompat.from(this).notify(notificationId, notification)
        Log.d("TrainAppBridge", "native notification sent")
    }

    @Deprecated("WebView back navigation uses the legacy callback here")
    override fun onBackPressed() {
        if (this::webView.isInitialized && webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
```

## 動作確認
1. Android Studio で上記へ置き換えて `Run app`
2. `HOME駅` を設定する
3. `到着駅` を設定する
4. `Logcat` で `TrainAppBridge` を検索する
5. 以下が出れば保存成功
   - `homeStation saved:`
   - `dropoffTarget saved:`

## この段階でできること
- Web 側で選んだ HOME駅 を Android 側へ保持できる
- Web 側で選んだ 到着駅 を Android 側へ保持できる
- 限定テスト用 APK で、端末ごとに設定保持の確認ができる

## 次の実装
- `SharedPreferences` に保存した `dropoffTarget` を位置監視サービスから読む
- 接近判定後にローカル通知を出す
- 端末テスター向け APK を作る
