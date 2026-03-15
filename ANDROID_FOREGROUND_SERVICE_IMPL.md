# Android Foreground Service 実装ガイド

## 目的
- 前面表示中だけの位置監視から進めて、Android アプリとしてバックグラウンドでも到着駅通知を出せる構成へ移行する
- Android Studio 側で `LocationTrackingService.kt` を追加し、限定テスト後の本命実装に進むための土台を作る

## この段階で追加するもの
- `LocationTrackingService.kt`
- `MainActivity.kt` からの Service 起動 / 停止
- Foreground Service 用 NotificationChannel
- `dropoffTarget` を Service 側で読んで接近判定する処理

## 前提
- `ANDROID_MAIN_ACTIVITY_INTEGRATED.md` の内容が反映済み
- `dropoffTarget` は `SharedPreferences` に保存済み
- `notification.test`、`permissions.state`、`homeStation.state`、`dropoffTarget.state` が動く状態

## AndroidManifest.xml で追加するもの
```xml
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
```

`<application>` 内には service 宣言も必要。

```xml
<service
    android:name=".LocationTrackingService"
    android:enabled="true"
    android:exported="false"
    android:foregroundServiceType="location" />
```

## 実装方針

### MainActivity の役割
- 権限確認
- WebView 表示
- `dropoffTarget` 保存
- Service 開始 / 停止トリガー

### LocationTrackingService の役割
- Foreground Service として動作
- `FusedLocationProviderClient` で位置更新を購読
- `dropoffTarget` を読んで接近判定
- 通知送信
- 必要なら `dropoffTarget.notified` を Web 側へ返すためのフラグ保存

## Kotlin 実装例

### `LocationTrackingService.kt`
```kotlin
package com.example.trainapp

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.os.Build
import android.os.IBinder
import android.os.Looper
import android.util.Log
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

class LocationTrackingService : Service() {

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback

    private val appPreferences by lazy {
        getSharedPreferences("train_notifier_prefs", Context.MODE_PRIVATE)
    }

    companion object {
        private const val serviceChannelId = "train_location_service"
        private const val serviceNotificationId = 2001
        private const val approachNotificationChannelId = "train_test_channel"
        private const val dropoffTargetKey = "dropoffTarget"
        private const val defaultNotifyBeforeMinutes = 3.0
        private const val defaultTargetDistance = 1500.0
        private const val defaultSpeedMetersPerSecond = 8.33
    }

    override fun onCreate() {
        super.onCreate()
        createServiceChannel()
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        setupLocationCallback()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(serviceNotificationId, createServiceNotification())
        startLocationUpdates()
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        if (::locationCallback.isInitialized) {
            fusedLocationClient.removeLocationUpdates(locationCallback)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun setupLocationCallback() {
        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                val location = result.lastLocation ?: return
                evaluateDropoffTarget(location)
            }
        }
    }

    private fun startLocationUpdates() {
        val fineGranted = ActivityCompat.checkSelfPermission(
            this,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        if (!fineGranted) {
            Log.d("TrainAppService", "location permission not granted")
            stopSelf()
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

    private fun evaluateDropoffTarget(location: Location) {
        val rawDropoffTarget = appPreferences.getString(dropoffTargetKey, null) ?: return
        val json = JSONObject(rawDropoffTarget)

        if (!json.optBoolean("enabled", true) || json.optBoolean("notified", false)) {
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

        sendApproachNotification(
            title = "まもなく${stationName}",
            body = "約${distanceMeters.roundToInt()}m先です。降車準備をしてください。"
        )

        json.put("notified", true)
        json.put("notifiedAt", java.time.Instant.now().toString())
        appPreferences.edit().putString(dropoffTargetKey, json.toString()).apply()

        Log.d("TrainAppService", "dropoff notified: $stationName")
    }

    private fun createServiceChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                serviceChannelId,
                "到着駅監視サービス",
                NotificationManager.IMPORTANCE_LOW
            )

            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    private fun createServiceNotification(): Notification {
        return NotificationCompat.Builder(this, serviceChannelId)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("到着駅教える君β")
            .setContentText("到着駅の接近を監視しています")
            .setOngoing(true)
            .build()
    }

    private fun sendApproachNotification(title: String, body: String) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (
                ActivityCompat.checkSelfPermission(
                    this,
                    Manifest.permission.POST_NOTIFICATIONS
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                return
            }
        }

        val notification = NotificationCompat.Builder(this, approachNotificationChannelId)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .build()

        NotificationManagerCompat.from(this).notify(3001, notification)
    }
}
```

## MainActivity で追加するもの

### Service 開始
```kotlin
private fun startLocationTrackingService() {
    val serviceIntent = Intent(this, LocationTrackingService::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        startForegroundService(serviceIntent)
    } else {
        startService(serviceIntent)
    }
}
```

### Service 停止
```kotlin
private fun stopLocationTrackingService() {
    val serviceIntent = Intent(this, LocationTrackingService::class.java)
    stopService(serviceIntent)
}
```

### 呼び出し位置
- `dropoffTarget.set` が保存された直後に `startLocationTrackingService()`
- `dropoffTarget.clear` の直後に `stopLocationTrackingService()`

## 実務上の注意
- Foreground Service を使うと常駐通知が出る
- Android 13 以降は通知権限未許可だと体験が不安定になる
- バッテリー最適化設定の影響を受ける端末がある
- Play 公開時はバックグラウンド位置情報の説明が必要になる

## この段階の確認項目
1. 到着駅設定後に常駐通知が出る
2. アプリを閉じても監視が継続する
3. 到着駅へ近づいたときに通知が出る
4. 到着駅解除で常駐監視が止まる

## 次の改善
- `dropoffTarget.notified` を Web 側へ確実に返す
- Service と `MainActivity` で `AppPreferencesRepository` を共通化する
- Service 起動状態を `HOME駅` 画面へ返す
