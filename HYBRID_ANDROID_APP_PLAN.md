# Hybrid Android App Plan

## 目的
- 既存のWeb UI資産を活かしつつ、Androidアプリとして安定した通知・位置情報機能を実現する
- `WebView + ネイティブ位置監視 + ネイティブ通知 + 必要に応じてFCM` を前提とする

## 結論
- UI は WebView で既存Webアプリを表示する
- 位置監視と降車駅通知は Android ネイティブ側で行う
- FCM はサーバー主導通知用に限定し、降車駅接近通知の本体には使わない

## この構成を採る理由
- 既存Web画面を大きく作り直さずに済む
- Android の通知・位置情報・バックグラウンド動作はネイティブの方が安定する
- 降車駅通知は端末側ロジックで即時判定でき、サーバー依存を減らせる

## 責務分担

### WebView 側
- HOME駅設定UI
- 路線一覧 / 駅一覧 UI
- 降車駅の選択UI
- 時刻表表示UI
- ユーザー操作イベントの送信

### Android ネイティブ側
- WebView のホスト
- 位置情報権限管理
- バックグラウンド位置監視
- 降車駅接近判定
- ローカル通知の送信
- FCM 受信
- WebView への状態返却

## 共有するデータ

### WebView -> Android
- `homeStation`
- `dropoffTarget`
- `notifyBeforeMinutes`
- `targetDistance`

### Android -> WebView
- 通知権限状態
- 位置情報権限状態
- 最寄駅候補
- 降車駅通知の発火履歴

## Android 側の保存方式

### 採用方針
- Phase 1 から Phase 3 は `SharedPreferences` を採用する
- `Room` は現時点では採用しない

### SharedPreferences を選ぶ理由
- 保存対象が少量の設定データで、参照パターンも単純
- `homeStation` と `dropoffTarget` は単一レコードで十分
- WebView ブリッジから受け取った JSON をそのまま文字列保存しやすい
- Foreground Service から即時参照しやすく、初期実装のコストが低い

### SharedPreferences に保存する項目
- `homeStation`
- `dropoffTarget`
- `permissionCache`
- `lastKnownLocation`
- `notificationHistory`

### 保存データの扱い
- `homeStation` は駅オブジェクト JSON を 1 件保存する
- `dropoffTarget` は通知設定込みの JSON を 1 件保存する
- `permissionCache` は通知権限と位置情報権限の最終状態を保持する
- `lastKnownLocation` は直近の緯度経度、速度、取得時刻を保持する
- `notificationHistory` は直近 20 件までの JSON 配列を保持する

### Room を見送る理由
- 履歴件数が少なく、検索や集計要件がまだない
- テーブル定義や migration の運用コストが先行する
- 現段階では通知発火確認用の軽量ログで十分

### Room へ切り替える条件
- 通知履歴を 100 件以上保持したくなった場合
- 駅別・日別の履歴検索や集計が必要になった場合
- オフラインで大量の駅データや行動ログを永続化する必要が出た場合

## 既存プロジェクトとの対応

### 既存Web/Expoで既にある概念
- `homeStation`
- `dropoffTarget`
- `notifyBeforeMinutes = 3`
- `targetDistance`
- 最寄駅候補

### 既存コード上の参照箇所
- 降車駅ロジック: `src/hooks/useDropoffNotifier.ts`
- HOME駅保存: `src/services/storageService.ts`
- HOME駅UI: `app/(tabs)/settings.tsx`
- 降車駅UI: `app/(tabs)/index.tsx`, `src/components/Stations/StationDetailModal.tsx`

## Android Studio 側で必要な実装

### 1. WebView ホスト画面
- Kotlin の `MainActivity` に WebView を配置
- 公開Webアプリまたはローカル配信URLを読み込む
- JavaScript 有効化
- `JavascriptInterface` を一次採用し、Android -> Web は `evaluateJavascript` で返す

### 2. WebView ブリッジ
- Web 側から `homeStation` と `dropoffTarget` をネイティブへ送る
- ネイティブ側から権限状態や最寄駅候補を Web へ返す
- 保存先は `SharedPreferences` とし、受信後すぐ永続化する
- Kotlin 実装では `@JavascriptInterface` 付きの `AndroidBridge` クラスを用意する
- 受信 JSON の解析は `JSONObject` または `kotlinx.serialization` のどちらか一方に統一する

### Kotlin 前提のブリッジ実装方針
- Web -> Android は `window.AndroidBridge.postMessage(jsonString)` を基本形にする
- Android -> Web は `webView.evaluateJavascript("window.dispatchEvent(...)")` で返却する
- ブリッジの入口は 1 メソッドに集約し、`type` で Kotlin 側ハンドラへ振り分ける
- `postMessage` を一次採用しない理由は、WebView 実装差異よりも Kotlin 側の実装単純性を優先するため

### 最小クラス構成
- `MainActivity`: WebView 初期化、権限要求、ブリッジ登録
- `AndroidBridge`: Web からの JSON メッセージ受信
- `BridgeMessageRouter`: `type` ごとの処理振り分け
- `AppPreferencesRepository`: `SharedPreferences` への保存と読込
- `LocationTrackingService`: Foreground Service による位置監視
- `DropoffNotificationManager`: 通知チャネル作成とローカル通知送信

### 3. 位置情報監視
- Foreground Service を使用
- FusedLocationProviderClient を使用
- 一定間隔で現在地取得
- バックグラウンドでも継続

### 4. 降車駅接近判定
- 既存の判定式を Android 側へ移植する
- 判定式:
  - 距離が `targetDistance` 以下
  - 予想到着時間が `notifyBeforeMinutes` 以下
- 通知済みフラグを保持し、重複送信を防ぐ

### 5. ローカル通知
- NotificationChannel を作成
- 降車駅接近時にローカル通知を発火
- 通知タップで WebView アプリを前面表示

### 6. FCM
- 運行情報やお知らせ通知用に限定
- 降車駅接近通知の主経路には使わない

## 実装順

### Phase 1
- Android Studio プロジェクト作成
- WebView で既存Webを表示
- WebView <-> Android ブリッジ作成

### Phase 2
- HOME駅 / 降車駅を Web からネイティブへ保存
- Android 側で `SharedPreferences` に保存

### Phase 3
- Foreground Service で位置監視
- 降車駅接近判定をネイティブで実装
- ローカル通知を実装

### Phase 4
- FCM 導入
- お知らせ通知 / 運行情報通知を追加

## 通知の使い分け

### ローカル通知
- 降車駅接近通知
- 端末位置起点の通知

### FCM
- サーバーからの一斉通知
- 運行障害情報
- メンテナンス情報

## 非推奨
- `WebView + FCM だけ` で降車駅通知を実現しようとすること
- 理由:
  - バックグラウンド位置監視が弱い
  - サーバー依存が強くなる
  - 即時判定しにくい

## 成功条件
- WebView 上で既存 UI が表示される
- HOME駅 / 降車駅がネイティブへ保存される
- Android バックグラウンド中でも降車駅接近通知が出る
- 通知タップでアプリに戻れる

## 次の実装対象
- Android Studio プロジェクト雛形
- WebView ブリッジのイベント仕様
- 降車駅データの JSON スキーマ定義
