# Android AAB 作成手順

## 目的
- Google Play Console の内部テストまたは公開用に Android App Bundle (`.aab`) を作成する

## 前提
- Android Studio でアプリが起動確認済み
- `MainActivity.kt` は統合版に更新済み
- `AndroidManifest.xml` と `build.gradle.kts` は必要項目を反映済み

## 1. versionCode / versionName を確認
- `app/build.gradle.kts` の `defaultConfig` を確認する
- 例:
```kotlin
versionCode = 1
versionName = "1.0"
```

更新ルールの例
- 内部テストを出すたびに `versionCode` を +1
- `versionName` は `1.0.0`, `1.0.1` のように管理

## 2. 署名キーを作成
Android Studio で以下を実行する。
- `Build`
- `Generate Signed Bundle / APK`
- `Android App Bundle`
- `Create new...`

決める項目
- Key store path
- Key alias
- Password
- Validity
- Name / Organization

重要
- keystore は紛失すると更新配布に支障が出る
- 安全な場所へ保管する

## 3. AAB を作成
- `Build`
- `Generate Signed Bundle / APK`
- `Android App Bundle`
- 作成した keystore を指定
- `release` を選択
- `Create`

## 4. 出力先
標準的な出力先:
```text
app/release/app-release.aab
```
または
```text
app/build/outputs/bundle/release/app-release.aab
```

## 5. 作成後の確認
- ファイルサイズ
- versionCode / versionName
- 実機で前回版と区別できるか

## 6. Google Play Console へアップロード
- Play Console
- 対象アプリ
- `内部テスト` または `クローズドテスト`
- `新しいリリースを作成`
- `app-release.aab` をアップロード

## 7. アップロード時に確認すること
- 権限一覧
- 対応端末
- データセーフティ
- ストア掲載情報

## 8. 推奨運用
- まず内部テストに配布
- 通知、位置情報、到着駅同期の確認
- 問題がなければクローズドテスト
- その後に本番公開
