# Android Limited Test Release Guide

## 目的
- 少人数のテスターへ Android アプリを配布する手順を固定する
- 現在の WebView + AndroidBridge + 接近通知の実装を、端末実機で反復検証できるようにする

## 配布方針
- まずは `debug APK` で少人数へ直接配布する
- 動作が安定したら `release APK` もしくは Google Play 内部テストへ移行する

## 現段階での前提
- Android Studio 側には `ANDROID_MAIN_ACTIVITY_INTEGRATED.md` の `MainActivity.kt` を反映済み
- `AndroidManifest.xml` に通知・位置情報権限を追加済み
- `build.gradle` に `play-services-location` を追加済み
- WebView は `https://161.33.151.114` を表示する

## 最短の少人数テスト手順

### 1. Android Studio で debug APK を作る
- `Build`
- `Build Bundle(s) / APK(s)`
- `Build APK(s)`

出力先の標準例:
```text
app/build/outputs/apk/debug/app-debug.apk
```

### 2. テスターへ配布する
- Google Drive
- OneDrive
- 社内共有ストレージ
- 直接 USB 転送

## テスターに伝える内容

### インストール前提
- Android 端末で「不明なアプリのインストール」を許可する
- 通知を許可する
- 位置情報を許可する

### テスト手順
1. アプリを起動する
2. `HOME駅` を設定する
3. `到着駅` を設定する
4. `HOME駅` 画面で `Android状態を取得` を押す
5. 以下が表示されることを確認する
   - `Android HOME駅`
   - `Android 到着駅`
   - `Android通知権限`
   - `Android位置権限`
6. `通知テストを送信` を押す
7. Android 通知が出ることを確認する
8. 到着駅へ近づいたときに通知が出るか確認する

## テスターから回収する観点
- 端末機種
- Android バージョン
- HOME駅 設定の成否
- 到着駅 設定の成否
- 通知テストの成否
- 接近通知の成否
- `HOME駅` 画面に表示された `最終Androidイベント`
- `最終到着駅通知`
- 不具合発生時のスクリーンショット

## 実務上の注意
- `debug APK` はインストールが容易だが、配布のたびに再インストールが必要になりやすい
- 端末によってはバッテリー最適化で位置監視が止まる
- `handler?.proceed()` を使っているため、証明書周りは開発用挙動である

## 次段階

### release APK へ進む条件
- 主要端末で通知テストが安定する
- `Android HOME駅` / `Android 到着駅` の同期が崩れない
- 接近通知の誤発火が少ない

### release APK の作業
- Android Studio で署名付き APK を作る
- テスト用 keystore を管理する
- バージョンコードとバージョン名を付与する

### 内部テストへ進む条件
- テスター数が増える
- 更新配布を繰り返す必要がある
- 端末ごとの差分検証を継続する

## 推奨ログ取得
- Android Studio の `Logcat`
- フィルタ文字列:
  - `TrainAppBridge`
  - `TrainAppWebView`
  - `TrainAppLocation`

## 現時点の結論
- いまは `debug APK` の直接配布が最も現実的
- 限定テストで WebView 表示、駅同期、通知テスト、接近通知を確認する
- 安定したら release 化または内部テスト配布へ移る
