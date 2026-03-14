#!/bin/bash

# 🚀 OCI Ubuntu側での開発環境セットアップ用コマンド集
# 実行前に: ローカル側からファイル転送を完了させてください

echo "🔧 Train Arrival Notifier - OCI開発環境セットアップ開始..."

# 基本情報表示
echo "📍 現在の場所: $(pwd)"
echo "👤 ユーザー: $(whoami)"
echo "🖥️ Node.js バージョン: $(node --version 2>/dev/null || echo '未インストール')"
echo "📦 npm バージョン: $(npm --version 2>/dev/null || echo '未インストール')"

# 1. プロジェクトディレクトリに移動
echo "📁 プロジェクトディレクトリに移動..."
cd /home/ubuntu/projects/train-arrival-notifier

# 2. 現在のファイル構造確認
echo "📋 現在のファイル構造:"
ls -la

# 3. package.jsonの存在確認
if [ -f "package.json" ]; then
    echo "✅ package.json が見つかりました"
    echo "📦 依存関係:"
    cat package.json | grep -A 10 '"dependencies"'
else
    echo "❌ package.json が見つかりません。ファイル転送を確認してください。"
    exit 1
fi

# 4. 重要な修正ファイルの存在確認
echo "🔍 重要な修正済みファイルの確認:"
check_file() {
    if [ -f "$1" ]; then
        echo "✅ $1"
    else
        echo "❌ $1 (転送必要)"
    fi
}

check_file "src/components/Map/WebMapFallback.tsx"
check_file "src/hooks/useStorage.ts"
check_file "src/components/Map/MapView.tsx"
check_file "src/services/storageService.ts"

# 5. 依存関係インストール
echo "📦 依存関係インストール開始..."
if npm install; then
    echo "✅ npm install 完了"
else
    echo "❌ npm install 失敗。Node.js/npmの確認が必要です。"
    exit 1
fi

# 6. Expo CLIインストール確認
echo "🚀 Expo CLI確認..."
if command -v expo &> /dev/null; then
    echo "✅ Expo CLI利用可能: $(expo --version)"
else
    echo "📥 Expo CLI インストール..."
    npm install -g @expo/cli
fi

# 7. 開発サーバー起動テスト（バックグラウンド）
echo "🧪 開発サーバー起動テスト..."
timeout 10s npm start > /tmp/expo-test.log 2>&1 &
TEST_PID=$!
sleep 5
if kill -0 $TEST_PID 2>/dev/null; then
    echo "✅ 開発サーバー正常起動"
    kill $TEST_PID
else
    echo "⚠️ 開発サーバー起動に問題がある可能性があります"
    echo "ログ確認: cat /tmp/expo-test.log"
fi

# 8. Claude Code設定確認
echo "🤖 Claude Code設定確認..."
if [ -f ".claude/CLAUDE.md" ]; then
    echo "✅ Claude Code設定ファイル存在"
else
    echo "⚠️ Claude Code設定ファイルが見つかりません"
fi

# 9. 使用可能なポートの確認
echo "🔌 使用可能ポート確認:"
for port in 8081 8089 19000 19001; do
    if ! netstat -tuln | grep -q ":$port "; then
        echo "✅ ポート $port 利用可能"
    else
        echo "❌ ポート $port 使用中"
    fi
done

# 10. 完了メッセージと次のステップ
echo ""
echo "🎉 OCI開発環境セットアップ完了！"
echo ""
echo "🚀 開発開始コマンド:"
echo "  Web版開発: npm run web"
echo "  通常開発:   npm start"
echo "  ビルド:     npx expo export --platform web"
echo ""
echo "🔧 Claude Code開始:"
echo "  code .     # VS Code + Claude Code拡張機能"
echo "  claude     # Claude Code CLI"
echo ""
echo "📱 アクセス先（開発サーバー起動後）:"
echo "  http://161.33.151.114:8081"
echo "  http://161.33.151.114:8089"
echo ""
echo "🌐 本番環境（デプロイ済み）:"
echo "  https://161.33.151.114/"
echo ""
echo "🔍 トラブルシューティング:"
echo "  ログ確認: cat /tmp/expo-test.log"
echo "  ファイル確認: ls -la src/components/Map/"
echo "  依存関係: npm list"
echo ""

# 11. Git状態確認（オプション）
if [ -d ".git" ]; then
    echo "📊 Git状態:"
    git status --short
    echo ""
    echo "最新コミット:"
    git log --oneline -3
else
    echo "⚠️ Gitリポジトリが初期化されていません"
    echo "💡 バージョン管理を開始するには: git init"
fi

echo "✅ セットアップ確認完了！開発を開始してください。"