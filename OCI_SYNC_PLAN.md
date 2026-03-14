# 📡 OCI開発環境同期プラン

## 🎯 目標
ローカルで修正・最適化済みのTrain Arrival NotifierアプリをOCI Ubuntu環境に同期し、開発継続可能な状態にする。

## 📊 現在の状況

### ローカル側（Windows）
- ✅ Phase 3.5完了（パフォーマンス最適化）
- ✅ 重要バグ修正済み（お気に入り機能、無限ループ等）
- ✅ HTTPS対応デプロイファイル準備完了
- ⚠️ Git履歴が未整備

### OCI側（Ubuntu）
- ✅ 基本ディレクトリ構造存在: `/home/ubuntu/projects/train-arrival-notifier/`
- ✅ Claude Code環境設定済み
- ❌ 最新ソースコード未反映
- ❌ 修正済み機能が利用不可

## 🚀 同期方法（2つのオプション）

### オプション A: Git使用（推奨）🏆

**メリット:**
- バージョン管理と変更履歴
- ブランチ機能で安全な開発
- 将来的な協業・バックアップ
- ロールバック可能

**手順:**

#### 1. ローカル側でGitリポジトリ作成
```bash
cd C:\Users\sugiyama\CCTEST\train-arrival-notifier

# .gitignoreファイル作成（必要に応じて）
echo "node_modules/
dist/
.expo/
*.log
*.tar.gz" > .gitignore

# Git初期化とコミット
git add .
git commit -m "feat: Phase 3.5 completed - Performance optimization and bug fixes

- Fix WebMapFallback favorite functionality
- Resolve useStorage infinite loop
- Add performance optimization (15-25 stations display limit)
- Enhance Web environment compatibility
- Add HTTPS deployment support"
```

#### 2. GitHubにプッシュ（推奨）
```bash
# GitHubリポジトリ作成後
git remote add origin https://github.com/[username]/train-arrival-notifier.git
git push -u origin master
```

#### 3. OCI側でクローン
```bash
# SSH接続
ssh ubuntu@161.33.151.114

# 既存ディレクトリをバックアップ
mv /home/ubuntu/projects/train-arrival-notifier /home/ubuntu/projects/train-arrival-notifier.old

# 最新リポジトリをクローン
cd /home/ubuntu/projects
git clone https://github.com/[username]/train-arrival-notifier.git

# 依存関係インストール
cd train-arrival-notifier
npm install
```

---

### オプション B: 直接ファイル転送（クイック）⚡

**メリット:**
- 即座に作業開始可能
- シンプルな手順
- Git知識不要

**デメリット:**
- バージョン管理なし
- 変更履歴の欠如

**手順:**

#### 1. 重要ファイル群の転送
```bash
# 重要なソースコードディレクトリ
scp -r src/ ubuntu@161.33.151.114:/home/ubuntu/projects/train-arrival-notifier/
scp -r app/ ubuntu@161.33.151.114:/home/ubuntu/projects/train-arrival-notifier/

# 設定ファイル
scp package.json app.json tsconfig.json ubuntu@161.33.151.114:/home/ubuntu/projects/train-arrival-notifier/

# 追加リソース
scp -r assets/ ubuntu@161.33.151.114:/home/ubuntu/projects/train-arrival-notifier/
scp index.ts ubuntu@161.33.151.114:/home/ubuntu/projects/train-arrival-notifier/

# ドキュメント
scp IMPLEMENTATION_MEMO_OCI.md ubuntu@161.33.151.114:/home/ubuntu/projects/train-arrival-notifier/
```

#### 2. OCI側で依存関係インストール
```bash
ssh ubuntu@161.33.151.114
cd /home/ubuntu/projects/train-arrival-notifier
npm install
```

## 📋 転送すべき重要ファイルリスト

### 🔴 必須ファイル（修正済みコア機能）
- `src/components/Map/WebMapFallback.tsx` ⭐ **お気に入り機能修正済み**
- `src/hooks/useStorage.ts` ⭐ **無限ループ修正済み**
- `src/components/Map/MapView.tsx` ⭐ **パフォーマンス最適化済み**
- `src/components/Map/StationMarker.tsx` ⭐ **React.memo適用済み**
- `src/services/storageService.ts` ⭐ **Web環境対応強化済み**
- `src/services/locationService.ts` ⭐ **エラーハンドリング改善済み**

### 🟡 重要設定ファイル
- `package.json` - 依存関係とスクリプト
- `app.json` - Expo設定
- `tsconfig.json` - TypeScript設定
- `index.ts` - エントリーポイント

### 🟢 サポートファイル
- `src/` ディレクトリ全体
- `app/` ディレクトリ（Expo Routerファイル）
- `assets/` ディレクトリ
- `IMPLEMENTATION_MEMO_OCI.md` - 引き継ぎドキュメント

### 📦 デプロイ関連（既にOCI側に配置済み）
- `deploy-to-oci-https.sh`
- `nginx-https.conf`
- `train-notifier-web.tar.gz`

## ⚡ クイックスタート手順

### 最速で開発環境構築（5分）
```bash
# 1. 重要ファイルのみ転送（ローカル側）
cd C:\Users\sugiyama\CCTEST\train-arrival-notifier
scp -r src/ app/ ubuntu@161.33.151.114:/home/ubuntu/projects/train-arrival-notifier/
scp package.json app.json tsconfig.json index.ts ubuntu@161.33.151.114:/home/ubuntu/projects/train-arrival-notifier/

# 2. OCI側でセットアップ
ssh ubuntu@161.33.151.114
cd /home/ubuntu/projects/train-arrival-notifier
npm install
npm run web
```

## 🔍 同期後の確認項目

### 1. 基本動作確認
```bash
cd /home/ubuntu/projects/train-arrival-notifier
npm start  # 開発サーバー起動テスト
```

### 2. 修正済み機能テスト
- WebMapFallbackのお気に入りボタン動作
- 地図のパフォーマンス（15-25駅表示制限）
- エラーコンソールでの無限ループ確認

### 3. ビルドテスト
```bash
npx expo export --platform web
```

## 💡 推奨アプローチ

**最適解**: **オプションA（Git）+ クイックスタート**

1. ⚡ **即座の開発継続**：オプションBで重要ファイル転送
2. 🏗️ **長期管理準備**：並行してオプションAでGit環境整備
3. 🚀 **安全な開発継続**：Git環境完成後は本格的なバージョン管理

この方法により、開発の中断を最小限に抑えながら、適切なバージョン管理体制を構築できます。

---

**🎯 次のステップ**: どちらのオプションを選択するかを決定し、OCI側で開発環境をセットアップ後、修正済み機能のテストを実行してください。