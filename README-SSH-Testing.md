# SSH統合テスト実行ガイド

このドキュメントは、実際のSSH接続を使用したnodeHealthCheck機能のテスト方法を説明します。

## 🚀 テスト実行方法

### 1. 環境変数を使用した自動テスト

環境変数でSSH接続情報を指定してテストを実行:

```bash
# 基本的なSSH接続テスト
TEST_SSH_HOST=192.168.1.100 TEST_SSH_USER=abaqus bun run test:ssh

# ポートを指定してテスト
TEST_SSH_HOST=server.local TEST_SSH_USER=testuser TEST_SSH_PORT=2222 bun run test:ssh

# Abaqusテストを含む包括的テスト（タイムアウト60秒）
TEST_SSH_HOST=10.0.0.5 TEST_SSH_USER=admin TEST_SSH_TIMEOUT=60000 bun run test:ssh
```

#### 環境変数の説明

| 変数名 | 必須 | デフォルト | 説明 |
|--------|------|------------|------|
| `TEST_SSH_HOST` | ✅ | - | 接続先ホスト名またはIPアドレス |
| `TEST_SSH_USER` | ✅ | - | SSH接続ユーザー名 |
| `TEST_SSH_PORT` | ❌ | 22 | SSH接続ポート番号 |
| `TEST_SSH_PASSWORD` | ❌ | - | SSH接続パスワード（未実装） |
| `TEST_SSH_TIMEOUT` | ❌ | 30000 | 接続タイムアウト（ミリ秒） |

### 2. 手動テストスクリプト

対話的にSSH接続をテストする場合:

```bash
# 基本的な接続テスト
bun run test:ssh:manual --host 192.168.1.100 --user abaqus

# 詳細オプション付きテスト
bun run test:ssh:manual -h server.local -u testuser -p 2222 --abaqus --verbose

# タイムアウト指定
bun run test:ssh:manual -h 10.0.0.5 -u admin --timeout 60000 -v
```

#### 手動テストスクリプトのオプション

| オプション | 短縮形 | 必須 | 説明 |
|------------|--------|------|------|
| `--host` | `-h` | ✅ | 接続先ホスト名 |
| `--user` | `-u` | ✅ | ユーザー名 |
| `--port` | `-p` | ❌ | ポート番号（デフォルト: 22） |
| `--timeout` | `-t` | ❌ | タイムアウト（デフォルト: 30000ms） |
| `--abaqus` | `-a` | ❌ | Abaqus環境テストを実行 |
| `--verbose` | `-v` | ❌ | 詳細出力 |
| `--help` | - | ❌ | ヘルプ表示 |

## 📋 テスト内容

### 実行されるテスト

1. **SSH接続テスト**
   - 基本的なSSH接続の確立
   - PowerShellスクリプトの実行
   - JSON形式での結果取得

2. **基本コマンドテスト**
   - `whoami` コマンドの実行
   - `Get-Location` コマンドの実行
   - 実行結果の検証

3. **Abaqus環境テスト**（オプション）
   - Abaqusコマンドの利用可能性確認
   - バージョン情報の取得
   - インストールパスの確認

4. **エラーハンドリングテスト**
   - 無効なポート番号の処理
   - 接続タイムアウトの処理
   - JSON解析エラーの処理

### PowerShellスクリプトの詳細

実行されるPowerShellスクリプト（`/app/resources/ps-scripts/node-health-check.ps1`）は以下の情報を収集します:

- システム情報（ホスト名、ユーザー名、OS）
- PowerShellバージョン
- 現在のディレクトリ
- Abaqus環境の検出とバージョン情報

## 🔧 トラブルシューティング

### よくある問題と解決方法

#### 1. 接続タイムアウト
```bash
❌ Timeout handled correctly after 3000ms: Connection timeout
```
**解決方法**: タイムアウト値を増やすか、ネットワーク接続を確認

#### 2. PowerShellが見つからない
```bash
❌ PowerShell not found on remote system
```
**解決方法**: リモートシステムにPowerShellをインストール

#### 3. スクリプトファイルが見つからない
```bash
❌ Script file not found: /app/resources/ps-scripts/node-health-check.ps1
```
**解決方法**: スクリプトファイルの存在と権限を確認

#### 4. JSON解析エラー
```bash
❌ Failed to parse PowerShell response
```
**解決方法**: PowerShellスクリプトの出力を確認（`--verbose`オプション使用）

## 🎯 実行例

### 成功例
```bash
$ bun run test:ssh:manual -h 192.168.1.100 -u abaqus --abaqus --verbose

🚀 Starting SSH connection test...

📋 Configuration:
   Host: 192.168.1.100
   Port: 22
   User: abaqus
   Timeout: 30000ms
   Test Abaqus: Yes

🔗 Connecting to abaqus@192.168.1.100:22...

📊 Test Results:
================
✅ Overall Status: SUCCESS
⏱️  Total Time: 2134ms
🔗 Connection Time: 1876ms
🖥️  Remote Hostname: ABAQUS-SERVER

🔍 Test Details:
================
SSH Connection: ✅ SUCCESS
Basic Commands: ✅ SUCCESS
  Executed: whoami, Get-Location
Abaqus Environment: ✅ AVAILABLE
  Version: 2023

🎉 Test completed successfully!
```

### エラー例
```bash
$ bun run test:ssh:manual -h invalid-host -u testuser

🚀 Starting SSH connection test...
🔗 Connecting to testuser@invalid-host:22...

📊 Test Results:
================
❌ Overall Status: FAILED
⏱️  Total Time: 3021ms
🔗 Connection Time: 0ms
❌ Error: Connection timeout

🔍 Test Details:
================
SSH Connection: ❌ FAILED
  Error: Connection timeout
```

## 🔒 セキュリティ注意事項

1. **認証情報の管理**
   - パスワード認証は現在未実装
   - SSH鍵認証の使用を推奨
   - テスト用の専用アカウントを使用

2. **ネットワークセキュリティ**
   - テスト対象は信頼できるネットワーク内のサーバーのみ
   - ファイアウォール設定の確認

3. **権限管理**
   - 最小権限の原則に従ったユーザーアカウントを使用
   - PowerShell実行権限の適切な設定

## 📁 関連ファイル

- `/app/tests/integration/ssh-real.test.ts` - SSH統合テスト
- `/app/scripts/test-ssh-connection.ts` - 手動テストスクリプト
- `/app/resources/ps-scripts/node-health-check.ps1` - PowerShellヘルスチェックスクリプト
- `/app/app/lib/nodeHealthCheck.ts` - ヘルスチェック実装
- `/app/app/lib/remote-pwsh/` - リモートPowerShell実行ライブラリ