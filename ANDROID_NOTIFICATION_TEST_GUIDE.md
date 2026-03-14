# Android Notification Test Guide

## 目的
- Androidアプリとして本プロジェクトを実機検証し、降車駅通知が動作するか確認する

## 前提
- Node.js と npm が利用可能
- Android 実機がある
- 実機で開発者向けオプションと USB デバッグを有効化済み
- Expo / React Native の基本実行環境がある

## 注意
- Webブラウザ確認ではなく、Androidアプリとして検証する
- Expo Go では通知やバックグラウンド位置情報の挙動が本番と異なることがある
- 可能なら development build か release build で確認する

## 手順 1: 依存関係確認
```bash
npm install
```

## 手順 2: Android SDK / adb 確認
```bash
adb devices
npx expo --help
```

- `adb` が使えること
- `npx expo run:android` が利用可能なこと

## 手順 3: Android 実機接続確認
```bash
adb devices
```

- 実機が `device` として表示されること

## 手順 4: ネイティブプロジェクトを生成
```bash
npx expo prebuild --platform android
```

- `android/` ディレクトリが生成される
- `app.json` の通知・位置情報設定が Android ネイティブ設定へ反映される

## 手順 5: development build を実機へインストール
```bash
npx expo run:android
```

- 初回は Android ネイティブビルドが走るため時間がかかる
- 実機でアプリが起動すること

## 手順 6: Metro サーバー起動
```bash
npx expo start --dev-client
```

- development build から JS バンドルを読み込むために使用する

## 手順 7: 実機で権限を許可
- 通知権限を許可
- 位置情報権限を許可
- バックグラウンド位置情報を許可
- バッテリー最適化の対象外に設定できる場合は除外

## 手順 8: アプリ内設定
- `HOME駅` タブで HOME駅 を設定
- `路線` または `駅一覧` から任意の駅を開く
- `この駅で降りる` を押して降車駅を設定

## 手順 9: 通知確認
- 実機の現在地を変更するか、実際に移動する
- 降車駅への接近時に通知が出るか確認する
- 現在実装は「到着3分前目安」の判定

## 手順 10: 失敗時の確認項目
- Android の通知設定でアプリ通知が無効になっていないか
- Android の位置情報権限が「常に許可」相当になっているか
- バッテリー最適化でアプリが停止されていないか
- 開発用ビルドではなく Expo Go で試していないか

## 補足: 現状のビルド方針
- このリポジトリには現時点で `eas.json` がない
- そのため、まずは `expo prebuild` + `expo run:android` のローカル development build を前提とする
- 将来的に配布用ビルドが必要になったら EAS Build を追加する

## 推奨確認端末
- Android 13 以上
- Chrome 最新
- 通知権限ダイアログが表示される端末

## 補足
- 本プロジェクトは `expo-notifications` と `expo-location` を使っている
- `app.json` に Android 通知・位置情報権限を設定済み
