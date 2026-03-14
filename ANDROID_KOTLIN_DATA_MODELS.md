# Android Kotlin Data Models

## 目的
- WebView ブリッジ JSON と Kotlin data class の対応を固定する
- `BridgeMessageRouter`、`AppPreferencesRepository`、`WebViewEventDispatcher` の入出力を共通化する

## 方針
- Phase 1 では Kotlin の `data class` を最小限に絞る
- ブリッジ共通の envelope と payload を分離する
- `SharedPreferences` に保存するモデルと、WebView へ返すモデルは同じ data class を基本とする
- 解析ライブラリ未導入でも扱えるように、フィールド名は JSON と一致させる

## 共通 envelope

### BridgeRequest
```kotlin
data class BridgeRequest(
    val type: String,
    val requestId: String,
    val timestamp: String,
    val payload: org.json.JSONObject
)
```

### BridgeResponse
```kotlin
data class BridgeResponse(
    val type: String = "bridge.response",
    val requestId: String,
    val success: Boolean,
    val payload: Any? = null,
    val error: BridgeErrorPayload? = null
)
```

## 基本モデル

### StationLine
```kotlin
data class StationLine(
    val id: String,
    val name: String,
    val color: String,
    val operator: String
)
```

### StationSummary
```kotlin
data class StationSummary(
    val id: String,
    val name: String,
    val nameKana: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val lines: List<StationLine> = emptyList()
)
```

## Web -> Android payload

### HomeStationSetPayload
```kotlin
data class HomeStationSetPayload(
    val station: StationSummary,
    val setAt: String
)
```

対応 JSON
- `type = homeStation.set`
- `payload.station`
- `payload.setAt`

### DropoffTargetPayload
```kotlin
data class DropoffTargetPayload(
    val station: StationSummary,
    val enabled: Boolean,
    val notified: Boolean,
    val notifyBeforeMinutes: Int,
    val targetDistance: Int,
    val setAt: String
)
```

対応 JSON
- `type = dropoffTarget.set`
- `payload.station`
- `payload.enabled`
- `payload.notified`
- `payload.notifyBeforeMinutes`
- `payload.targetDistance`
- `payload.setAt`

### NearbyStationsRequestPayload
```kotlin
data class NearbyStationsRequestPayload(
    val limit: Int,
    val radiusMeters: Int
)
```

対応 JSON
- `type = nearbyStations.get`
- `payload.limit`
- `payload.radiusMeters`

### TestNotificationPayload
```kotlin
data class TestNotificationPayload(
    val title: String,
    val body: String
)
```

対応 JSON
- `type = notification.test`
- `payload.title`
- `payload.body`

## Android -> Web payload

### PermissionStatePayload
```kotlin
data class PermissionStatePayload(
    val notificationGranted: Boolean,
    val foregroundLocationGranted: Boolean,
    val backgroundLocationGranted: Boolean,
    val batteryOptimizationIgnored: Boolean
)
```

対応 JSON
- `type = permissions.state`

### NearbyStationItem
```kotlin
data class NearbyStationItem(
    val id: String,
    val name: String,
    val distance: Int
)
```

### NearbyStationsStatePayload
```kotlin
data class NearbyStationsStatePayload(
    val stations: List<NearbyStationItem>
)
```

対応 JSON
- `type = nearbyStations.state`

### HomeStationStatePayload
```kotlin
data class HomeStationStatePayload(
    val station: StationSummary,
    val setAt: String
)
```

対応 JSON
- `type = homeStation.state`

### DropoffTargetStatePayload
```kotlin
data class DropoffTargetStatePayload(
    val station: StationSummary,
    val enabled: Boolean,
    val notified: Boolean,
    val notifyBeforeMinutes: Int,
    val targetDistance: Int,
    val setAt: String
)
```

対応 JSON
- `type = dropoffTarget.state`

### DropoffTargetNotifiedPayload
```kotlin
data class DropoffTargetNotifiedPayload(
    val stationId: String,
    val stationName: String,
    val distanceMeters: Int,
    val estimatedArrivalMinutes: Double,
    val notifiedAt: String
)
```

対応 JSON
- `type = dropoffTarget.notified`

### BridgeErrorPayload
```kotlin
data class BridgeErrorPayload(
    val code: String,
    val message: String
)
```

対応 JSON
- `type = bridge.error`
- `bridge.response.error`

## SharedPreferences 保存モデル

### HomeStationRecord
```kotlin
data class HomeStationRecord(
    val station: StationSummary,
    val setAt: String
)
```

保存キー
- `homeStation`

### DropoffTargetRecord
```kotlin
data class DropoffTargetRecord(
    val station: StationSummary,
    val enabled: Boolean,
    val notified: Boolean,
    val notifyBeforeMinutes: Int,
    val targetDistance: Int,
    val setAt: String
)
```

保存キー
- `dropoffTarget`

### PermissionCacheRecord
```kotlin
data class PermissionCacheRecord(
    val notificationGranted: Boolean,
    val foregroundLocationGranted: Boolean,
    val backgroundLocationGranted: Boolean,
    val batteryOptimizationIgnored: Boolean,
    val updatedAt: String
)
```

保存キー
- `permissionCache`

### LastKnownLocationRecord
```kotlin
data class LastKnownLocationRecord(
    val latitude: Double,
    val longitude: Double,
    val speedMetersPerSecond: Float?,
    val accuracyMeters: Float?,
    val capturedAt: String
)
```

保存キー
- `lastKnownLocation`

### NotificationHistoryItem
```kotlin
data class NotificationHistoryItem(
    val stationId: String,
    val stationName: String,
    val distanceMeters: Int,
    val estimatedArrivalMinutes: Double,
    val notifiedAt: String
)
```

保存キー
- `notificationHistory`
- 最大 20 件を保持する

## 実装上の対応表
- `BridgeModels.kt`
  - `BridgeRequest`
  - `BridgeResponse`
  - `BridgeErrorPayload`
  - WebView ブリッジ用 payload 群
- `model/`
  - `StationSummary`
  - `StationLine`
  - `HomeStationRecord`
  - `DropoffTargetRecord`
  - `PermissionCacheRecord`
  - `LastKnownLocationRecord`
  - `NotificationHistoryItem`

## 解析順序
1. `AndroidBridge.postMessage(rawMessage)` で raw JSON を受ける
2. `BridgeRequest` 相当の envelope を取り出す
3. `type` を見て payload 専用 data class へ詰め替える
4. Repository 保存または Service 処理へ渡す
5. `BridgeResponse` または状態イベントへ詰めて Web へ返す

## Phase 1 で最低限必要なモデル
- `BridgeRequest`
- `BridgeResponse`
- `BridgeErrorPayload`
- `StationLine`
- `StationSummary`
- `HomeStationSetPayload`
- `DropoffTargetPayload`
- `PermissionStatePayload`
- `HomeStationRecord`
- `DropoffTargetRecord`
