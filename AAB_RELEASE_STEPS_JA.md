# Android AAB 作成手順

## 目的
- Google Play Console の内部テストまたは公開用に Android App Bundle (`.aab`) を作成する

## 前提
- Expo アプリ本体の最新コードが取得済み
- Windows 側で `git pull` 済み
- Expo アカウントへログイン済み
- `app.json` に `expo.android.package` が設定済み
- `eas.json` が存在する

## 重要な方針
- このプロジェクトの AAB 作成は、原則として Android Studio の `Generate Signed Bundle / APK` ではなく `EAS Build` を使う
- 理由: 今回のアプリ本体は `app/` / `src/` / `app.json` を中心とした Expo managed 構成だから
- Windows 側に `android/` ディレクトリが残っていると、EAS が native Android project と判定し、Expo 側設定を無視することがある
- そのため、AAB 作成時は `android/` を含まないビルド用コピーを作ることを推奨する

## 1. Windows 側で最新コードを取得
```powershell
cd C:\work\train-arrival-notifier
git checkout feature/station-flow-tuning
git pull origin feature/station-flow-tuning
```

## 2. ビルド用コピーを作る
元の作業ディレクトリに `android/` がある場合は、そのまま EAS Build を実行しない。

```powershell
robocopy C:\work\train-arrival-notifier C:\work\train-arrival-notifier-build /E /XD android android.local-backup ios ios.local-backup node_modules .git dist docs .expo .idea
```

## 3. ビルド用コピーで依存関係を入れる
```powershell
cd C:\work\train-arrival-notifier-build
npm install
```

## 4. Expo / EAS にログイン
```powershell
npx expo login
```

## 5. AAB を作成
```powershell
npx eas-cli build -p android --profile production
```

補足
- `production` プロファイルでは `app-bundle` を使う
- 署名は通常 `Expo server` 側の Android credentials を使う
- 成功すると Expo の build ページに `.aab` のダウンロード URL が表示される

## 6. 作成後の確認
- Build ページで `.aab` が生成されていること
- package 名が想定通りであること
- 内部テストへ上げるリリースノートを用意する

## 7. Google Play Console へアップロード
- Play Console
- 対象アプリ
- `内部テスト` または `クローズドテスト`
- `新しいリリースを作成`
- 生成された `.aab` をアップロード

## 8. アップロード時に確認すること
- 権限一覧
- 対応端末
- データセーフティ
- ストア掲載情報

## 9. 推奨運用
- まず内部テストに配布
- 通知、位置情報、到着駅同期の確認
- 問題がなければクローズドテスト
- その後に本番公開

## Android Studio から直接 AAB を作らない理由
- 今回のアプリ本体は Expo managed 側が正本
- `android/` が混在すると EAS / Expo の設定と native Android 設定が競合しやすい
- 実際に `android/` が存在した状態では `expo.android.package` が無視され、Gradle build が失敗した
- そのため、少人数テスト配布用の AAB は `EAS Build` を標準手順とする
