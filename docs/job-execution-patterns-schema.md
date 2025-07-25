# ジョブ実行パターン拡張のデータベーススキーマ設計

## 📋 概要

このドキュメントでは、Abaqus Job Managerにおけるジョブ実行パターンの拡張に必要なデータベーススキーマ設計を詳述します。現在のSingle INP Fileパターンに加えて、External DirectoryパターンとExternal APIパターンの実装に向けたスキーマ拡張を提案します。

## 🔍 現状分析

### **現在のスキーマ構造**

#### **jobsテーブル**
```sql
CREATE TABLE jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('waiting', 'starting', 'running', 'completed', 'failed', 'missing')),
  node_id INTEGER,
  file_id INTEGER NOT NULL,  -- 🚨 Single INP File前提
  user_id INTEGER NOT NULL,
  cpu_cores INTEGER NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  start_time DATETIME,
  end_time DATETIME,
  error_message TEXT,
  output_file_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (node_id) REFERENCES nodes (id),
  FOREIGN KEY (file_id) REFERENCES files (id),  -- 🚨 必須参照
  FOREIGN KEY (user_id) REFERENCES users (id)
);
```

#### **filesテーブル**
```sql
CREATE TABLE files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  original_name TEXT NOT NULL,
  stored_name TEXT UNIQUE NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT,
  file_size INTEGER NOT NULL,
  checksum TEXT,
  uploaded_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### **現在のTypeScript型定義**
```typescript
export const JobSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1),
  status: z.enum(['waiting', 'starting', 'running', 'completed', 'failed', 'missing']),
  node_id: z.number().nullable().optional(),
  file_id: z.number(),  // 🚨 必須フィールド
  user_id: z.number(),
  cpu_cores: z.number().min(1),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  // ... その他のフィールド
});
```

### **現在の制約**
1. **Single File前提**: `file_id`が必須で、1つのINPファイルのみを想定
2. **システム管理ファイル**: アップロードされたファイルのみをシステムが管理
3. **固定実行パターン**: ファイル転送 → 実行 → 結果収集の単一パターン

## 🎯 拡張要件

### **パターン1: Single INP File（現行）**
- **現在の実装**: 1つのINPファイルをシステムにアップロード
- **ファイル管理**: システムが完全管理（アップロード・保存・検証）
- **実行方式**: INPファイル → 作業ディレクトリ → Abaqus実行

### **パターン2: External Directory**
- **要件**: 外部ディレクトリパスを指定してジョブ実行
- **ファイル管理**: システムがファイル内容に責任を持たない
- **実行方式**: 外部ディレクトリ → 作業ディレクトリ → Abaqus実行
- **特徴**: 
  - 複数ファイルを含むディレクトリ全体を転送
  - ファイルの整合性チェックはシステム外で実施
  - 既存の`sendDirectory.ps1`スクリプトを活用可能

### **パターン3: External API**
- **要件**: API経由でリソース占有宣言とジョブ制御
- **ファイル管理**: システム外で完全管理
- **実行方式**: リソース占有 → 外部システムが実行 → 完了通知
- **特徴**:
  - システムはCPU・ライセンストークンの占有のみ管理
  - 実際のAbaqus実行は外部システムが担当
  - API経由でジョブ開始・終了を制御

## 🔧 提案するスキーマ拡張

### **1. jobsテーブル拡張**

#### **拡張SQL**
```sql
-- ジョブタイプカラム追加
ALTER TABLE jobs ADD COLUMN job_type TEXT DEFAULT 'single_file' 
  CHECK (job_type IN ('single_file', 'directory', 'external_api'));

-- 外部ディレクトリパス（パターン2用）
ALTER TABLE jobs ADD COLUMN external_directory_path TEXT;

-- 外部API管理用（パターン3用）
ALTER TABLE jobs ADD COLUMN external_job_id TEXT;
ALTER TABLE jobs ADD COLUMN api_token TEXT;

-- file_idをNULLABLE化（パターン2・3では不要）
-- 注意: 既存データとの互換性のため、デフォルト値とCHECK制約で制御
```

#### **拡張後のテーブル定義**
```sql
CREATE TABLE jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('waiting', 'starting', 'running', 'completed', 'failed', 'missing')),
  node_id INTEGER,
  file_id INTEGER,  -- 🔄 NULLABLE化（パターン2・3では不要）
  user_id INTEGER NOT NULL,
  cpu_cores INTEGER NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  start_time DATETIME,
  end_time DATETIME,
  error_message TEXT,
  output_file_path TEXT,
  
  -- 🆕 新規追加フィールド
  job_type TEXT DEFAULT 'single_file' CHECK (job_type IN ('single_file', 'directory', 'external_api')),
  external_directory_path TEXT,
  external_job_id TEXT,
  api_token TEXT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (node_id) REFERENCES nodes (id),
  FOREIGN KEY (file_id) REFERENCES files (id),
  FOREIGN KEY (user_id) REFERENCES users (id),
  
  -- 🔄 整合性制約
  CHECK (
    (job_type = 'single_file' AND file_id IS NOT NULL AND external_directory_path IS NULL AND external_job_id IS NULL) OR
    (job_type = 'directory' AND external_directory_path IS NOT NULL AND file_id IS NULL AND external_job_id IS NULL) OR
    (job_type = 'external_api' AND external_job_id IS NOT NULL AND file_id IS NULL AND external_directory_path IS NULL)
  )
);
```

### **2. TypeScript型定義拡張（判別共用体アプローチ）**

#### **ベース共通スキーマ**
```typescript
// 全ジョブタイプ共通のフィールド
const BaseJobSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1),
  status: z.enum(['waiting', 'starting', 'running', 'completed', 'failed', 'missing']),
  node_id: z.number().nullable().optional(),
  user_id: z.number(),
  cpu_cores: z.number().min(1),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  start_time: z.string().nullable().optional(),
  end_time: z.string().nullable().optional(),
  error_message: z.string().nullable().optional(),
  output_file_path: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});
```

#### **パターン別スキーマ定義**
```typescript
// パターン1: Single INP File
export const SingleFileJobSchema = BaseJobSchema.extend({
  job_type: z.literal('single_file'),
  file_id: z.number(),
  // 他のパターンのフィールドは含めない（型安全性向上）
});

// パターン2: External Directory
export const DirectoryJobSchema = BaseJobSchema.extend({
  job_type: z.literal('directory'),
  external_directory_path: z.string(),
  // 他のパターンのフィールドは含めない（型安全性向上）
});

// パターン3: External API
export const ExternalApiJobSchema = BaseJobSchema.extend({
  job_type: z.literal('external_api'),
  external_job_id: z.string(),
  api_token: z.string().optional(),
  // 他のパターンのフィールドは含めない（型安全性向上）
});
```

#### **判別共用体スキーマ**
```typescript
// Zodの判別共用体（discriminated union）
export const JobSchema = z.discriminatedUnion('job_type', [
  SingleFileJobSchema,
  DirectoryJobSchema,
  ExternalApiJobSchema
]);

// 型推論による型安全な型定義
export type SingleFileJob = z.infer<typeof SingleFileJobSchema>;
export type DirectoryJob = z.infer<typeof DirectoryJobSchema>;
export type ExternalApiJob = z.infer<typeof ExternalApiJobSchema>;
export type Job = z.infer<typeof JobSchema>;
```

#### **判別共用体の利点**
```typescript
// 🚀 型安全な処理例
function processJob(job: Job) {
  switch (job.job_type) {
    case 'single_file':
      // TypeScriptが自動的にSingleFileJob型と推論
      console.log(`Processing file ID: ${job.file_id}`);
      // job.external_directory_path は存在しない（コンパイルエラー）
      break;
      
    case 'directory':
      // TypeScriptが自動的にDirectoryJob型と推論
      console.log(`Processing directory: ${job.external_directory_path}`);
      // job.file_id は存在しない（コンパイルエラー）
      break;
      
    case 'external_api':
      // TypeScriptが自動的にExternalApiJob型と推論
      console.log(`Processing API job: ${job.external_job_id}`);
      if (job.api_token) {
        console.log(`Using token: ${job.api_token}`);
      }
      break;
      
    default:
      // 網羅性チェック：新しいパターンが追加されたらコンパイルエラー
      const _exhaustiveCheck: never = job;
      throw new Error(`Unknown job type: ${_exhaustiveCheck}`);
  }
}
```

#### **バリデーション機能**
```typescript
// パターン別バリデーション
export function validateSingleFileJob(data: unknown): SingleFileJob {
  return SingleFileJobSchema.parse(data);
}

export function validateDirectoryJob(data: unknown): DirectoryJob {
  return DirectoryJobSchema.parse(data);
}

export function validateExternalApiJob(data: unknown): ExternalApiJob {
  return ExternalApiJobSchema.parse(data);
}

// 統一バリデーション
export function validateJob(data: unknown): Job {
  return JobSchema.parse(data);
}
```

## 📊 パターン別データフロー

### **パターン1: Single INP File**
```
User Upload INP → files table → Job Creation (file_id) → File Transfer → Abaqus Execution
```

### **パターン2: External Directory**
```
User Specify Directory Path → Job Creation (external_directory_path) → Directory Transfer → Abaqus Execution
```

### **パターン3: External API**
```
API Resource Allocation → Job Creation (external_job_id) → Resource Reservation → External Execution → API Completion
```

## 🔄 互換性と移行方針

### **既存データとの互換性**
1. **デフォルト値**: `job_type`のデフォルト値を`'single_file'`に設定
2. **NULL許可**: `file_id`をNULLABLE化（既存データは影響なし）
3. **制約追加**: CHECK制約で整合性を保証

### **段階的移行戦略**
1. **Phase 1**: スキーマ拡張（後方互換性維持）
2. **Phase 2**: 新パターンの実装
3. **Phase 3**: UIとAPIの拡張

### **移行SQL**
```sql
-- Phase 1: 基本スキーマ拡張
ALTER TABLE jobs ADD COLUMN job_type TEXT DEFAULT 'single_file';
ALTER TABLE jobs ADD COLUMN external_directory_path TEXT;
ALTER TABLE jobs ADD COLUMN external_job_id TEXT;
ALTER TABLE jobs ADD COLUMN api_token TEXT;

-- Phase 2: 制約追加
-- 注意: CHECK制約は新規レコードのみに適用
-- 既存データの整合性は保証される
```

## 🎯 実装上の考慮事項

### **判別共用体の実装利点**
- **型安全性**: コンパイル時に型エラーを検出
- **網羅性チェック**: 新しいパターン追加時の実装漏れ防止
- **IDE支援**: 自動補完とリファクタリング支援
- **保守性**: パターン別の処理が明確に分離

### **データベース・TypeScript間の整合性**
```typescript
// データベースから取得したデータの変換例
function mapDatabaseToJob(dbRow: any): Job {
  const baseJob = {
    id: dbRow.id,
    name: dbRow.name,
    status: dbRow.status,
    // ... 共通フィールド
  };
  
  switch (dbRow.job_type) {
    case 'single_file':
      return {
        ...baseJob,
        job_type: 'single_file',
        file_id: dbRow.file_id,
      };
    case 'directory':
      return {
        ...baseJob,
        job_type: 'directory',
        external_directory_path: dbRow.external_directory_path,
      };
    case 'external_api':
      return {
        ...baseJob,
        job_type: 'external_api',
        external_job_id: dbRow.external_job_id,
        api_token: dbRow.api_token,
      };
    default:
      throw new Error(`Unknown job type: ${dbRow.job_type}`);
  }
}
```

### **リソース管理統一**
- **CPU・ライセンス**: 全パターンで統一的に管理
- **ノード割り当て**: 全パターンで同じロジック適用
- **実行時間追跡**: 全パターンで同じ監視システム

### **エラーハンドリング**
- **パターン別エラー**: 各パターン固有のエラー処理
- **共通エラー**: ネットワーク・ノード障害の統一処理
- **ログ管理**: 既存の`job_logs`テーブルで統一

### **パフォーマンス影響**
- **インデックス**: `job_type`カラムにインデックス追加推奨
- **クエリ最適化**: パターン別フィルタリングの最適化
- **NULL値処理**: 新規NULLカラムの効率的な処理

## 📋 実装チェックリスト

### **データベース変更**
- [ ] jobsテーブルスキーマ拡張
- [ ] CHECK制約追加
- [ ] インデックス追加
- [ ] 移行テスト実施

### **TypeScript型定義**
- [ ] ベース共通スキーマ定義
- [ ] パターン別スキーマ定義
- [ ] 判別共用体スキーマ作成
- [ ] 型安全性テスト
- [ ] バリデーション関数実装
- [ ] データベース変換関数実装

### **互換性確認**
- [ ] 既存データ整合性確認
- [ ] 既存APIの動作確認
- [ ] 既存UIの動作確認
- [ ] パフォーマンス測定

## 🎯 判別共用体アプローチの総合評価

### **設計の最適化**
1. **RDBMS設計**: 単一テーブルによる効率的なデータ管理
2. **TypeScript設計**: 判別共用体による型安全性の最大化
3. **運用効率**: 20ユーザー規模に最適化されたシンプルな構造

### **実装の利点**
- **型安全性**: コンパイル時エラー検出
- **保守性**: パターン別処理の明確な分離
- **拡張性**: 新しいパターンの追加が容易
- **互換性**: 既存システムとの完全な互換性

### **結論**
このスキーマ拡張により、**データベースレベルでは効率的な単一テーブル管理**を維持しながら、**TypeScriptレベルでは厳密な型安全性**を実現できます。3つのジョブ実行パターンを統一的に管理しながら、既存システムとの互換性を保つことが可能になります。