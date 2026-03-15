# Android MainActivity Integrated Implementation

## 目的
- Android Studio 側で分散している実装を 1 つの `MainActivity.kt` にまとめる
- 限定テストに必要な要素を一度に反映できる形へ整理する

## 含める機能
- WebView 表示
- `AndroidBridge` による Web -> Android 受信
- `homeStation` / `dropoffTarget` の `SharedPreferences` 保存
- `permissions.get` / `permissions.state` の返却
- `notification.test` / `notification.test.sent` の返却
- `homeStation.state` / `dropoffTarget.state` の初期同期
- 前面表示中の位置監視
- 到着駅接近通知
- `dropoffTarget.notified` の返却

## AndroidManifest.xml で必要な権限
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
```

## Gradle 依存関係
```kotlin
implementation("com.google.android.gms:play-services-location:21.3.0")
```

## MainActivity.kt 完全版
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
                val requestId = json.optString("requestId")

                when (type) {
                    "notification.test" -> {
                        val title = payload?.optString("title") ?: "通知テスト"
                        val body = payload?.optString("body") ?: "Androidアプリの通知テストです。"

                        runOnUiThread {
                            showNativeNotification(title, body)
                            dispatchEventToWeb(
                                type = "notification.test.sent",
                                requestId = requestId,
                                payload = JSONObject().apply {
                                    put("title", title)
                                    put("body", body)
                                    put("sent", true)
                                }
                            )
                        }
                    }

                    "permissions.get" -> {
                        runOnUiThread {
                            dispatchEventToWeb(
                                type = "permissions.state",
                                requestId = requestId,
                                payload = buildPermissionStatePayload()
                            )
                        }
                    }

                    "homeStation.set" -> {
                        if (payload != null) {
                            appPreferences.edit().putString(homeStationKey, payload.toString()).apply()
                            Log.d("TrainAppBridge", "homeStation saved: $payload")
                            dispatchEventToWeb(
                                type = "homeStation.state",
                                requestId = requestId,
                                payload = payload
                            )
                        }
                    }

                    "homeStation.clear" -> {
                        appPreferences.edit().remove(homeStationKey).apply()
                        Log.d("TrainAppBridge", "homeStation cleared")
                    }

                    "dropoffTarget.set" -> {
                        if (payload != null) {
                            appPreferences.edit().putString(dropoffTargetKey, payload.toString()).apply()
                            Log.d("TrainAppBridge", "dropoffTarget saved: $payload")
                            dispatchEventToWeb(
                                type = "dropoffTarget.state",
                                requestId = requestId,
                                payload = payload
                            )
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
                dispatchSavedStationsToWeb()
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
    }

    private fun stopLocationUpdates() {
        if (::locationCallback.isInitialized) {
            fusedLocationClient.removeLocationUpdates(locationCallback)
        }
    }

    private fun evaluateDropoffTarget(location: Location) {
        val rawDropoffTarget = appPreferences.getString(dropoffTargetKey, null) ?: return
        val json = JSONObject(rawDropoffTarget)

        if (!json.optBoolean("enabled", true) || json.optBoolean("notified", false)) {
            return
        }

        val station = json.optJSONObject("station") ?: return
        val stationId = station.optString("id")
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
            location.speed.toDouble().coerceAtLeast(0.5)
        } else {
            defaultSpeedMetersPerSecond
        }

        val notifyBeforeMinutes = json.optDouble("notifyBeforeMinutes", defaultNotifyBeforeMinutes)
        val targetDistance = json.optDouble("targetDistance", defaultTargetDistance)
        val estimatedArrivalMinutes = distanceMeters / speedMetersPerSecond / 60.0

        val shouldNotify = distanceMeters <= targetDistance &&
            estimatedArrivalMinutes <= notifyBeforeMinutes

        if (!shouldNotify) {
            return
        }

        showNativeNotification(
            "まもなく${stationName}",
            "約${distanceMeters.roundToInt()}m先です。降車準備をしてください。"
        )

        json.put("notified", true)
        val notifiedAt = java.time.Instant.now().toString()
        json.put("notifiedAt", notifiedAt)
        appPreferences.edit().putString(dropoffTargetKey, json.toString()).apply()

        dispatchEventToWeb(
            type = "dropoffTarget.notified",
            requestId = "event-dropoff-notified",
            payload = JSONObject().apply {
                put("stationId", stationId)
                put("stationName", stationName)
                put("distanceMeters", distanceMeters)
                put("estimatedArrivalMinutes", estimatedArrivalMinutes)
                put("notifiedAt", notifiedAt)
            }
        )
    }

    private fun dispatchSavedStationsToWeb() {
        val rawHomeStation = appPreferences.getString(homeStationKey, null)
        val rawDropoffTarget = appPreferences.getString(dropoffTargetKey, null)

        if (rawHomeStation != null) {
            dispatchEventToWeb(
                type = "homeStation.state",
                requestId = "sync-home-station",
                payload = JSONObject(rawHomeStation)
            )
        }

        if (rawDropoffTarget != null) {
            dispatchEventToWeb(
                type = "dropoffTarget.state",
                requestId = "sync-dropoff-target",
                payload = JSONObject(rawDropoffTarget)
            )
        }
    }

    private fun buildPermissionStatePayload(): JSONObject {
        val notificationGranted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ActivityCompat.checkSelfPermission(
                this,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }

        val foregroundLocationGranted = ActivityCompat.checkSelfPermission(
            this,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        val backgroundLocationGranted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ActivityCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_BACKGROUND_LOCATION
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            foregroundLocationGranted
        }

        return JSONObject().apply {
            put("notificationGranted", notificationGranted)
            put("foregroundLocationGranted", foregroundLocationGranted)
            put("backgroundLocationGranted", backgroundLocationGranted)
        }
    }

    private fun dispatchEventToWeb(
        type: String,
        requestId: String,
        payload: JSONObject
    ) {
        if (!this::webView.isInitialized) {
            return
        }

        Log.d("TrainAppBridge", "dispatch to web: $type")

        val envelope = JSONObject().apply {
            put("type", type)
            put("requestId", requestId)
            put("timestamp", java.time.Instant.now().toString())
            put("payload", payload)
        }

        val script = "window.handleAndroidBridgeMessage(${escapeForJavascript(envelope.toString())});"

        webView.post {
            webView.evaluateJavascript(script, null)
        }
    }

    private fun escapeForJavascript(raw: String): String {
        return JSONObject.quote(raw)
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

## 確認手順
1. Android Studio で `MainActivity.kt` を上記へ置き換える
2. `AndroidManifest.xml` に権限を追加する
3. `build.gradle` に `play-services-location` を追加する
4. アプリを起動し、通知権限と位置権限を許可する
5. `HOME駅` を設定する
6. `到着駅` を設定する
7. `HOME駅` 画面の `Android状態を取得` を押す
8. `Android HOME駅` と `Android 到着駅` が表示されることを確認する
9. 接近時に通知が出て、`最終到着駅通知` が更新されることを確認する

## 注意
- これは前面表示中の限定テスト向け実装
- バックグラウンド継続監視は次段階で `Foreground Service` 化する
- `handler?.proceed()` は開発用。限定テスト後に証明書運用を見直す
