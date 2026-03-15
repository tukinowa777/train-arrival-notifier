# 到着駅教える君β ソフトウェア仕様書

## 1. このアプリは何をするものか
- 電車で移動中に「降りる駅」を設定し、その駅に近づいたら通知で知らせるアプリです。
- `HOME駅` の設定、`到着駅` の設定、駅検索、時刻表確認を 1 つのアプリ内で扱います。
- Web 版としても利用できますが、通知と位置情報の安定性を重視して Android アプリ化を進めています。

## 2. 画面の構成

### HOME駅
- 自宅やよく使う駅を `HOME駅` として設定します。
- 駅名検索で設定できます。
- GPS を使って最寄駅候補を表示し、その中から設定することもできます。
- Android 版では、通知権限や位置情報権限、Android 側の同期状態もこの画面で確認します。

### 到着駅
- 路線一覧から駅を選ぶか、駅名検索で `到着駅` を設定します。
- 設定した駅に近づくと通知対象になります。
- 路線はタイル表示で一覧化され、選んだ路線の駅が表示されます。

### 時刻表
- 駅ごとの時刻表を表示します。
- 運行日や方向の切り替えができます。
- 路線によっては各駅停車以外の種別も表示します。

### テスト
- 開発・確認用の画面です。
- 通知や同期などのデバッグ用途に使います。

## 3. 利用している主要ソフトウェア

### フロントエンド
- React 19.2.0
- React Native 0.83.2
- Expo 55.0.4
- Expo Router 55.0.3
- React Native Web 0.21.0

### 地図・位置情報・通知
- react-native-maps 1.26.20
- expo-location 55.1.2
- expo-notifications 55.0.10
- expo-task-manager 55.0.9
- @react-native-async-storage/async-storage 2.2.0

### UI 補助
- @expo/vector-icons 15.1.1
- expo-status-bar 55.0.4

### 開発言語と型管理
- TypeScript 5.9.2
- @types/react 19.2.2

## 4. Android アプリとしての構成

### 基本方針
- 既存の Web UI を WebView で表示します。
- 通知、位置情報、接近判定は Android ネイティブ側で処理します。
- つまり、見た目は Web 技術、通知と位置監視は Android 技術を使うハイブリッド構成です。

### Android 側で使う技術
- Android Studio
- Kotlin
- WebView
- JavascriptInterface
- SharedPreferences
- FusedLocationProviderClient
- NotificationChannel / ローカル通知

## 5. Web と Android の役割分担

### Web 側の役割
- HOME駅設定 UI
- 到着駅選択 UI
- 路線一覧・駅一覧 UI
- 時刻表表示 UI
- Android 側へのイベント送信

### Android 側の役割
- WebView のホスト
- 通知権限と位置情報権限の管理
- 位置情報の取得
- 到着駅への接近判定
- ローカル通知の送信
- Web 側への状態返却

## 6. データの持ち方

### Web 側ストレージ
- AsyncStorage を使います。
- 以下の情報を保持します。
  - お気に入り駅
  - HOME駅
  - 到着駅
  - 通知設定
  - アラート設定
  - 検索履歴
  - 最終位置

### Android 側ストレージ
- SharedPreferences を使います。
- 現時点では以下を保存対象にしています。
  - `homeStation`
  - `dropoffTarget`
  - 権限状態
  - 最終位置
  - 通知履歴

## 7. 通知の仕組み

### Web 側の通知
- Expo Notifications を使います。
- Web 環境ではブラウザや OS の制約が大きく、安定性に限界があります。

### Android 側の通知
- Android のローカル通知を使います。
- Android ネイティブ通知の方が安定しているため、到着駅通知の本命はこちらです。

### 通知タイミング
- 到着駅までの距離
- 現在の移動速度
- 到着予測時間

これらを使って「到着 3 分前目安」で通知します。

## 8. 位置情報の使い方

### 利用目的
- 最寄駅候補の表示
- 到着駅までの距離計算
- 接近通知の発火

### 既定値
- 通知目安: 3 分前
- 判定距離: 1500m
- 速度が取れない場合の既定速度: 8.33 m/s

## 9. 通信仕様

### Web -> Android
- `window.AndroidBridge.postMessage(...)` を使います。
- 主なイベント:
  - `homeStation.set`
  - `homeStation.clear`
  - `dropoffTarget.set`
  - `dropoffTarget.clear`
  - `notification.test`
  - `permissions.get`

### Android -> Web
- `webView.evaluateJavascript(...)` で `window.handleAndroidBridgeMessage(...)` を呼びます。
- 主なイベント:
  - `permissions.state`
  - `notification.test.sent`
  - `homeStation.state`
  - `dropoffTarget.state`
  - `dropoffTarget.notified`

## 10. 現在の配信構成

### 公開 URL
- `https://161.33.151.114`

### Ubuntu サーバー側
- nginx が HTTPS 終端を担当します。
- nginx の上流は `127.0.0.1:8081` です。
- `127.0.0.1:8081` では静的 Web 配信を常駐させています。

### 静的配信の起動方式
- `npx expo export --platform web`
- `python3 -m http.server 8081 --directory dist`

補助スクリプト:
- `scripts/start_web_static.sh`
- `scripts/stop_web_static.sh`

## 11. 開発環境

### Ubuntu 側
- Web アプリ本体の開発
- ドキュメント管理
- Git 管理
- 静的書き出しと公開反映

### Windows 11 側
- Android Studio
- Kotlin 実装
- WebView アプリの動作確認
- APK / AAB の作成

## 12. Android リリース方針

### 現在の段階
- まずは少人数向けの限定テスト
- `debug APK` 配布で確認
- その後、Google Play 内部テストへ進む

### その後の流れ
1. Google Play Console 承認
2. 内部テストトラックへ AAB 配布
3. クローズドテスト
4. 本番公開

## 13. 現時点の制約
- Android Studio 側のファイルはこの Ubuntu 環境から直接編集できません。
- WebView 上の HTTPS 証明書処理は開発用の回避を含みます。
- バックグラウンド位置監視は今後さらに強化予定です。
- TypeScript 全体の型エラーはまだ残っており、Web 側の完全な型整理は継続課題です。

## 14. 関連ドキュメント
- `APP_OVERVIEW_NONTECH_JA.md`
- `GOOGLE_PLAY_TEXT_TEMPLATE_JA.md`
- `PRIVACY_POLICY_JA.md`
- `AAB_RELEASE_STEPS_JA.md`
- `HYBRID_ANDROID_APP_PLAN.md`
- `WEBVIEW_BRIDGE_SPEC.md`
- `ANDROID_MAIN_ACTIVITY_INTEGRATED.md`
- `ANDROID_LOCATION_NOTIFY_IMPL.md`
- `ANDROID_LIMITED_TEST_RELEASE_GUIDE.md`
- `GOOGLE_PLAY_RELEASE_PREP.md`
