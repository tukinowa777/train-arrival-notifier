# 開発者向け運用メモ

## このプロジェクトの基本方針
- アプリ本体は Expo managed 構成として扱う
- 主な編集対象は `app/`, `src/`, `app.json`, `eas.json`
- Android エミュレータ確認は `npx expo start --android`
- Google Play 配布用 AAB は `EAS Build` で作る

## 触る場所
- 画面・導線: `app/`
- 状態管理・サービス: `src/`
- Expo 設定: `app.json`
- EAS 設定: `eas.json`

## 触らない方がよいもの
- 配布用 AAB 作成時に `android/` をビルド入力へ混ぜない
- `android/` が残っていると、EAS が native Android project と判定して Expo 側設定を無視することがある

## Android テストの流れ
1. Windows 側で最新コードを `git pull`
2. `npx expo start --android` でエミュレータ確認
3. Play Console 用ビルドが必要なら、`android/` を除いたビルド用コピーを作る
4. そのコピー先で `npm install`
5. `npx eas-cli build -p android --profile production`

## AAB 作成時の注意
- AAB はソースコードではなく、Google Play へ提出する配布物
- 修正開発は Git のソースコード一式で行う
- AAB 作成手順の詳細は `AAB_RELEASE_STEPS_JA.md` を参照

## 今回の学び
- Expo managed で開発していても、Windows 側に `android/` があるだけで EAS Build の挙動が変わる
- `app.json` の `expo.android.package` が無視されるログが出たら、native project 扱いになっていると考える
- その場合は `android/` を含まないビルド用コピーで EAS Build を実行する
