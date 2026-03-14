# Codex 作業ルール

## 応答方針
- 日本語で応答すること
- コードコメントは日本語で書くこと
- コミットメッセージは英語で簡潔に書くこと
- 変数名・関数名は英語のキャメルケースを使用すること

## 読み取り禁止
- .env*
- **/.env*
- **/*.key
- **/*.pem
- **/*.p12
- **/*.jks
- **/*.keystore
- **/credentials.json
- **/google-services.json

## 実行禁止
- rm -rf
- rm -r
- rm -fr
- rm --recursive
- sudo
- git push --force
- git push -f
- printenv
- env

## 要確認
- rm
- git push
- git merge
- git rebase
- curl
- wget
- chmod
- mv
- cp
- cd
- find

## 作業スタイル
- 大きな変更の前に計画を示すこと
- 編集前に現在の内容を確認すること
- エラー時は原因を分析してから修正すること
- テストがある場合は変更後に必ず実行すること
