# Abaqus Job Manager アーキテクチャ設計

## システム構成

**実装状況**: ✅ 完了 - 基本アーキテクチャは実装済み

### 全体アーキテクチャ

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Client    │    │  Job Manager    │    │   Abaqus Node   │
│   (Browser)     │◄──►│    Server       │◄──►│   (SSH/PS)      │
│                 │    │ (React Router)  │    │                 │
│ - Job 一覧表示   │    │ - Job Queue管理  │    │ - Abaqus実行     │
│ - 詳細表示       │    │ - 状態監視       │    │ - ファイル出力   │
│ - ファイル       │    │ - INPファイル    │    │                 │
│   アップロード   │    │   管理          │    │                 │
│ - リアルタイム更新│    │ - SSH接続制御    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │   SQLite Database   │
                    │                     │
                    │ - Job情報            │
                    │ - ユーザー情報       │
                    │ - ファイル管理       │
                    │ - 実行ログ          │
                    └─────────────────────┘
```

**実装状況詳細**:
- ✅ Web Client: TopNavigation, JobTable, 管理画面実装済み
- ✅ Job Manager Server: React Router v7 + Bun 実装済み
- ✅ SQLite Database: 全テーブル実装済み
- 🔄 SSH/PS連携: remote-pwsh ライブラリ完成、Abaqus統合未実装
- ✅ リアルタイム更新: SSE (Server-Sent Events) 実装済み

## コンポーネント設計

### 1. フロントエンド (React Router v7)

#### コンポーネント構成

**実装状況**: ✅ 80%完了 - 主要コンポーネントは実装済み

```
app/
├── routes/
│   ├── _index.tsx           # ジョブ一覧ページ ✅ 完了
│   ├── admin.*.tsx          # 管理画面 ✅ 完了
│   ├── api.events.ts        # SSE エンドポイント ✅ 完了
│   └── test.*.tsx           # テストページ ✅ 完了
├── components/
│   ├── jobs/
│   │   ├── JobTable.tsx     # ジョブ一覧テーブル ✅ 完了
│   │   ├── JobStatusBadge.tsx # ステータス表示 ✅ 完了
│   │   ├── NewJobModal.tsx  # 新規ジョブ作成・INPアップロード ✅ 完了
│   │   ├── EditJobModal.tsx # ジョブ編集 🔄 UI完成、アクション未実装
│   │   ├── DeleteJobDialog.tsx # ジョブ削除 🔄 UI完成、アクション未実装
│   │   └── CancelJobDialog.tsx # ジョブキャンセル 🔄 UI完成、アクション未実装
│   ├── layout/
│   │   ├── MainLayout.tsx   # メインレイアウト ✅ 完了
│   │   └── TopNavigation.tsx # トップナビゲーション ✅ 完了
│   ├── ui/                  # shadcn/ui コンポーネント ✅ 完了
│   │   ├── button.tsx, table.tsx, dialog.tsx など
│   │   └── SystemStatusBar.tsx # システム状態表示 ✅ 完了
│   └── ... (その他UIコンポーネント)
├── hooks/
│   └── useSSE.ts           # SSE接続管理フック ✅ 完了
├── lib/
│   ├── types/database.ts   # エンティティ定義 ✅ 完了
│   ├── services/           # サービス層 ✅ 完了
│   │   ├── remote-pwsh/    # SSH接続・PowerShell実行ライブラリ
│   │   └── scheduler/      # スケジューラーシステム
│   ├── logger/             # ログシステム ✅ 完了
│   └── helpers/            # ユーティリティ ✅ 完了
└── routes/ (旧設計との差分)
    ├── 実際のルート構成は React Router v7 ファイルベース
    ├── APIルートは api.*.ts 形式
    └── 管理画面は admin.*.tsx 形式
```

**実装状況詳細**:
- ✅ 基本ルーティング: React Router v7 ファイルベース実装済み
- ✅ ジョブ管理UI: JobTable, NewJobModal など主要コンポーネント完成
- ✅ 管理画面: Files, Nodes, Users, Settings 管理画面完成
- ✅ レイアウト: MainLayout, TopNavigation 完成
- ✅ SSE リアルタイム更新: useSSE フック完成
- 🔄 ジョブアクション: Edit, Delete, Cancel のアクション処理未実装

#### 状態管理

**実装状況**: ✅ 完了 - 状態管理システム実装済み

- React Router v7のローダー/アクションを活用 ✅ 完了
- **SSE (Server-Sent Events)** によるリアルタイム状態更新 ✅ 完了
- ローカル状態とサーバー状態の同期 ✅ 完了

**実装詳細**:
- ✅ ローダー: ページ単位でのデータ取得実装済み
- ✅ アクション: フォーム処理・API呼び出し実装済み
- ✅ useSSE フック: チャンネル別リアルタイム更新実装済み
- ✅ 型安全性: Zod による実行時型検証実装済み

### 2. バックエンド (React Router v7 Framework Mode)

#### API エンドポイント設計

**実装状況**: ✅ 70%完了 - 主要APIは実装済み

React Router v7のAPI routesを使用したフレームワークモード実装

```
# 実装済みAPI Routes
GET    /api/events            # SSE エンドポイント ✅ 完了
GET    /api/scheduler-status  # スケジューラー状態取得 ✅ 完了
GET    /api/test-events       # テスト用SSE ✅ 完了

# ローダー/アクション (各ページ内)
_index.tsx:
  - loader: ジョブ一覧取得 ✅ 完了
  - action: 新規ジョブ作成 ✅ 完了

admin.files.tsx:
  - loader: ファイル一覧取得 ✅ 完了
  - action: ファイル削除 ✅ 完了

admin.nodes.tsx:
  - loader: ノード一覧取得 ✅ 完了
  - action: ノード作成・更新 🔄 一部実装

admin.users.tsx:
  - loader: ユーザー一覧取得 ✅ 完了
  - action: ユーザー管理 🔄 未実装

# 未実装API
PUT    /api/jobs/:id/priority # ジョブ優先度変更 📋 未実装
DELETE /api/jobs/:id          # ジョブ削除 📋 未実装
GET    /api/jobs/:id/files/:type  # Abaqusファイル取得 📋 未実装
```

**実装詳細**:
- ✅ SSE: Server-Sent Events による リアルタイム更新実装済み
- ✅ 型安全性: TypedRouteHandler による API型安全性実装済み
- ✅ エラーハンドリング: 統一APIResult型パターン実装済み
- 🔄 ジョブアクション: Edit, Delete, Priority 変更API未実装

#### サービス層構成

**実装状況**: ✅ 85%完了 - サービス層は実装済み

```
app/lib/
├── types/
│   ├── database.ts          # エンティティ定義 (正定義) ✅ 完了
│   └── api-routes.ts        # API型安全性 ✅ 完了
├── services/
│   ├── remote-pwsh/         # SSH接続・PowerShell実行ライブラリ ✅ 完了
│   │   ├── executor.ts      # メイン実行エンジン
│   │   ├── types.ts         # TypeScript型定義
│   │   ├── events.ts        # イベント管理システム
│   │   └── process.ts       # プロセス制御
│   └── scheduler/           # スケジューラーシステム ✅ 完了
│       ├── base-scheduler.ts # 基底スケジューラー
│       ├── interval-scheduler.ts # インターバルスケジューラー
│       └── health-check-scheduler.ts # ヘルスチェック
├── logger/                  # ログシステム ✅ 完了
│   ├── logger.ts            # LogTape ログシステム
│   └── config.ts            # ログ設定
├── helpers/                 # ユーティリティ ✅ 完了
│   └── utils.ts             # 共通ユーティリティ
├── license-config.ts        # ライセンス計算 ✅ 完了
└── node-health-check.ts     # ノード監視 ✅ 完了
```

**実装詳細**:
- ✅ remote-pwsh: SSH接続による PowerShell 実行ライブラリ完成
- ✅ scheduler: BaseScheduler, IntervalScheduler 実装済み
- ✅ logger: LogTape による構造化ログシステム完成
- ✅ license-config: Abaqus ライセンス計算機能完成
- 🔄 Abaqus統合: remote-pwsh を使った Abaqus 実行制御未実装
- ✅ SSE: リアルタイム更新は SSE で実装済み

### 3. データベース設計 (SQLite with bun:sqlite)

#### テーブル構成

**実装状況**: ✅ 完了 - 全テーブル実装済み

**実際の実装 (SQLite with bun:sqlite)**

**参照先**: `/app/app/lib/types/database.ts`

データベースエンティティの定義（Zodスキーマ + TypeScript型）:
- **Jobs**: ジョブ情報（ステータス、ノード、CPU数、優先度など）
- **Nodes**: 実行ノード情報（名前、ホスト、SSH設定、CPU数など）
- **Users**: ユーザー情報（表示名、同時実行数制限など）
- **FileRecords**: アップロードファイル管理（INPファイル等）
- **JobLogs**: ジョブ実行ログ管理

**参照先**: `/app/scripts/init-database.ts`

実際のSQLiteテーブル作成スクリプト。データベース初期化時に実行され、外部キー制約やインデックスを含む完全なスキーマを作成します。

**実装詳細**:
- ✅ 型安全性: `/app/app/lib/types/database.ts` で Zod スキーマ定義済み
- ✅ 外部キー制約: jobs.file_id → file_records.id, jobs.user_id → users.id
- ✅ データベース操作: bun:sqlite による型安全なクエリ実装済み
- ✅ マイグレーション: 初期テーブル作成スクリプト実装済み

## 技術的詳細

### 1. React Router v7 Framework Mode設定

**実装状況**: ✅ 完了 - Framework Mode 実装済み

#### 実装詳細

**参照先**: `/app/react-router.config.ts`

React Router v7のFramework Mode設定ファイル。SSR有効化、開発サーバー設定、Future flagsの設定が含まれています。

**実装詳細**:
- ✅ Bun ランタイム: package.json で bun 使用設定済み
- ✅ TailwindCSS: 統合設定済み
- ✅ TypeScript: 完全対応
- ✅ SSR: サーバーサイドレンダリング有効化済み

### 2. SQLite Database Setup

**実装状況**: ✅ 完了 - データベース基盤実装済み

#### 実装詳細

**参照先**: 
- `/app/app/lib/types/database.ts` - エンティティスキーマ定義
- `/app/app/lib/services/database-service.ts` - データベース接続とクエリ実行
- `/app/scripts/init-database.ts` - データベース初期化スクリプト

bun:sqlite を使用した型安全なデータベース接続、Zod による実行時型検証、外部キー制約による参照整合性の実装が含まれています。

**実装詳細**:
- ✅ 型安全性: Zod スキーマによる実行時検証実装済み
- ✅ 外部キー制約: FOREIGN KEY による参照整合性実装済み
- ✅ トランザクション: 必要に応じて実装可能
- ✅ マイグレーション: 段階的なテーブル作成実装済み

### 3. File Upload Management

**実装状況**: ✅ 完了 - ファイルアップロード機能実装済み

**実装詳細**:
- ✅ NewJobModal: INPファイルアップロード機能完成
- ✅ File validation: ファイル形式・サイズ検証実装済み
- ✅ Storage: ./uploads/ ディレクトリでのファイル保存実装済み
- ✅ Database integration: file_records テーブルでのメタデータ管理実装済み
- ✅ UI integration: ドラッグ&ドロップ対応のファイルアップロードUI実装済み

**実際の実装場所**:
- NewJobModal.tsx: ファイルアップロードUI
- _index.tsx action: ファイル保存処理
- file_records テーブル: ファイルメタデータ管理

### 4. ジョブスケジューリング（実行計画）

**実装状況**: 🔄 一部実装 - スケジューラー基盤は完成、Abaqus統合は未実装

**実装詳細**:
- ✅ BaseScheduler: 基底スケジューラーライブラリ実装済み
- ✅ IntervalScheduler: 定期実行スケジューラー実装済み
- ✅ HealthCheckScheduler: ノード監視スケジューラー実装済み
- ✅ Scheduler統合: サーバー起動時のスケジューラー統合実装済み
- 🔄 Abaqus統合: remote-pwsh を使ったAbaqus実行制御未実装
- 📋 リソース管理: CPU・ライセンス使用量監視未実装

### 5. Abaqus実行制御

**実装状況**: 🔄 一部実装 - remote-pwsh 基盤は完成、Abaqus統合は未実装

**実装詳細**:
- ✅ remote-pwsh: SSH接続による PowerShell 実行ライブラリ完成
- ✅ イベントシステム: stdout/stderr のリアルタイム取得実装済み
- ✅ プロセス制御: 非同期実行・エラーハンドリング実装済み
- 🔄 Abaqus統合: remote-pwsh を使った Abaqus 固有の実行制御未実装
- 📋 ファイル監視: Abaqus結果ファイル収集未実装

**実際の実装場所**:
- `/app/app/lib/services/remote-pwsh/` - SSH実行ライブラリ

### 6. リアルタイム更新

**実装状況**: ✅ 完了 - SSE による リアルタイム更新実装済み

**実装詳細**:
- ✅ SSE: Server-Sent Events による効率的なリアルタイム更新実装済み
- ✅ useSSE フック: 型安全なチャンネル別更新システム実装済み
- ✅ 自動再接続: 接続切断時の自動復旧機能実装済み
- ✅ 型安全性: Zod による イベントデータ検証実装済み
- ✅ SSE: より軽量な SSE で実装済み

**実際の実装場所**:
- `/app/app/routes/api.events.ts` - SSE エンドポイント
- `/app/app/hooks/useSSE.ts` - SSE クライアントフック

### 7. セキュリティ考慮事項

**実装状況**: 🔄 一部実装 - 基本的なセキュリティ機能は実装済み

**実装詳細**:
- ✅ 管理者認証: Bearer token による管理画面アクセス制御実装済み
- ✅ ファイル検証: アップロードファイルの形式・サイズ検証実装済み
- ✅ SQL injection防止: パラメータ化クエリ実装済み
- ✅ XSS防止: React による自動エスケープ
- 🔄 SSH認証: 公開鍵認証の基盤はあるが、鍵管理システム未実装
- 📋 一般ユーザー認証: 未実装
- 📋 ファイルアクセス制御: 詳細な権限管理未実装

## 拡張性考慮事項

### 1. スケーラビリティ

**実装状況**: 🔄 一部実装 - 基本的なスケーラビリティは考慮済み

**実装詳細**:
- ✅ 複数ノード対応: SSH接続による複数マシン対応実装済み
- ✅ ジョブキューの永続化: SQLite による永続化実装済み
- ✅ 型安全性: スケーラブルな型システム実装済み
- 🔄 負荷分散: 基本的なノード選択機能はあるが、高度な負荷分散は未実装
- 📋 データベース接続プール: bun:sqlite では単一接続のため不要
- 📋 水平スケーリング: 現在は単一サーバー構成

### 2. 監視・ログ

**実装状況**: ✅ 完了 - 監視・ログシステム実装済み

**実装詳細**:
- ✅ 構造化ログ: LogTape による構造化ログシステム実装済み
- ✅ ジョブログ: job_logs テーブルによるジョブ実行ログ保存実装済み
- ✅ ノード監視: HealthCheckScheduler による自動監視実装済み
- ✅ エラー追跡: try-catch による統一エラーハンドリング実装済み
- ✅ システム状態: SystemStatusBar による状態表示実装済み
- 🔄 メトリクス: 基本的な統計情報は取得可能、高度なメトリクスは未実装

### 3. 運用・保守

**実装状況**: ✅ 75%完了 - 基本的な運用機能は実装済み

**実装詳細**:
- ✅ 環境変数管理: `.env` ファイルによる設定管理実装済み
- ✅ 設定管理: 環境別設定システム実装済み
- ✅ データベース初期化: 自動テーブル作成実装済み
- ✅ 管理画面: Files, Nodes, Users 管理機能実装済み
- ✅ ログ管理: 環境別ログレベル設定実装済み
- 🔄 マイグレーション: 基本的な仕組みはあるが、バージョン管理は未実装
- 📋 自動バックアップ: 未実装
- 📋 デプロイメント: 手動デプロイのみ

**実際の実装場所**:
- `/app/app/lib/logger/` - ログシステム
- `/app/app/routes/admin.*` - 管理画面
- `/app/.env.*` - 環境設定