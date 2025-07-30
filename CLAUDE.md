# Abaqus Job Manager

BunランタイムでAbaqusジョブの管理と環境変数の表示を行うReact Router v7 Webアプリケーション。
ユーザー数20人程度のLAN内で利用する小規模な用途を想定する。

## 🚨 重要な開発方針・注意事項

### **開発プロセス**
- **SOLID, KISS, YAGNI, DRY 原則に従うこと**
- **後方互換性を考慮しないこと**
- **関数で済むことにClassを作成しないこと**
- **ラッパーやエイリアスなどの抽象化レイヤーを作る際には作業を中断し、確認すること**
- **ユーザーからの指示や仕様に疑問や不足点があれば作業を中断し、質問すること**
- **コードエクセレンス原則に基づきテスト駆動開発を必須で実施すること**
- **TDD及びテスト駆動開発についてはすべて t-wada の推奨に従うこと**
- **リファクタリングは Martin Fowler の推奨に従うこと**

### **技術制約・ルール**
- **React Router v7によるファイルベースルーティングを使用**
- **データ取得にサーバーとクライアントの両方のローダーを実装**
- **Zodスキーマによる実行時型検証とTypeScriptコンパイル時検証の両立**
- **モダンなJavaScript機能を使用したBunランタイム向けに構築**
- **requre インポートの禁止**

### **📁 ファイル命名規則**
プロジェクト全体でファイル命名をケバブケース（kebab-case）に統一する：

#### **適用範囲**
- TypeScriptファイル（`.ts`, `.tsx`）
- テストファイル（`.test.ts`, `.spec.ts`）
- 設定ファイル
- ドキュメントファイル（`.md`）

#### **PowerShellスクリプト命名規則**
PowerShellスクリプトファイル（`.ps1`）は**キャメルケース**を使用する：

```
✅ 正しい命名（キャメルケース）
- executeAbaqus.ps1
- sendDirectory.ps1
- receiveDirectory.ps1
- sshRemoteSession.ps1
- getJobStatus.ps1
- cleanupWorkspace.ps1

❌ 間違った命名（ケバブケース・スネークケース）
- execute-abaqus.ps1
- send-directory.ps1
- execute_abaqus.ps1
- send_directory.ps1
```

#### **命名パターン**
```
✅ 正しい命名（ケバブケース）
- base-scheduler.ts
- interval-scheduler.ts
- health-check-scheduler.ts
- sse-cleanup-scheduler.ts
- scheduler-system.ts

❌ 間違った命名（キャメルケース・スネークケース）
- baseScheduler.ts
- intervalScheduler.ts
- healthCheckScheduler.ts
- base_scheduler.ts
- scheduler_system.ts
```

#### **例外**
- **PowerShellスクリプト（`.ps1`）はキャメルケース**を使用

### **🎯 エンティティ定義の正定義 (Single Source of Truth)**

**重要: `/app/app/lib/core/types/database.ts` が全エンティティの正定義**

**すべてのJob、Node、User、FileRecord、JobLogの型定義はこのファイルから参照すること。**

#### **正定義の原則**
1. **データベーススキーマが真実の源泉** - 実際のSQLiteテーブル構造に完全準拠
2. **Zodスキーマ + TypeScript型** - 実行時検証とコンパイル時検証の両方を提供
3. **統一インポート** - 他のファイルでのエンティティ定義禁止

#### **正定義ファイル構造**
```
/app/app/lib/core/types/database.ts  <- 🎯 正定義 (Single Source of Truth)
├── JobSchema + Job type        (ジョブ管理)
├── NodeSchema + Node type      (実行ノード)  
├── UserSchema + User type      (ユーザー管理)
├── FileRecordSchema + FileRecord type (ファイル管理)
└── JobLogSchema + JobLog type  (ログ管理)
```

#### **適切なoptional/default使用規則**
- **自動生成フィールド** → `.optional()` (id, created_at, updated_at)
- **NULL可能フィールド** → `.nullable().optional()` (node_id, start_time等)
- **デフォルト値あり** → `.default(value)` (priority='normal', ssh_port=22等)
- **必須フィールド** → 修飾なし (name, status, file_id等)

#### **禁止事項**
- ❌ `dbOperations.ts`でのエンティティinterface定義
- ❌ `sse-schemas.ts`での独自エンティティ定義
- ❌ 他ファイルでの重複型定義
- ❌ データベーススキーマと不整合な定義

#### **インポート例**
```typescript
// ✅ 正しい - 正定義から参照
import { Job, Node, User, JobSchema, NodeSchema } from "~/lib/core/types/database";

// ❌ 間違い - 散らばった定義から参照  
import { Job } from "~/lib/dbOperations";
```

### serena MCP使用ルール

execute_shell_command は readonly な操作に対しては使用しない。

### Playwright MCP使用ルール

#### 絶対的な禁止事項

1. **いかなる形式のコード実行も禁止**

   - Python、JavaScript、Bash等でのブラウザ操作
   - MCPツールを調査するためのコード実行
   - subprocessやコマンド実行によるアプローチ

2. **利用可能なのはMCPツールの直接呼び出しのみ**

   - playwright:browser_navigate
   - playwright:browser_screenshot
   - 他のPlaywright MCPツール

3. **エラー時は即座に報告**
   - 回避策を探さない
   - 代替手段を実行しない
   - エラーメッセージをそのまま伝える

### **コード品質原則**

**重要**: プロジェクトのコード品質向上のため、以下の原則に従ってください。

**詳細**: [コード品質原則](/docs/code-quality-principles.md)

#### **最重要原則: 可読性優先**
- **可読性 > 行数・使用回数**: たとえ1行でも低レイヤー処理がむき出しなら抽象化
- **意図の明確性**: 処理の意図が関数名から明確に分かること
- **抽象化レベル統一**: 同じ関数内では同じレベルの抽象化を保つ
- **低レイヤー隠蔽**: 正規表現・文字列操作・日付操作・数値計算は必ず抽象化

#### **YAGNI判断基準**
1. **可読性**: 意図が明確か？（最優先）
2. **抽象化レベル**: 統一されているか？
3. **再利用性**: 複数箇所で使用するか？
4. **行数**: 可読性が確保されていれば関係なし

```typescript
// ✅ 1行でも抽象化の価値
const formatJobId = (id?: number) => id ? `#${id.toString().padStart(4, '0')}` : '-';

// ❌ 低レイヤー処理がむき出し  
const jobId = id ? `#${id.toString().padStart(4, '0')}` : '-';
```

## 技術スタック

- **ランタイム**: Bun
- **フレームワーク**: React Router v7 (フレームワークモード)
- **データベース**: SQLite3 (bun:sqlite)
- **スタイリング**: TailwindCSS + shadcn/ui
- **UIライブラリ**: shadcn/ui (モダン・ミニマルデザイン)
- **TypeScript**: 完全なTypeScriptサポート
- **ビルドツール**: Vite
- **ファイル管理**: INPファイルアップロード対応
- **リアルタイム通信**: Server-Sent Events (SSE)
- **型検証**: Zod (実行時型検証)

## 開発コマンド

```bash
# 開発サーバー起動
bun run dev

# 本番用ビルド
bun run build

# 本番サーバー起動
bun run start

# フォーマット実行
bun run format

# リント実行
bun run lint

# 型チェック
bun run typecheck
```

## プロジェクト構造

```
app/
├── components/         # 再利用可能なUIコンポーネント
│   ├── ui/            # 基本UIコンポーネント (shadcn/ui)
│   │   ├── button.tsx # ボタンコンポーネント
│   │   ├── badge.tsx  # ステータスバッジ
│   │   ├── table.tsx  # テーブルコンポーネント
│   │   ├── input.tsx  # 入力フィールド
│   │   ├── alert.tsx  # アラート表示
│   │   ├── message.tsx# メッセージ表示
│   │   └── ...        # その他のUIコンポーネント
│   ├── layout/        # レイアウトコンポーネント
│   │   ├── TopNavigation.tsx # トップナビゲーション
│   │   └── MainLayout.tsx    # メインレイアウト
│   ├── jobs/          # ジョブ関連コンポーネント
│   │   ├── JobTable.tsx      # ジョブテーブル
│   │   └── JobStatusBadge.tsx # ジョブステータス表示
│   └── input.tsx      # レガシー入力コンポーネント
├── lib/               # ライブラリとユーティリティ
│   ├── messages.ts    # 英語メッセージ定数
│   ├── core/          # コアライブラリ
│   │   ├── database/  # データベース操作
│   │   │   ├── connection.server.ts # SQLite接続管理
│   │   │   ├── base-repository.ts   # ベースリポジトリ
│   │   │   ├── *-repository.ts      # 各エンティティリポジトリ
│   │   │   └── db-utils.ts          # DB操作ユーティリティ
│   │   ├── logger/    # ログシステム
│   │   │   ├── logger.server.ts     # ログ取得
│   │   │   └── config.ts            # ログ設定
│   │   ├── env/       # 環境変数管理
│   │   │   └── env.ts # 環境変数スキーマ
│   │   └── types/     # 型定義ライブラリ
│   │       ├── database.ts    # エンティティ定義 (正定義)
│   │       └── api-routes.ts  # API型安全性
│   ├── services/      # ビジネスロジック
│   │   ├── auth/      # 認証システム
│   │   ├── sse/       # SSEシステム
│   │   ├── license/   # ライセンス管理
│   │   ├── node-health/ # ノードヘルスチェック
│   │   └── abaqus/    # Abaqus実行制御
│   ├── helpers/       # ヘルパー関数
│   │   ├── api-helpers.ts # API処理ヘルパー
│   │   └── utils.ts       # 共通ユーティリティ
│   ├── middleware/    # ミドルウェア
│   │   └── http-logger.ts # HTTPログ
│   ├── __tests__/     # テストファイル
│   └── __examples__/  # 使用例
├── server/            # サーバーサイドライブラリ
│   ├── controller/    # サーバー制御
│   └── lib/           # サーバーライブラリ
│       ├── remote-pwsh/ # リモートPowerShell実行ライブラリ
│       │   ├── executor.ts    # メイン実行エンジン
│       │   ├── types.ts       # TypeScript型定義
│       │   ├── events.ts      # イベント管理システム
│       │   ├── process.ts     # プロセス制御
│       │   └── node-executor.ts # ノード実行ユーティリティ
│       └── scheduler/ # スケジューラーシステム
├── hooks/             # Reactカスタムフック
│   └── useSSE.ts      # SSE接続管理フック
├── routes/            # ファイルベースルーティング
│   ├── _index.tsx     # ジョブ一覧 (初期画面)
│   ├── admin.*.tsx    # 管理画面系ルート
│   ├── api.events.ts  # SSEエンドポイント
│   └── test-ui.tsx    # UIコンポーネントテスト
├── styles/            # グローバルスタイル
│   └── tailwind.css   # TailwindCSSインポート
├── entry.server.tsx   # サーバーエントリーポイント
├── root.tsx          # ルートレイアウトコンポーネント
├── routes.ts         # ルート設定
└── server.ts         # サーバー設定
```

## 主な機能

- **Abaqusジョブ管理**
  - ジョブ一覧表示（初期画面）
  - ジョブ作成・編集・削除
  - リアルタイムステータス更新

- **ファイル管理**
  - INPファイルのアップロード・管理
  - ファイル検証とエラーハンドリング
  - 結果ファイルのダウンロード

- **システム管理**
  - ユーザー管理（作成・編集・削除）
  - ノード管理（追加・設定・監視）

- **UI/UX**
  - トップナビゲーション方式
  - テーブル中心のデータ表示
  - shadcn/uiによるモダン・ミニマルデザイン
  - レスポンシブ対応
  - 英語UIメッセージシステム

## ドキュメント

プロジェクトの詳細な仕様とアーキテクチャは `docs/` フォルダ内のマークダウンファイルに記載されています：

### 基本仕様
- [requirements.md](docs/requirements.md) - 機能要件と非機能要件の詳細（ユーザー指定ノード + ライセンス管理対応）
- [architecture.md](docs/architecture.md) - システムアーキテクチャとコンポーネント設計 (React Router v7 + SQLite対応)
- [api-specification.md](docs/api-specification.md) - REST API及びWebSocket APIの仕様

### 詳細仕様
- [job-scheduling.md](docs/job-scheduling.md) - ジョブスケジューリングとノード管理の詳細仕様（ユーザー指定ノード対応）
- [license-management.md](docs/license-management.md) - Abaqusライセンストークン管理とCPU-ライセンス計算関数
- [technical-specifications.md](docs/technical-specifications.md) - SSH接続、ファイル管理、WebSocket実装の技術詳細
- [user-workflow.md](docs/user-workflow.md) - ユーザーワークフローとノード選択ガイド（英語UI対応）

### 実装・運用
- [implementation-guide.md](docs/implementation-guide.md) - 実装手順とガイドライン
- [implementation-roadmap.md](docs/implementation-roadmap.md) - 段階的実装ロードマップ（Phase 1-10）
- [ui-implementation-guidelines.md](docs/ui-implementation-guidelines.md) - UI実装ガイドライン（shadcn/ui + TailwindCSS）
- [deployment-operations.md](docs/deployment-operations.md) - デプロイメント、監視、障害対応の運用仕様

### システム設計・アーキテクチャ
- [event-system-architecture.md](docs/event-system-architecture.md) - イベントシステム設計方針とEventEmitter実装戦略

## 開発状況

### 完了済み (Phase 1-6)

#### **Phase 1: プロジェクト基盤** ✅ 100%完了
- ✅ プロジェクト基盤構築 (React Router v7 + Bun)
- ✅ データベース基盤 (SQLite + CRUD操作)
- ✅ 英語メッセージシステム
- ✅ 基本UIコンポーネント (shadcn/ui)
- ✅ エラー・メッセージ表示システム
- ✅ ライセンス計算システム
- ✅ ログシステム (環境別・レベル別)

#### **Phase 2: Webインターフェース基盤** ✅ 100%完了
- ✅ TopNavigationコンポーネント (Jobs・Admin統合ナビ)
- ✅ MainLayoutコンポーネント (SystemStatusBar統合)
- ✅ JobTableコンポーネント (完全機能実装)
- ✅ SystemStatusBar (SSE接続・ライセンス状態表示)

#### **Phase 3: ジョブ管理機能** ✅ 85%完了
- ✅ NewJobModal (ファイルアップロード・検証・作成)
- ✅ ジョブ作成機能 (INPファイル処理・DB保存・SSE送信)
- ✅ ジョブ編集・削除・キャンセル機能 (UI完成・基本アクション実装)
- 🔄 ジョブ実行エンジン (未実装・最重要)

#### **Phase 4: システム管理画面** ✅ 90%完了
- ✅ Admin認証システム (Bearer token・環境変数)
- ✅ AdminLayoutコンポーネント (サイドバーナビ)
- ✅ Files管理画面 (一覧・削除・統計・リアルタイム更新)
- ✅ Settings管理画面 (環境設定表示)
- ✅ Nodes管理画面 (一覧表示・基本CRUD)
- ✅ Users管理画面 (基本CRUD完成)
- 🔄 物理ファイル削除機能 (TODO: admin.files.tsx:71)

#### **Phase 5: リアルタイム通信** ✅ 100%完了
- ✅ SSE (Server-Sent Events) システム
- ✅ useSSEフック (型安全・自動再接続・チャンネル別)
- ✅ 型検証システム (Zod・discriminated union・exhaustive check)
- ✅ リアルタイムライセンス更新システム
- ✅ リアルタイムファイル更新 (Files管理画面)

#### **Phase 6: 型安全性強化** ✅ 100%完了
- ✅ データベース操作完全型安全化
  - BaseRepository + Generics実装
  - 型アサーション除去・SQLiteバインド型安全性
  - 統一エラーハンドリング・構造化ログ
- ✅ SSE システム型安全化
  - Channel-Event型マッピング
  - useSSEフック型制約強化
  - 型安全イベント作成ヘルパー
- ✅ remote-pwsh ライブラリ型安全化
  - TypedExecutor + Result Pattern
  - Abaqus専用型定義・エラー型
  - 型安全実行結果処理
- ✅ API Routes 型安全化
  - TypedRouteHandler + 検証システム実装
  - 型安全レスポンスビルダー (`createSuccessResponse`, `createErrorResponse`)
  - 統一APIResult型パターン実装
  - 実際のルートへの適用完了 (`_index.tsx`, `admin.files.tsx`)

### 🚨 重要な未実装機能 (Phase 7: 最優先)

#### **Phase 7: Abaqus実行制御** 📋 **未実装・最重要**
- 📋 **AbaqusJobExecutor** - コア実行エンジン
  - remote-pwshラッパークラス
  - Abaqus固有のコマンド生成
  - ジョブステータス解析
- 📋 **ファイル転送サービス**
  - SFTP/SCP実装でノード間ファイル移動
  - INPファイル配布・結果ファイル収集
- 📋 **リアルタイム実行監視**
  - SSEによるジョブ進捗配信
  - ログ出力のリアルタイム表示
  - エラー検出・アラート機能
- 📋 **ジョブスケジューラー**
  - キュー処理・優先度管理
  - リソース制約チェック
  - 自動実行システム

#### **影響**: 現在は「ジョブ管理UI」であり、実際のAbaqusジョブ実行ができない状態

### 次に実装すべき機能 (Phase 8-9)

#### **Phase 8: 機能完成** 🔄 **部分実装**
- 🔄 **ジョブ詳細表示** - Abaqus出力ファイル（.sta, .dat, .log）表示
- 🔄 **リソース管理強化** - リアルタイムCPU・ライセンス監視
- 🔄 **ユーザー認証** - 一般ユーザーアクセス制御
- 🔄 **設定管理** - 環境設定変更インターフェース

#### **Phase 9: 本番運用対応** 📋 **計画中**
- 📋 **エラー回復システム** - Abaqus固有エラー処理
- 📋 **パフォーマンス最適化** - 大量ジョブ処理
- 📋 **監視・アラート** - 高度な監視機能
- 📋 **セキュリティ強化** - 本番環境セキュリティ

## リモート実行システム

### 既存remote-pwshライブラリ ✅ 実装済み
- **場所**: `/app/app/server/lib/remote-pwsh/`
- **機能**: 
  - SSH接続によるリモートPowerShell実行
  - イベントベースの非同期処理
  - stdout/stderr のリアルタイム取得
  - TypeScript対応の型安全実装
- **主要モジュール**:
  - `executor.ts`: メイン実行エンジン
  - `types.ts`: TypeScript型定義
  - `events.ts`: イベント管理システム
  - `process.ts`: プロセス制御
  - `environment.ts`: 環境設定

### Abaqus統合実装計画 (Phase 7で実装予定)
- 📋 **AbaqusJobExecutor実装** - 未実装・最重要
  - remote-pwshラッパークラス
  - Abaqus固有のコマンド生成
  - ジョブステータス解析
- 📋 **リアルタイム実行監視** - 未実装
  - SSEによるジョブ進捗配信
  - ログ出力のリアルタイム表示
  - エラー検出・アラート機能
- 📋 **イベントシステム統合** - 未実装
  - JobExecutionEmitterによるバックエンド処理管理
  - SSEEventEmitterとの連携システム
  - 詳細: [event-system-architecture.md](docs/event-system-architecture.md)

### 現在の制約事項
- ✅ **UI・管理機能**: 完全動作 (ジョブ作成・編集・削除・ファイル管理)
- ✅ **データベース**: 完全実装 (全CRUD操作・型安全)
- ✅ **リアルタイム更新**: 完全実装 (SSE・ライセンス監視)
- ❌ **ジョブ実行**: 未実装 (Abaqusコマンド実行不可)
- ❌ **ファイル転送**: 未実装 (ノード間ファイル移動不可)
- ❌ **進捗監視**: 未実装 (実行中ジョブ状態追跡不可)

**現在の状態**: "高機能なジョブ管理UI" (実際のAbaqus実行は不可)