# Android Studio Project Structure

## 目的
- Kotlin ベースの Android Studio 実装を最小構成で開始できる状態にする
- WebView、位置監視、通知、ブリッジの責務を分離し、初期実装で迷わないようにする

## 前提
- UI は既存 Web アプリを WebView で表示する
- Android 側は Kotlin で実装する
- Web -> Android は `JavascriptInterface`
- Android -> Web は `evaluateJavascript`
- 永続化は `SharedPreferences`

## 推奨モジュール構成
- `app`
  - 単一モジュールで開始する
  - Phase 1 から Phase 3 の間は feature 分割しない
  - パッケージ単位で責務分離する

## 推奨パッケージ構成
```text
app/src/main/java/com/example/trainnotifier/
  MainActivity.kt
  webview/
    AndroidBridge.kt
    BridgeMessageRouter.kt
    WebViewEventDispatcher.kt
  data/
    AppPreferencesRepository.kt
    BridgeModels.kt
  location/
    LocationTrackingService.kt
    LocationRepository.kt
    StationProximityEvaluator.kt
  notification/
    DropoffNotificationManager.kt
    NotificationHistoryStore.kt
  permissions/
    PermissionCoordinator.kt
  model/
    HomeStation.kt
    DropoffTarget.kt
    NearbyStation.kt
    PermissionState.kt
    NotificationHistoryItem.kt
```

## クラス責務

### `MainActivity.kt`
- WebView 初期化
- `AndroidBridge` の登録
- 初回ロード URL の決定
- 通知権限と位置情報権限の要求開始
- Android -> Web の初期同期トリガー

### `webview/AndroidBridge.kt`
- `@JavascriptInterface fun postMessage(rawMessage: String)` を公開
- 受信した JSON を `BridgeMessageRouter` へ渡す
- UI スレッドでの WebView 呼び出しが必要な場合の入口を担う

### `webview/BridgeMessageRouter.kt`
- `type` ごとに処理を分岐する
- `homeStation.set`
- `homeStation.clear`
- `dropoffTarget.set`
- `dropoffTarget.clear`
- `permissions.get`
- `nearbyStations.get`
- `notification.test`

### `webview/WebViewEventDispatcher.kt`
- `evaluateJavascript` で Web へイベントを返す
- `bridge.response` の返却
- `homeStation.state` / `dropoffTarget.state` の同期
- `dropoffTarget.notified` の通知
- `bridge.error` の返却

### `data/AppPreferencesRepository.kt`
- `SharedPreferences` の読込・保存
- `homeStation` 保存
- `dropoffTarget` 保存
- 権限キャッシュ保存
- 最終位置保存
- 通知履歴保存

### `data/BridgeModels.kt`
- ブリッジ JSON を Kotlin で扱うための DTO 定義
- 最初は `kotlinx.serialization` を使わず、必要最小限の data class に留めてもよい

### `location/LocationTrackingService.kt`
- Foreground Service 本体
- `FusedLocationProviderClient` で位置更新購読
- 位置取得後に `StationProximityEvaluator` を実行
- 必要時に `DropoffNotificationManager` を呼ぶ

### `location/LocationRepository.kt`
- 直近位置の保持と取得
- 位置データを `AppPreferencesRepository` へ保存
- Service と Activity の両方から同じ形で参照する

### `location/StationProximityEvaluator.kt`
- 降車駅接近判定ロジック
- 距離判定
- 予想到着時間判定
- 通知済みフラグ判定

### `notification/DropoffNotificationManager.kt`
- NotificationChannel 作成
- 接近通知送信
- テスト通知送信
- 通知タップ時の `MainActivity` 復帰 Intent を作成

### `notification/NotificationHistoryStore.kt`
- 通知履歴の追加
- 最大 20 件の維持
- WebView へ返す履歴形式への整形

### `permissions/PermissionCoordinator.kt`
- 通知権限の確認
- 前景位置情報権限の確認
- 背景位置情報権限の確認
- 必要な権限要求の順序制御

## 最低限必要な Android リソース
```text
app/src/main/
  AndroidManifest.xml
  res/
    drawable/
      ic_notification.xml
    mipmap-anydpi-v26/
      ic_launcher.xml
    values/
      strings.xml
      colors.xml
```

## `AndroidManifest.xml` の初期要件
- `INTERNET`
- `ACCESS_COARSE_LOCATION`
- `ACCESS_FINE_LOCATION`
- `ACCESS_BACKGROUND_LOCATION`
- `POST_NOTIFICATIONS`
- `FOREGROUND_SERVICE`
- `FOREGROUND_SERVICE_LOCATION`
- `RECEIVE_BOOT_COMPLETED`
- `WAKE_LOCK`
- `VIBRATE`
- `LocationTrackingService` の service 宣言

## 依存関係の初期方針
- AndroidX WebKit
- Play Services Location
- Core KTX
- AppCompat
- Material Components
- Firebase Messaging は Phase 4 で追加

## 初期実装の順序
1. `MainActivity` で WebView を表示する
2. `AndroidBridge` と `WebViewEventDispatcher` を接続する
3. `AppPreferencesRepository` で `homeStation` / `dropoffTarget` を保存する
4. `permissions.get` と `notification.test` を通す
5. `LocationTrackingService` を追加する
6. `StationProximityEvaluator` で接近判定を移植する
7. `DropoffNotificationManager` で本通知を出す

## Phase 1 完了条件
- WebView が起動する
- Web から `homeStation.set` を送って Android 側へ保存できる
- Android から `bridge.response` を返せる
- テスト通知が Android 端末で表示される

## 実装時の注意
- WebView の `addJavascriptInterface` は信頼できる配信元だけに使う
- 公開 URL を使う場合はドメイン固定と HTTPS を前提にする
- `evaluateJavascript` は UI スレッドで呼ぶ
- Service 起動前に権限状態を必ず確認する
- 通知発火は重複防止を先に入れる
