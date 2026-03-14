# Android Location Notify Implementation

## 目的
- Android アプリ側で保存済みの `dropoffTarget` を使って接近通知を出す最小実装を用意する
- 少人数の限定テストで、到着駅接近通知の成立性を確認できる状態を作る

## 前提
- `MainActivity.kt` には `AndroidBridge` が実装済みである
- `dropoffTarget.set` / `dropoffTarget.clear` が `SharedPreferences` へ保存される
- WebView には `https://161.33.151.114` を読み込ませる
- 通知テスト (`notification.test`) は既に成功している

## 既存 Web ロジックとの対応
Web 側の判定は `src/hooks/useDropoffNotifier.ts` にある。Android 側も同じ条件に合わせる。

### 判定条件
- 駅までの距離が `targetDistance` 以下
- 予想到着時間が `notifyBeforeMinutes` 以下
- まだ通知済みでない
- `enabled = true`

### 既定値
- `notifyBeforeMinutes = 3`
- `targetDistance = 1500`
- 速度が取れない場合の既定速度 = `8.33 m/s`

## 限定テストでの実装方針
- まずは `MainActivity` 上で位置更新を購読して接近通知を出す
- Foreground Service 化は次段階に回す
- この段階ではアプリ前面表示中に通知が出れば十分とする
- 少人数テストで判定ロジックと保存連携を確認した後、Service 化する

## AndroidManifest.xml に追加する権限
```xml
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

## build.gradle に必要な依存関係
`app/build.gradle.kts` または `app/build.gradle` に以下を追加する。

```kotlin
implementation("com.google.android.gms:play-services-location:21.3.0")
```

## MainActivity へ追加する要素
- `FusedLocationProviderClient`
- 位置情報権限要求
- `LocationRequest`
- `LocationCallback`
- `dropoffTarget` 読込
- 距離計算
- 接近判定
- 通知済みフラグ更新

## Kotlin 実装例
以下は `MainActivity.kt` へ追加する最小構成の例。

```kotlin
package com.example.trainapp

import android.Manifest
import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.location.Location
import android.net.http.SslError
import android.os.Build
import android.os.Bundle
import android.os.Looper
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
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import org.json.JSONObject
import kotlin.math.roundToInt

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback

    private val appPreferences by lazy {
        getSharedPreferences("train_notifier_prefs", Context.MODE_PRIVATE)
    }

    companion object {
        private const val notificationRequestCode = 1001
        private const val locationRequestCode = 1002
        private const val notificationChannelId = "train_test_channel"
        private const val notificationId = 1001
        private const val homeStationKey = "homeStation"
        private const val dropoffTargetKey = "dropoffTarget"
        private const val defaultNotifyBeforeMinutes = 3.0
        private const val defaultTargetDistance = 1500.0
        private const val defaultSpeedMetersPerSecond = 8.33
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
                            Log.d("TrainAppBridge", "homeStation saved")
                        }
                    }

                    "homeStation.clear" -> {
                        appPreferences.edit().remove(homeStationKey).apply()
                        Log.d("TrainAppBridge", "homeStation cleared")
                    }

                    "dropoffTarget.set" -> {
                        if (payload != null) {
                            appPreferences.edit().putString(dropoffTargetKey, payload.toString()).apply()
                            Log.d("TrainAppBridge", "dropoffTarget saved")
                        }
                    }

                    "dropoffTarget.clear" -> {
                        appPreferences.edit().remove(dropoffTargetKey).apply()
                        Log.d("TrainAppBridge", "dropoffTarget cleared")
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
        requestLocationPermissionIfNeeded()

        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        setupLocationCallback()

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

    override fun onResume() {
        super.onResume()
        startLocationUpdatesIfPermitted()
    }

    override fun onPause() {
        super.onPause()
        stopLocationUpdates()
    }

    private fun setupLocationCallback() {
        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                val location = result.lastLocation ?: return
                evaluateDropoffTarget(location)
            }
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

    private fun requestLocationPermissionIfNeeded() {
        val fineGranted = ActivityCompat.checkSelfPermission(
            this,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        if (!fineGranted) {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION,
                ),
                locationRequestCode
            )
        }
    }

    @SuppressLint("MissingPermission")
    private fun startLocationUpdatesIfPermitted() {
        val fineGranted = ActivityCompat.checkSelfPermission(
            this,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        if (!fineGranted) {
            Log.d("TrainAppLocation", "location permission not granted")
            return
        }

        val locationRequest = LocationRequest.Builder(15000)
            .setMinUpdateIntervalMillis(10000)
            .setWaitForAccurateLocation(false)
            .build()

        fusedLocationClient.requestLocationUpdates(
            locationRequest,
            locationCallback,
            Looper.getMainLooper()
        )

        Log.d("TrainAppLocation", "location updates started")
    }

    private fun stopLocationUpdates() {
        if (::locationCallback.isInitialized) {
            fusedLocationClient.removeLocationUpdates(locationCallback)
            Log.d("TrainAppLocation", "location updates stopped")
        }
    }

    private fun evaluateDropoffTarget(location: Location) {
        val rawDropoffTarget = appPreferences.getString(dropoffTargetKey, null) ?: return
        val json = JSONObject(rawDropoffTarget)

        if (!json.optBoolean("enabled", true)) {
            return
        }

        if (json.optBoolean("notified", false)) {
            return
        }

        val station = json.optJSONObject("station") ?: return
        val stationName = station.optString("name")
        val stationLatitude = station.optDouble("latitude")
        val stationLongitude = station.optDouble("longitude")

        val result = FloatArray(1)
        Location.distanceBetween(
            location.latitude,
            location.longitude,
            stationLatitude,
            stationLongitude,
            result
        )

        val distanceMeters = result[0].toDouble()
        val speedMetersPerSecond = if (location.hasSpeed()) {
            location.speed.toDouble()
        } else {
            defaultSpeedMetersPerSecond
        }

        val notifyBeforeMinutes = json.optDouble(
            "notifyBeforeMinutes",
            defaultNotifyBeforeMinutes,
        )
        val targetDistance = json.optDouble(
            "targetDistance",
            defaultTargetDistance,
        )
        val estimatedArrivalMinutes = distanceMeters / speedMetersPerSecond / 60.0

        Log.d(
            "TrainAppLocation",
            "station=$stationName distance=$distanceMeters eta=$estimatedArrivalMinutes"
        )

        val shouldNotify = distanceMeters <= targetDistance &&
            estimatedArrivalMinutes <= notifyBeforeMinutes

        if (!shouldNotify) {
            return
        }

        showNativeNotification(
            "まもなく${stationName}",
            "約${distanceMeters.roundToInt()}m先です。降車準備をしてください。",
        )

        json.put("notified", true)
        json.put("notifiedAt", System.currentTimeMillis())
        appPreferences.edit().putString(dropoffTargetKey, json.toString()).apply()

        Log.d("TrainAppLocation", "dropoff notified: $stationName")
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                notificationChannelId,
                "Train Test Notifications",
                NotificationManager.IMPORTANCE_HIGH,
            ).apply {
                description = "Android通知テスト用"
            }

            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
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

## 実装上の注意
- この段階では前面表示中の位置更新のみを扱う
- バックグラウンド通知は `Foreground Service` 化の後に対応する
- `handler?.proceed()` は開発用。限定テスト後に証明書運用を見直す
- `dropoffTarget` の `notified` を更新するため、同一駅で重複通知しない

## 先に確認すること
1. `notification.test` が Android 端末で出る
2. `dropoffTarget.set` が `SharedPreferences` に保存される
3. `Logcat` に `TrainAppLocation` の距離ログが出る

## 限定テスト手順
1. アプリを起動する
2. 通知権限と位置情報権限を許可する
3. `HOME駅` を設定する
4. `到着駅` を設定する
5. 位置を動かし、`TrainAppLocation` のログを確認する
6. 対象駅の `targetDistance` 内かつ `3分以内` 想定になると通知が出ることを確認する

## 次段階
- `LocationTrackingService` へ切り出してバックグラウンド監視へ移行する
- 通知タップで対象駅画面へ戻る PendingIntent を追加する
- `WebViewEventDispatcher` で通知発火履歴を Web 側へ返す
- 少人数テスト後に debug APK ではなく署名付き内部テスト配布へ切り替える
