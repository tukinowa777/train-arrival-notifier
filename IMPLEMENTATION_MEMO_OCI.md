# 🚀 Train Arrival Notifier - OCI開発引き継ぎメモ

**作成日**: 2026年3月5日
**対象**: OCI Ubuntu Claude Code 開発環境
**現在のフェーズ**: Phase 3.5完了、デプロイ準備完了

## 📋 開発進捗状況

### ✅ 完了済みフェーズ

#### Phase 1: 基本機能実装 ✅
- 駅データ管理（44駅の山手線・中央線等）
- 地図表示（React Native Maps + Web fallback）
- 駅検索・フィルタリング機能
- お気に入り駅管理
- 時刻表表示機能
- タブナビゲーション

#### Phase 2: 通知・アラート機能 ✅
- 位置情報サービス
- プッシュ通知設定
- アラート管理システム
- バックグラウンドタスク

#### Phase 3.5: パフォーマンス最適化 ✅
- **重要**: 駅マーカー表示数制限（15-25駅）
- React.memo、useMemo、useCallback活用
- 地図ズームレベルに応じた動的フィルタリング
- Web環境での動作安定化

### 🔧 修正済みの重要問題

#### 1. WebMapFallback お気に入り機能修正
**問題**: Web版でお気に入りボタンが動作しない
**修正箇所**:
- `src/components/Map/WebMapFallback.tsx`: handleToggleFavorite関数追加
- 詳細デバッグログ追加
- UI強制更新機能追加

#### 2. 無限ループエラー修正
**問題**: useStorage.tsでMaximum update depth exceeded
**修正箇所**:
- `src/hooks/useStorage.ts`: useEffect依存配列最適化
- loadAllDataとhandleAppStateChangeを依存配列から除去

#### 3. React Native Maps Web対応
**問題**: Web環境でcodegenNativeComponent is not a function
**修正箇所**:
- `src/components/Map/MapView.tsx`: 条件付きインポート実装

## 🏗️ ディレクトリ構造

```
train-arrival-notifier/
├── src/
│   ├── components/
│   │   ├── Map/
│   │   │   ├── MapView.tsx           # ★パフォーマンス最適化済み
│   │   │   ├── StationMarker.tsx     # ★React.memo適用済み
│   │   │   └── WebMapFallback.tsx    # ★お気に入り機能修正済み
│   │   ├── Station/
│   │   ├── Settings/
│   │   └── Navigation/
│   ├── hooks/
│   │   ├── useStorage.ts             # ★無限ループ修正済み
│   │   ├── useLocation.ts            # ★Web対応強化済み
│   │   └── useNotifications.ts
│   ├── services/
│   │   ├── storageService.ts         # ★お気に入り機能強化済み
│   │   ├── locationService.ts        # ★Web環境対応済み
│   │   └── notificationService.ts
│   ├── constants/
│   │   ├── stations.ts               # 44駅データ
│   │   └── schedules.ts              # 時刻表データ
│   └── types/
├── app/                              # Expo Router画面定義
├── assets/                           # 画像・フォントリソース
├── dist/                            # ★Web版ビルド結果
├── deploy-to-oci-https.sh           # ★HTTPS対応デプロイスクリプト
├── nginx-https.conf                 # ★HTTPS対応Nginx設定
├── train-notifier-web.tar.gz        # ★デプロイ用アーカイブ
└── package.json                     # Expo SDK 55.0.4
```

## 🔑 重要なファイルと変更点

### MapView.tsx（パフォーマンス最適化の核心）
```typescript
const PERFORMANCE_SETTINGS = {
  MAX_STATIONS_ZOOMED_OUT: 15,
  MAX_STATIONS_ZOOMED_IN: 25,
  ZOOM_THRESHOLD: 0.05,
  FAVORITE_PRIORITY: true,
};

// visibleStationsでスマートフィルタリング実装
const visibleStations = useMemo(() => {
  // ズームレベル、お気に入り、距離によるフィルタリング
}, [region, favoriteStations]);
```

### WebMapFallback.tsx（お気に入り機能修正）
```typescript
const handleToggleFavorite = useCallback(async (station: Station, event: any) => {
  // イベント伝播防止
  event.stopPropagation();

  // ストレージアクション実行
  await storageActions.toggleFavorite(station);

  // UI強制更新
  setRefreshKey(Date.now());
}, [storageActions, storageState.favoriteStations]);
```

### useStorage.ts（無限ループ修正）
```typescript
useEffect(() => {
  // 依存配列からloadAllDataとhandleAppStateChangeを除去
}, [opts.autoLoad]); // ここが重要な修正点
```

## 🌐 デプロイ状況

### 現在のOCI設定
- **サーバーIP**: 161.33.151.114
- **OS**: Ubuntu
- **既存ファイル**:
  - ~/deploy-to-oci-https.sh（HTTPS対応版）
  - ~/nginx-https.conf（HTTPS設定）
  - ~/train-notifier-web.tar.gz（修正済みWebアプリ）

### デプロイコマンド
```bash
# OCI Ubuntu側で実行
cd ~/
chmod +x deploy-to-oci-https.sh
./deploy-to-oci-https.sh
```

## 🔄 OCI開発環境セットアップ手順

### 1. プロジェクトディレクトリ確認
```bash
cd /home/ubuntu/projects/train-arrival-notifier
```

### 2. 最新コードの同期が必要
**重要**: ローカルで修正したコードがOCI側に反映されていません。

**オプション A: Gitリポジトリ使用（推奨）**
```bash
# ローカル側でGitリポジトリ初期化・プッシュ
cd C:\Users\sugiyama\CCTEST\train-arrival-notifier
git init
git add .
git commit -m "Phase 3.5 completed: Performance optimization and bug fixes"

# GitHub/GitLabにプッシュ後、OCI側でクローン
git clone [repository-url] /home/ubuntu/projects/train-arrival-notifier-latest
```

**オプション B: ファイル直接転送**
```bash
# ローカルから必要なソースファイルを転送
scp -r src/ ubuntu@161.33.151.114:/home/ubuntu/projects/train-arrival-notifier/
scp package.json app.json tsconfig.json ubuntu@161.33.151.114:/home/ubuntu/projects/train-arrival-notifier/
```

### 3. 依存関係インストール
```bash
cd /home/ubuntu/projects/train-arrival-notifier
npm install
```

### 4. 開発サーバー起動
```bash
# Web開発用
npm run web

# または通常開発サーバー
npm start
```

## 🎯 次に取り組むべき作業

### 優先度 High
1. **OCI側コード同期**
   - ローカル修正をOCI側に反映
   - 修正済み機能の動作確認

2. **お気に入り機能の最終テスト**
   - HTTPS環境でのローカルストレージ動作確認
   - デバッグログの確認・削除

### 優先度 Medium
3. **Phase 4: 高度機能実装**
   - リアルタイム時刻表API連携
   - 遅延情報表示
   - ウィジェット機能

4. **UI/UX改善**
   - アニメーション追加
   - アクセシビリティ向上

### 優先度 Low
5. **本格運用準備**
   - ドメイン名設定
   - パフォーマンス監視
   - エラー追跡システム

## 🔍 デバッグ・テスト方法

### お気に入り機能テスト
1. HTTPS版アプリにアクセス: `https://161.33.151.114/`
2. ブラウザ開発者ツールのコンソールでログ確認
3. Local Storage確認: `@train_notifier:favorite_stations`

### パフォーマンステスト
1. 地図のズームイン・アウト動作
2. 駅マーカー数の制限確認（15-25駅）
3. スクロール・操作の滑らかさ

## 📚 参考ドキュメント

- `OCI-DEPLOY.md`: 詳細なデプロイ手順
- `実装メモ.txt`: 開発履歴
- `iPhone動作確認チェックリスト.md`: モバイルテスト項目

## ⚠️ 注意事項

1. **Node.js バージョン**: OCI側でNode.js >=20.19.4が必要
2. **ポート設定**: 開発サーバー用にポート8081, 8089等が必要
3. **SSL証明書**: Let's Encryptで自動取得設定済み
4. **デバッグログ**: 本番環境では削除推奨

---

**🚀 OCI側での開発継続準備完了！**
この実装メモを参考に、OCI Ubuntu環境でTrain Arrival Notifierの開発を継続してください。

## 📝 CODEX作業ログ
- 2026-03-09 CODEX: IMPLEMENTATION_MEMO_OCI.mdとOCI_SYNC_PLAN.mdを確認し、現在の開発フェーズ・未完了タスク・デプロイ状況を整理したプロジェクト状況レポートを作成。
- 2026-03-09 CODEX: WebMapFallback.tsxでお気に入り操作が共有ストレージと同期されるよう`useStorage`ベースの実装に戻し、`useFavoriteStations`依存を解消してUI側の星ボタンが確実に反映されるように更新。
- 2026-03-09 CODEX: `npm run web`の起動確認を実施。`8081/8089/18081`でポート競合判定が発生し、Expo CLIが`Use port null instead?`で非対話モード停止。`--port 0`でも`Skipping dev server`となり、この環境ではWebサーバー起動確認を完了できず（コード変更なし）。
- 2026-03-09 CODEX: サンドボックス外で`npm run web`を再実行し、Expo Web開発サーバーの起動を確認。Metroのバンドル完了、待受URLは`http://localhost:8081`。起動時にReact Native DevToolsの共有ライブラリエラー（`libatk-1.0.so.0`不足）が出るが、Webサーバー自体は継続動作。
- 2026-03-09 CODEX: `npx expo start --web --tunnel`へ切替。トンネル接続自体は成功したが、ExpoのWebページ公開URLは引き続き8081番ポート待受。`ss -ltnp`で`*:8081`待受を確認したため、OCIの公開IPを使う場合は `http://161.33.151.114:8081` でアクセス可能な構成。
- 2026-03-09 CODEX: Web版「全駅」一覧の視認性を改善。`WebMapFallback.tsx`の駅カードに境界線とシャドウ、一覧に間隔を追加し、背景から少し浮いて見えるデザインへ調整。
- 2026-03-09 CODEX: 公開URL確認を前提に「全駅」一覧の視認性を追加調整。駅一覧セクション全体へ淡い面・枠線・角丸を付与し、カードの影と境界も少し強めて、背景との差がより分かる見た目へ更新。
- 2026-03-09 CODEX: 駅カード自体の浮き感をさらに強化。カード背景をわずかに明るくし、青みの縁取り・影の深さ・ぼかし量・elevationを増やして、押下後に表示される駅項目がより明確に見えるよう調整。
- 2026-03-09 CODEX: 駅カードの配色を調整。一覧面の淡い青と差が出るようカード背景を暖かみのあるオフホワイトへ変更し、縁色もやや濃くして識別しやすくした。
- 2026-03-09 CODEX: 駅詳細ポップアップのお気に入り不具合を修正。`StationsList.tsx` の独自 `localStorage('favoriteStations')` 操作を廃止して `useStorage` に統一し、`StationDetailModal.tsx` でも表示時とトグル後に共有ストレージを再読み込みして、星アイコン色と件数が同期するよう更新。
- 2026-03-09 CODEX: `useStorage.ts` にWeb同一タブ向けの同期イベントを追加。お気に入り追加・削除時に `train_notifier_storage_updated` を発火し、他コンポーネント側の `useStorage` も `loadAllData()` で再同期するようにして、駅詳細ポップアップ・全駅一覧・お気に入り件数の表示ずれを解消する方向で補強。
- 2026-03-09 CODEX: 駅詳細ポップアップ内のお気に入りボタンの見た目を修正。お気に入り済み状態ではボタン背景・枠線・アイコン・文字色がオレンジ基調へ切り替わるようにして、押下後の色変化がポップアップ側でも明確に見えるよう更新。
- 2026-03-09 CODEX: 駅詳細ポップアップのお気に入りボタン表示にローカル状態を追加。押下直後にポップアップ内ボタンと見出し星が先に色変化し、その後 `useStorage` の再読み込み結果で確定するようにして、色反映の遅延・未反映を防ぐ構成へ調整。
- 2026-03-09 CODEX: 駅詳細ポップアップ内のお気に入りボタンを廃止し、「前後時刻表データを取得」ボタンへ置換。`stationService.ts` に前後列車取得ヘルパーを追加し、ポップアップから各路線・方向の直前/直後発車時刻を確認できるよう変更。
- 2026-03-09 CODEX: 駅一覧アイテムのアクションモーダル (`StationListItem.tsx`) に残っていたお気に入りボタンも撤去し、同じく「前後時刻表データを取得」へ差し替え。駅一覧から開くポップアップ経路でもお気に入り操作が出ない状態に統一。
- 2026-03-09 CODEX: 古いUIキャッシュ表示の可能性に対応し、Expo Web トンネルを再起動。現在の公開URLは `https://dsxjm6m-anonymous-8081.exp.direct/`。この時点のコード上では、駅一覧ポップアップ/駅詳細ポップアップともにお気に入りボタン文言は除去済みで、`前後時刻表データを取得` に統一。
- 2026-03-09 CODEX: 追加調査で、地図タブ側クイックアクション (`app/(tabs)/index.tsx`) にもお気に入りボタンが残っていたことを確認。ここも `toggleFavorite` 導線を廃止し、`前後時刻表` ボタンへ差し替えて、押下時は前後発車時刻データを表示するよう統一。
- 2026-03-09 CODEX: UI文言を整理。駅詳細ポップアップ、駅一覧ポップアップ、地図タブ側クイックアクションのボタン/アラート見出しを `時刻表データ取得` に統一。
- 2026-03-09 CODEX: アプリ目的に合わせて導線を再変更。`時刻表データ取得` ボタンを `この駅で降りる` に置換し、降車駅を `@train_notifier:dropoff_target` へ保存する仕組みを追加。`app/(tabs)/_layout.tsx` で共通監視フック `useDropoffNotifier` を動かし、現在地が設定駅の800m以内に入ったら駅接近通知を1回だけ送る構成へ変更。
- 2026-03-09 CODEX: 最寄り駅とは別にユーザー任意のホーム駅を持てるよう拡張。`@train_notifier:home_station` を追加し、設定タブで駅検索からホーム駅を設定/解除できるUIを実装。`npx tsc --noEmit` は既存の型エラー群により引き続き失敗するが、ホーム駅データ構造の簡易検証は実施。
- 2026-03-09 CODEX: ホーム駅機能を画面側へ展開。駅一覧 (`StationsList.tsx`) にホーム駅バナーとホーム駅アイコン表示を追加し、地図タブ (`app/(tabs)/index.tsx`) に現在設定中のホーム駅カードを常時表示するよう更新。
- 2026-03-09 CODEX: 成城学園前駅の時刻表取得不具合を調査。`schedules.ts` に駅別定義がない駅が多数あり、87駅中77駅で取得件数0だったため、未定義駅でも路線別代表ダイヤからフォールバック時刻表を自動生成する仕組みを追加。成城学園前を含む全87駅で `getAllNextTrains()` が0件にならないことを確認。
- 2026-03-09 CODEX: UI確認の事前チェックとして、起動中のExpo WebサーバーへHTTP疎通確認を実施。`127.0.0.1:8081` からHTMLレスポンス(HTTP 200)を確認し、Webアプリ配信自体は正常であることを確認。ただし、このCLI環境ではブラウザ操作までは行えないため、実画面での成城学園前駅操作確認はユーザー側ブラウザで継続が必要。
- 2026-03-09 CODEX: Web版の停止対策として `WebMapFallback.tsx` を `ScrollView + map` から `FlatList` ベースへ変更し、初期描画件数・バッチ描画件数を制限。位置情報監視もWeb一覧では常時監視しない設定へ調整。あわせて `schedules.ts` のフォールバック時刻表をキャッシュ化し、同一駅・路線・方向の再生成コストを削減。全87駅の時刻表取得件数0件なしを再確認。
- 2026-03-09 CODEX: タブ導線を変更。左端タブを `HOME駅` に差し替え、既存の `settings.tsx` をHOME駅設定画面として利用する構成へ変更。あわせて全タブ共通ヘッダーを `停車駅通知アプリβ` に統一し、ホーム駅設定済みの場合はヘッダー右側に `HOME駅` 名をチップ表示するよう更新。
- 2026-03-09 CODEX: 地図タブを `路線` タブへ変更。タブ上部に路線選択チップを追加し、選択した路線に属する駅を自動で一覧表示するパネルを実装。駅一覧から駅を押すと既存の駅選択アクションへ接続される構成に更新。
- 2026-03-09 CODEX: `路線` タブから既存の地図/駅一覧フォールバックを除去し、路線専用画面へ切替。初期表示は路線一覧のみとし、路線を押した後にその路線の駅一覧だけを表示する構成へ整理。
- 2026-03-09 CODEX: `HOME駅` タブにGPS自動判定導線を追加。手動の駅検索設定に加えて、位置情報から最寄駅候補を表示し、そのまま `HOME駅` に設定できるカードを追加。
- 2026-03-09 CODEX: `HOME駅` タブのGPS導線を拡張。最寄駅1件固定ではなく、`nearbyStations` の先頭3件を候補表示し、その中から任意の駅を `HOME駅` に設定できる選択式UIへ変更。各候補には路線名と概算距離も表示。
- 2026-03-09 CODEX: 駅一覧画面で駅名押下時に固まる問題へ対応。`stations.tsx` の押下直後に走っていた `getAllNextTrains()` を削除し、`StationDetailModal.tsx` 側でも表示直後の `loadAllData()` を外して、電車情報取得を非同期で遅延実行する形へ変更。
- 2026-03-09 CODEX: Androidアプリ前提で通知構成を整理。`app.json` にAndroidの通知・位置情報関連権限 (`POST_NOTIFICATIONS`, `ACCESS_BACKGROUND_LOCATION` など) を明示し、`expo-location` / `expo-notifications` プラグイン設定へ権限文言・既定通知チャンネル・通知アイコン設定を追加。
- 2026-03-09 CODEX: Android実機での通知検証を進めやすくするため、`ANDROID_NOTIFICATION_TEST_GUIDE.md` を追加。実機接続、権限許可、降車駅設定、接近通知確認までの手順を整理。
- 2026-03-09 CODEX: Android通知検証手順を development build 前提へ具体化。`ANDROID_NOTIFICATION_TEST_GUIDE.md` に `expo prebuild --platform android`、`expo run:android`、`expo start --dev-client` を使うローカル実機ビルド手順を追記し、現時点では `eas.json` 未導入のためEASではなくローカルAndroidビルドを基準とする方針を明記。
- 2026-03-09 CODEX: Android実機で通知確認しやすいよう、`HOME駅` タブに簡易診断カードを追加。通知権限、位置情報権限、最寄駅候補数、降車駅設定の状態を表示し、その場で通知権限確認と位置情報更新を実行できるようにした。
- 2026-03-09 CODEX: ベストケースとしてのハイブリッドAndroid構成を設計書へ整理。`HYBRID_ANDROID_APP_PLAN.md` を追加し、`WebView + ネイティブ位置監視 + ネイティブ通知 + 必要に応じてFCM` の責務分担、既存コード対応、Android Studio側で必要な機能、実装順を明文化。
- 2026-03-14 CODEX: WebViewハイブリッド構成の並行実装を進めるため、`WEBVIEW_BRIDGE_SPEC.md` を追加。Web->Android と Android->Web のイベント種別、共通JSON形式、`homeStation` / `dropoffTarget` / `nearbyStations` / `permissions` のメッセージ例、エラーコード、同期タイミングを定義。
- 2026-03-14 CODEX: Androidハイブリッド構成の保存方式を確定。`HYBRID_ANDROID_APP_PLAN.md` と `WEBVIEW_BRIDGE_SPEC.md` に、Phase 1-3 は `SharedPreferences` を採用し、`homeStation` / `dropoffTarget` / 権限キャッシュ / 最終位置 / 通知履歴20件を保持する方針、`Room` へ切替える条件、保存後のブリッジ同期動作を追記。
- 2026-03-14 CODEX: Android 側が Kotlin 実装である前提を設計へ反映。`HYBRID_ANDROID_APP_PLAN.md` と `WEBVIEW_BRIDGE_SPEC.md` に、Web->Android は `JavascriptInterface`、Android->Web は `evaluateJavascript` を一次採用する方針、`AndroidBridge` / `BridgeMessageRouter` / `AppPreferencesRepository` などの最小クラス構成を追記。
- 2026-03-14 CODEX: Kotlin ベースの Android Studio 実装を開始しやすくするため、`ANDROID_STUDIO_PROJECT_STRUCTURE.md` を追加。WebView ホスト、`AndroidBridge`、`BridgeMessageRouter`、`AppPreferencesRepository`、`LocationTrackingService`、`DropoffNotificationManager` などの最小クラス構成、推奨パッケージ構成、Manifest 権限、Phase 1 完了条件を整理。
- 2026-03-14 CODEX: Kotlin 実装時の JSON 解析と保存を単純化するため、`ANDROID_KOTLIN_DATA_MODELS.md` を追加。`WEBVIEW_BRIDGE_SPEC.md` の各メッセージに対応する `BridgeRequest` / `BridgeResponse` / `StationSummary` / `DropoffTargetPayload` などの data class、SharedPreferences 保存モデル、保存キー、Phase 1 で最低限必要なモデル群を整理。
- 2026-03-14 CODEX: Windows 11 上の Android Studio で画面確認できるようにするため、リモート Ubuntu 開発環境からの移行方針を整理。アプリ本体ソースは `node_modules` や `.git` を除くと 85 ファイル・約1.8MB で、ローカルへコピーして Android Studio 連携や WebView ホスト化の作業を進められることを確認。
- 2026-03-14 CODEX: Expo Web トンネル再発行を試行したが `failed to start tunnel` / `ERR_NGROK_3200` となるため、代替として `npx expo start --web --host lan` で Web サーバーを再起動。現在 `*:8081` で待受しているため、Android Studio の WebView では OCI 公開IP経由の `http://161.33.151.114:8081` を利用する案内へ切替。
- 2026-03-14 CODEX: 外部から `http://161.33.151.114:8081` に到達できない件を切り分け。Ubuntu 側では Expo Web が `*:8081` で待受していることを再確認した一方、`ufw status` は root 権限不足で確認できず、少なくともアプリプロセス側は待受済みのため、OCI の Security List/NSG で `TCP 8081` の Ingress 許可が未設定である可能性が高いと判断。
- 2026-03-14 CODEX: Ubuntu 上で疎通確認を追加実施。`curl -I http://127.0.0.1:8081` は HTTP 200 を返し、Expo Web 自体は正常。一方で `curl -I http://161.33.151.114:8081` は `No route to host` となり、プロセスではなく公開IP経路側で遮断されていることを確認。
- 2026-03-14 CODEX: ユーザー依頼により Expo Web サーバーを再起動し、疎通を再確認。`npx expo start --web --host lan` で `http://localhost:8081` が起動し、`curl -I http://127.0.0.1:8081` は HTTP 200 を返却。一方 `curl -I http://161.33.151.114:8081` は再度 `No route to host` で、再起動後も公開IP側経路の問題が継続していることを確認。
- 2026-03-14 CODEX: 161.33.151.114 での確認経路を追加検証。`8081` は localhost では HTTP 200 だが公開IPでは `No route to host`。一方、公開IPの `80/443` はどちらも HTTP 200 で `train-arrival-notifier` のHTMLを返し、`/_expo/static/js/web/...js` も 200 応答を確認。nginx 設定も `/var/www/train-notifier` を 80/443 で配信しているため、Android Studio の WebView 確認には `http://161.33.151.114` または `https://161.33.151.114` を使う方針へ切替。
- 2026-03-14 CODEX: ユーザー承認のもとで nginx を `localhost:8081` へリバースプロキシする切替を試行したが、`/etc/nginx/sites-available/train-notifier-https` への書込、証明書鍵読込、`systemctl reload nginx` の各段階で権限不足により失敗。現在の CLI 権限では nginx 設定変更は完了できず、サーバー管理者権限での反映が必要。
- 2026-03-14 CODEX: ユーザー明示許可のもとで `sudo systemctl reload nginx` を実行し、nginx のリバースプロキシ設定を反映。これにより `https://161.33.151.114` で `localhost:8081` の最新開発画面を確認する段階へ移行。
- 2026-03-14 CODEX: サイト初期表示を `HOME駅` タブへ固定するため、`app/(tabs)/_layout.tsx` の `Tabs` に `initialRouteName="settings"` を追加。Web/Android WebView の初回表示が HOME駅 画面になるよう変更。
- 2026-03-14 CODEX: `Tabs` の `initialRouteName` だけでは初回表示が変わらないため、`app/index.tsx` を追加してルートアクセス時に `/(tabs)/settings` へ明示リダイレクトするよう修正。HOME駅画面を初回表示へ固定。
- 2026-03-14 CODEX: ヘッダー名を `到着駅教える君β` に変更し、`路線` と `駅一覧` を `到着駅` 画面へ統合。`app/(tabs)/index.tsx` を再構成して、駅名検索による到着駅選択と、路線選択後にその路線の駅がプルダウン表示されるUIへ変更。不要になった `駅一覧` タブは `href: null` で非表示化。
- 2026-03-14 CODEX: `到着駅` 画面の路線一覧を単列から縦横タイル表示へ変更。`app/(tabs)/index.tsx` の路線選択UIを2列グリッド化し、各路線をカード状に一覧表示、同一路線の再押下でプルダウン開閉できるよう調整。
- 2026-03-14 CODEX: 中央線・東海道線・京浜東北線の駅データを拡充。`src/constants/stations.ts` に各路線の不足駅を追加し、`到着駅` 画面で中央線23駅、東海道線14駅、京浜東北線27駅が一覧表示される状態へ修正。
- 2026-03-14 CODEX: 時刻表画面の `Unexpected text node` エラーを修正。`src/components/Timetable/TimetableControls.tsx` の現在設定表示で分割されたテキストノードをやめ、`currentSettingsLabel` を事前組み立てして単一の `<Text>` として描画するよう変更。
- 2026-03-14 CODEX: 時刻表画面エラーの追加対処として、`src/components/Timetable/TimetableControls.tsx` の JSX 内コメントを除去し、`selectedLine && (...)` を `selectedLine ? (...) : null` に変更。View 直下に不要なテキストノードが生成されない形へ整理。
- 2026-03-14 CODEX: 時刻表画面のコントロール領域をコンパクト化。`src/components/Timetable/TimetableControls.tsx` で運行日と方向を横並びに再配置し、ボタン・ラベル・余白・アイコンサイズを縮小して、下の時刻表示が見えやすいレイアウトへ調整。
- 2026-03-14 CODEX: 時刻表コントロールの幅配分を再調整。`src/components/Timetable/TimetableControls.tsx` で運行日セクションを広め、方向セクションをやや右へ寄せるよう変更し、`休日` ボタンの右端が切れないよう改善。
- 2026-03-14 CODEX: 時刻表に各駅停車以外の列車種別を追加。`src/constants/schedules.ts` の中央線・東海道線・京浜東北線フォールバック時刻表へ `rapid` に加えて `local` / `limited` / `commuter` を混在させ、`src/components/Timetable/TimetableGrid.tsx` の凡例にも特急・準急・通勤を追加。
- 2026-03-14 CODEX: 小田急以外でも各駅停車以外が見えるよう、`src/constants/schedules.ts` を追加拡張。山手線の既存固定時刻表（新宿・東京・渋谷）と、山手線・銀座線のフォールバック時刻表に `rapid` / `express` を混在させ、全路線で複数種別が表示されるよう補強。
- 2026-03-14 CODEX: `502 Bad Gateway` 対応として Expo Web 開発サーバーを再起動。`localhost:8081` の上流プロセス停止が原因で、`npx expo start --web --host lan` を再実行して nginx の転送先を復旧。
- 2026-03-14 CODEX: `HOME駅` 画面の `Android通知確認` セクションへ `通知テストを送信` ボタンを追加。`src/services/androidBridgeService.ts` を新設し、Android WebView で `window.AndroidBridge.postMessage` が使える場合は `notification.test` を送信、未実装環境では既存の通知フックへフォールバックする構成に更新。
- 2026-03-14 CODEX: Android アプリ化を前進させるため、Web 側の AndroidBridge 送信を拡張。`src/services/androidBridgeService.ts` に `homeStation.set/clear`、`dropoffTarget.set/clear`、`station.preview` の送信ヘルパーを追加し、`app/(tabs)/settings.tsx` の HOME駅設定/解除と通知テスト、`app/(tabs)/index.tsx` の到着駅選択で Android 側へイベント送信するよう更新。
- 2026-03-14 CODEX: Android 側の保存実装を進めやすくするため、`ANDROID_BRIDGE_SAVE_IMPL.md` を追加。`homeStation.set/clear`、`dropoffTarget.set/clear`、`notification.test` を受けて `SharedPreferences` へ保存する `MainActivity.kt` 完全版、保存キー、Logcat 確認手順、限定テストAPKへ進む次段階を整理。
- 2026-03-14 CODEX: Android 限定テストを前進させるため、`ANDROID_LOCATION_NOTIFY_IMPL.md` を追加。`dropoffTarget` を `SharedPreferences` から読み、`FusedLocationProviderClient` で前面表示中の位置更新を購読して、Web 側 `useDropoffNotifier.ts` と同じ 3分前判定・距離判定でローカル通知する `MainActivity.kt` 最小実装、必要な Manifest 権限、Gradle 依存、限定テスト手順、次段階の Foreground Service 化方針を整理。
- 2026-03-14 CODEX: Git 管理を開始。プロジェクト直下で Git リポジトリを初期化し、`.gitignore` を追加して `node_modules` / `.expo` / `tmp` などを除外。ローカル Git 設定に `user.name=Codex`、`user.email=codex@local` を設定し、現在の作業状態を `Initialize repository` で初回コミットした。
- 2026-03-15 CODEX: Android アプリ化継続として Web 側の同期導線を強化。`src/hooks/useAndroidBridgeSync.ts` を追加し、起動後に `homeStation` と `dropoffTarget` の保存状態を AndroidBridge へ自動同期するよう更新。`app/(tabs)/_layout.tsx` で常時同期を有効化し、`StationDetailModal.tsx` と `StationsList.tsx` から降車駅設定した場合も Android 側へ `dropoffTarget.set` を送るよう修正。あわせて `settings.tsx` の重複 import を整理。
- 2026-03-15 CODEX: Android アプリ化継続として Android->Web の受信土台を追加。`src/services/androidBridgeEventService.ts` に `window.handleAndroidBridgeMessage` とカスタムイベント配信を実装し、`src/hooks/useAndroidBridgeState.ts` で Android 権限状態・最終イベント種別を購読できるようにした。`app/(tabs)/settings.tsx` には Android 連携状態表示と `Android状態を取得` ボタンを追加し、今後の `permissions.state` / `notification.sent` 返却を画面で確認できるよう更新。
- 2026-03-15 CODEX: Android -> Web の返却実装を進めるため、`ANDROID_BRIDGE_RESPONSE_IMPL.md` を追加。`permissions.get` を受けて `permissions.state` を `window.handleAndroidBridgeMessage(...)` へ返す Kotlin 実装例、`notification.test.sent` 返却、`dispatchEventToWeb` / `buildPermissionStatePayload` / `escapeForJavascript` ヘルパー、HOME駅画面での確認手順を整理。
- 2026-03-15 CODEX: `502 Bad Gateway` の復旧対応として Expo Web 開発サーバーを再起動。`npx expo start --web --host lan` を再実行し、nginx の上流 `127.0.0.1:8081` を復旧した。
- 2026-03-15 CODEX: `502 Bad Gateway` の復旧対応として、Expo 開発サーバーの代わりに `dist/` を `python3 -m http.server 8081` で配信する暫定構成へ切替。`npx expo export --platform web` で静的書き出し後、nginx 上流 `127.0.0.1:8081` を復旧した。
- 2026-03-15 CODEX: 日次停止対策として 8081 上流を Expo 開発サーバーから静的配信へ切替。`scripts/start_web_static.sh` / `scripts/stop_web_static.sh` を追加し、`npx expo export --platform web` 後に `setsid python3 -m http.server 8081 --directory dist` を常駐起動する方式へ更新。`logs/web_static_server.log` と `logs/web_static_server.pid` で状態確認できるようにした。
- 2026-03-15 CODEX: Android -> Web 返却の次段階に備え、`useAndroidBridgeState.ts` を拡張。`homeStation.state`、`dropoffTarget.state`、`dropoffTarget.notified` を受信した際に Android 側保持中の HOME駅 / 到着駅 / 最終到着駅通知を保持するよう更新し、`app/(tabs)/settings.tsx` に Android 側の駅状態・通知履歴表示を追加。`ANDROID_BRIDGE_RESPONSE_IMPL.md` も初期同期と到着駅通知返却の実装例まで更新。
- 2026-03-15 CODEX: Android Studio での反映手順を単純化するため、`ANDROID_MAIN_ACTIVITY_INTEGRATED.md` を追加。WebView、保存、権限返却、初期同期、前面位置監視、到着駅通知返却までを含む `MainActivity.kt` 完全版、必要な Manifest 権限、Gradle 依存、確認手順を 1 つに統合。
- 2026-03-15 CODEX: 少人数テスト配布に進めるため、`ANDROID_LIMITED_TEST_RELEASE_GUIDE.md` を追加。debug APK の作成場所、テスターへの配布方法、端末での確認項目、通知・接近通知の回収観点、release APK / 内部テストへ進む条件を整理。
- 2026-03-15 CODEX: Google Play Console 承認待ちの間に公開準備を前進させるため、`GOOGLE_PLAY_RELEASE_PREP.md` を追加。内部テストから本番公開までの推奨順、ストア掲載文言のたたき台、権限説明、バックグラウンド位置情報の判断、公開前チェックリスト、プライバシーポリシー記載項目を整理。
