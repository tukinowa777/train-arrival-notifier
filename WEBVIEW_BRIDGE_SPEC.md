# WebView Bridge Spec

## 目的
- WebView 側と Android ネイティブ側のデータ受け渡し仕様を固定する
- UI 実装と Android 実装を並行して進めても、イベント名と JSON 形式がずれないようにする

## 通信方式
- 基本は JSON メッセージ
- Kotlin 実装では Web -> Android に `JavascriptInterface` を採用する
- Kotlin 実装では Android -> Web に `evaluateJavascript` を採用する
- Web 側イベント通知は `window.dispatchEvent` を使う

## Kotlin 実装の基本形
- Web -> Android は `window.AndroidBridge.postMessage(jsonString)` を呼ぶ
- Android 側は `@JavascriptInterface fun postMessage(rawMessage: String)` を公開する
- Android 側で JSON を解析し、`type` ごとの処理へ振り分ける
- Android -> Web は `window.dispatchEvent(new CustomEvent(...))` を `evaluateJavascript` で実行する

## Android 側の保存前提
- 永続化は `SharedPreferences` を前提とする
- `homeStation` と `dropoffTarget` は受信後に即時保存する
- `notificationHistory` は Android 側で最大 20 件を保持し、古い履歴から削除する
- 将来 `Room` へ切り替える場合でも、ブリッジの JSON 形式は変更しない

## 共通メッセージ形式
```json
{
  "type": "bridge.message.type",
  "requestId": "uuid-or-timestamp",
  "timestamp": "2026-03-14T00:00:00.000Z",
  "payload": {}
}
```

## 共通レスポンス形式
```json
{
  "type": "bridge.response",
  "requestId": "uuid-or-timestamp",
  "success": true,
  "payload": {},
  "error": null
}
```

## Kotlin 側の実装前提
- `AndroidBridge` は Activity から `webView.addJavascriptInterface()` で登録する
- `requestId` は Kotlin 側でもそのまま引き回し、応答とイベントの対応付けに使う
- Kotlin 側の保存完了後に `bridge.response` を返し、その後に必要な状態イベントを再送する

## Web -> Android

### 1. HOME駅設定
```json
{
  "type": "homeStation.set",
  "requestId": "req-1",
  "timestamp": "2026-03-14T00:00:00.000Z",
  "payload": {
    "station": {
      "id": "seijo-gakuenmae",
      "name": "成城学園前",
      "nameKana": "せいじょうがくえんまえ",
      "latitude": 35.6336067,
      "longitude": 139.6075713,
      "lines": [
        {
          "id": "odakyu",
          "name": "小田急小田原線",
          "color": "#0066CC",
          "operator": "小田急電鉄"
        }
      ]
    },
    "setAt": "2026-03-14T00:00:00.000Z"
  }
}
```

### 2. HOME駅解除
```json
{
  "type": "homeStation.clear",
  "requestId": "req-2",
  "timestamp": "2026-03-14T00:00:00.000Z",
  "payload": {}
}
```

### 3. 降車駅設定
```json
{
  "type": "dropoffTarget.set",
  "requestId": "req-3",
  "timestamp": "2026-03-14T00:00:00.000Z",
  "payload": {
    "station": {
      "id": "shinjuku",
      "name": "新宿",
      "nameKana": "しんじゅく",
      "latitude": 35.6896067,
      "longitude": 139.7005713,
      "lines": []
    },
    "enabled": true,
    "notified": false,
    "notifyBeforeMinutes": 3,
    "targetDistance": 1500,
    "setAt": "2026-03-14T00:00:00.000Z"
  }
}
```

### 4. 降車駅解除
```json
{
  "type": "dropoffTarget.clear",
  "requestId": "req-4",
  "timestamp": "2026-03-14T00:00:00.000Z",
  "payload": {}
}
```

### 5. 権限状態要求
```json
{
  "type": "permissions.get",
  "requestId": "req-5",
  "timestamp": "2026-03-14T00:00:00.000Z",
  "payload": {}
}
```

### 6. 最寄駅候補要求
```json
{
  "type": "nearbyStations.get",
  "requestId": "req-6",
  "timestamp": "2026-03-14T00:00:00.000Z",
  "payload": {
    "limit": 3,
    "radiusMeters": 2000
  }
}
```

### 7. テスト通知要求
```json
{
  "type": "notification.test",
  "requestId": "req-7",
  "timestamp": "2026-03-14T00:00:00.000Z",
  "payload": {
    "title": "テスト通知",
    "body": "Android ネイティブ通知の動作確認です。"
  }
}
```

## Android -> Web

### 1. 権限状態返却
```json
{
  "type": "permissions.state",
  "requestId": "req-5",
  "timestamp": "2026-03-14T00:00:00.000Z",
  "payload": {
    "notificationGranted": true,
    "foregroundLocationGranted": true,
    "backgroundLocationGranted": true,
    "batteryOptimizationIgnored": false
  }
}
```

### 2. 最寄駅候補返却
```json
{
  "type": "nearbyStations.state",
  "requestId": "req-6",
  "timestamp": "2026-03-14T00:00:00.000Z",
  "payload": {
    "stations": [
      {
        "id": "seijo-gakuenmae",
        "name": "成城学園前",
        "distance": 120
      },
      {
        "id": "soshigaya-okura",
        "name": "祖師ヶ谷大蔵",
        "distance": 840
      }
    ]
  }
}
```

### 3. HOME駅現在値返却
```json
{
  "type": "homeStation.state",
  "requestId": "sync-1",
  "timestamp": "2026-03-14T00:00:00.000Z",
  "payload": {
    "station": {
      "id": "seijo-gakuenmae",
      "name": "成城学園前"
    },
    "setAt": "2026-03-14T00:00:00.000Z"
  }
}
```

### 4. 降車駅現在値返却
```json
{
  "type": "dropoffTarget.state",
  "requestId": "sync-2",
  "timestamp": "2026-03-14T00:00:00.000Z",
  "payload": {
    "station": {
      "id": "shinjuku",
      "name": "新宿"
    },
    "enabled": true,
    "notified": false,
    "notifyBeforeMinutes": 3,
    "targetDistance": 1500,
    "setAt": "2026-03-14T00:00:00.000Z"
  }
}
```

### 5. 降車駅通知発火イベント
```json
{
  "type": "dropoffTarget.notified",
  "requestId": "event-1",
  "timestamp": "2026-03-14T00:00:00.000Z",
  "payload": {
    "stationId": "shinjuku",
    "stationName": "新宿",
    "distanceMeters": 420,
    "estimatedArrivalMinutes": 2.5,
    "notifiedAt": "2026-03-14T00:00:00.000Z"
  }
}
```

### 6. エラーイベント
```json
{
  "type": "bridge.error",
  "requestId": "req-6",
  "timestamp": "2026-03-14T00:00:00.000Z",
  "payload": {
    "code": "LOCATION_PERMISSION_DENIED",
    "message": "位置情報権限が拒否されています。"
  }
}
```

## エラーコード
- `LOCATION_PERMISSION_DENIED`
- `BACKGROUND_LOCATION_DENIED`
- `NOTIFICATION_PERMISSION_DENIED`
- `NEARBY_STATION_NOT_FOUND`
- `INVALID_PAYLOAD`
- `INTERNAL_ERROR`

## 同期タイミング

### アプリ起動時
- Android -> Web
  - `permissions.state`
  - `homeStation.state`
  - `dropoffTarget.state`

### Web から保存要求を受けた時
- Android
  - `SharedPreferences` へ保存
  - `bridge.response` を返却
  - 必要に応じて最新の `homeStation.state` または `dropoffTarget.state` を再送する

### 通知発火時
- Android
  - `notificationHistory` に追記
  - `dropoffTarget.notified` を Web へ送る
  - `dropoffTarget.state`

### HOME駅変更時
- Web -> Android
  - `homeStation.set`
- Android -> Web
  - `homeStation.state`

### 降車駅変更時
- Web -> Android
  - `dropoffTarget.set`
- Android -> Web
  - `dropoffTarget.state`

### 最寄駅取得時
- Web -> Android
  - `nearbyStations.get`
- Android -> Web
  - `nearbyStations.state`

### 通知発火時
- Android -> Web
  - `dropoffTarget.notified`

## データスキーマ方針
- `Station` は既存 Web の `src/types/station.ts` と互換にする
- `dropoffTarget` は既存 Web の `storageService.ts` に合わせる
- `notifyBeforeMinutes` の既定値は 3
- `targetDistance` の既定値は 1500

## 次に決めること
- Android 側で使う保存先を SharedPreferences にするか Room にするか
- WebView ブリッジの実装方式を `JavascriptInterface` にするか `postMessage` にするか
- 通知発火履歴を Android 側で何件保持するか
