# Android Bridge Response Implementation

## 目的
- Android Studio 側で `permissions.get` を受け、Web 側へ `permissions.state` を返す最小実装を定義する
- `notification.test` 成功後の次段階として、Android の権限状態やイベント結果を WebView 画面へ戻せるようにする

## 前提
- `MainActivity.kt` には `AndroidBridge` と `webView.addJavascriptInterface(...)` が実装済みである
- Web 側には `src/services/androidBridgeEventService.ts` の `window.handleAndroidBridgeMessage(...)` が入っている
- `HOME駅` 画面には Android 状態表示 UI が実装済みである

## 今回 Android 側で追加するもの
- `dispatchEventToWeb(...)`
- `escapeForJavascript(...)`
- `buildPermissionStatePayload()`
- `permissions.get` 受信時の返却処理
- `notification.test` 成功後の `notification.test.sent` イベント返却

## Kotlin 実装例
以下を `MainActivity.kt` に追加する。

```kotlin
import android.Manifest
import android.content.pm.PackageManager
import androidx.core.app.ActivityCompat
import org.json.JSONObject
```

### 1. `AndroidBridge` の `when (type)` へ追加
```kotlin
"permissions.get" -> {
    runOnUiThread {
        dispatchEventToWeb(
            type = "permissions.state",
            requestId = json.optString("requestId"),
            payload = buildPermissionStatePayload()
        )
    }
}
```

### 2. `notification.test` 成功時の返却を追加
```kotlin
"notification.test" -> {
    val title = payload?.optString("title") ?: "通知テスト"
    val body = payload?.optString("body") ?: "Androidアプリの通知テストです。"

    runOnUiThread {
        showNativeNotification(title, body)
        dispatchEventToWeb(
            type = "notification.test.sent",
            requestId = json.optString("requestId"),
            payload = JSONObject().apply {
                put("title", title)
                put("body", body)
                put("sent", true)
            }
        )
    }
}
```

### 3. `MainActivity` に追加するヘルパー
```kotlin
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
```

## 期待する動作
1. `HOME駅` 画面で `Android状態を取得` を押す
2. Web -> Android で `permissions.get` が送られる
3. Android -> Web で `permissions.state` が返る
4. 画面上の `Android通知権限` / `Android位置権限` / `最終Androidイベント` が更新される

## Logcat で見るもの
- `TrainAppBridge`
- `TrainAppWebView`

必要なら、`dispatchEventToWeb(...)` 呼出前に以下を入れてよい。

```kotlin
Log.d("TrainAppBridge", "dispatch to web: $type")
```

## この段階でできること
- Android の権限状態を WebView UI に返せる
- テスト通知送信結果を WebView UI に返せる
- 次段階の `dropoffTarget.notified` 返却と同じ経路を確立できる

## 次の実装
- `dropoffTarget.notified` を返す
- `homeStation.state` / `dropoffTarget.state` の初期同期を返す
- 位置監視サービスの状態も `location.state` として返す
