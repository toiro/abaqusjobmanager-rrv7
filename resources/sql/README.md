# SQL Scripts Documentation

このディレクトリには、Abaqus Job Manager のデータベース初期化とマイグレーションスクリプトが含まれています。

## 🗂️ ファイル構成

### 新規インストール（推奨順序）
1. **`01_create_tables.sql`** - 全テーブル作成（app_settingsテーブル含む）
2. **`02_insert_default_config.sql`** - デフォルト設定データ挿入（JSON形式）
3. **`03_sample_data.sql`** - サンプルデータ（オプション）

### テスト環境
- **`test_setup.sql`** - テスト用の最小構成（Integration Testsで使用）

## 🔧 Settings システムアーキテクチャ

### 新システム (app_settings)
```sql
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,              -- 設定カテゴリ（例: 'main_settings'）
  value TEXT NOT NULL CHECK (json_valid(value)), -- JSON形式の設定値
  schema_version INTEGER NOT NULL DEFAULT 1,     -- スキーマバージョン管理
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### JSON構造例
```json
{
  "MAX_UPLOAD_SIZE": 104857600,
  "LICENSE_SERVER": "localhost", 
  "AVAILABLE_LICENCE_TOKEN": 50
}
```

### 操作方法
- **取得**: `getMainSettings()` from `settings-operations.ts`
- **設定**: `setMainSettings()`, `updateMainSettings()`
- **JSON Path**: `getSettingJsonPath()`, `setSettingJsonPath()`

## 🔄 システム設計

### 新規インストール対応
- `app_settings`テーブルによるJSON-based設定管理
- SQLite JSON関数を活用した効率的な操作
- Zodスキーマによる型安全性とバリデーション

## ⚡ SQLite JSON Functions 活用

新システムはSQLiteの強力なJSON関数を活用：

- **`json_valid()`** - JSON構造バリデーション
- **`json_extract()`** - 特定値の抽出
- **`json_set()`** - 値の更新
- **`json_patch()`** - 部分更新
- **`json_object()`** - JSON構築

## 🧪 テスト

- **Integration Tests**: `settings-system.test.ts` (24テスト実装済み)
- **Unit Tests**: `settings-operations.test.ts` (TODO実装待ち)

## 📝 使用例

```typescript
import { getMainSettings, updateMainSettings } from '~/lib/core/database/settings-operations';

// 設定取得
const settings = getMainSettings();
console.log(settings.LICENSE_SERVER);

// 部分更新（効率的）
updateMainSettings({ 
  LICENSE_SERVER: 'new-server',
  AVAILABLE_LICENCE_TOKEN: 100 
});
```