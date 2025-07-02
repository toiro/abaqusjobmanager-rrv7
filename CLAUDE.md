# Abaqus Job Manager

BunランタイムでAbaqusジョブの管理と環境変数の表示を行うReact Router v7 Webアプリケーション。

## 🚨 重要な開発方針・注意事項

### **開発プロセス**
- **実際に作業を行う前に作業方針を立て、ユーザーに確認すること**
- **ユーザーからの指示や仕様に疑問や不足点があれば作業を中断し、質問すること**
- **コードエクセレンス原則に基づきテスト駆動開発を必須で実施すること**
- **TDD及びテスト駆動開発についてはすべて t-wada の推奨に従うこと**
- **リファクタリングは Martin Fowler の推奨に従うこと**

### **技術制約・ルール**
- **React Router v7によるファイルベースルーティングを使用**
- **データ取得にサーバーとクライアントの両方のローダーを実装**
- **Zodスキーマによる実行時型検証とTypeScriptコンパイル時検証の両立**
- **モダンなJavaScript機能を使用したBunランタイム向けに構築**

### **🎯 エンティティ定義の正定義 (Single Source of Truth)**

**重要: `/app/app/lib/types/database.ts` が全エンティティの正定義**

**すべてのJob、Node、User、FileRecord、JobLogの型定義はこのファイルから参照すること。**

#### **正定義の原則**
1. **データベーススキーマが真実の源泉** - 実際のSQLiteテーブル構造に完全準拠
2. **Zodスキーマ + TypeScript型** - 実行時検証とコンパイル時検証の両方を提供
3. **統一インポート** - 他のファイルでのエンティティ定義禁止

#### **正定義ファイル構造**
```
/app/app/lib/types/database.ts  <- 🎯 正定義 (Single Source of Truth)
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
import { Job, Node, User, JobSchema, NodeSchema } from "~/lib/types/database";

// ❌ 間違い - 散らばった定義から参照  
import { Job } from "~/lib/dbOperations";
```

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

### **作業記録**

`docs/dev-log/yyyy-mm-dd_hhmm.md` の形式で作業記録を作成してください。内容は以下です。

- **日付**: yyyy-mm-dd hh:mm
- **作業内容**:
  - 何をしたか
  - どのような問題が発生したか
  - どのように解決したか
- **次にすべき作業**:

**所感**: 開発の進捗や学び
**愚痴**: 適当に吐き出す

---

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
│   ├── database.ts    # SQLite接続管理
│   ├── dbOperations.ts# データベース操作
│   ├── messages.ts    # 英語メッセージ定数
│   ├── utils.ts       # ユーティリティ関数
│   ├── sse.ts         # SSEイベント発信機能
│   ├── sse-schemas.ts # SSEイベントのZodスキーマ定義
│   ├── logger.ts      # 構造化ログシステム
│   ├── auth.ts        # Bearer認証システム
│   ├── licenseCalculator.ts # Abaqusライセンス計算
│   ├── types/         # 型定義ライブラリ
│   │   ├── database.ts# エンティティ定義 (正定義)
│   │   └── api-routes.ts # API型安全性
│   ├── remote-pwsh/   # リモートPowerShell実行ライブラリ
│   │   ├── index.ts   # エクスポート統合
│   │   ├── types.ts   # TypeScript型定義
│   │   ├── executor.ts# メイン実行エンジン
│   │   ├── events.ts  # イベント管理システム
│   │   ├── process.ts # プロセス制御
│   │   └── environment.ts # 環境設定
│   ├── __tests__/     # テストファイル
│   │   └── sse-schemas.test.ts # SSEスキーマのテスト
│   └── __examples__/  # 使用例
│       └── sse-usage.ts # SSE使用例とベストプラクティス
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

### 完了済み (Phase 1-2.5)

#### **Phase 1: プロジェクト基盤** ✅ 100%完了
- ✅ プロジェクト基盤構築 (React Router v7 + Bun)
- ✅ データベース基盤 (SQLite + CRUD操作)
- ✅ 英語メッセージシステム
- ✅ 基本UIコンポーネント (shadcn/ui)
- ✅ エラー・メッセージ表示システム
- ✅ ライセンス計算システム
- ✅ ログシステム (環境別・レベル別)

#### **Phase 2: Webインターフェース基盤** ✅ 95%完了
- ✅ TopNavigationコンポーネント (Jobs・Admin統合ナビ)
- ✅ MainLayoutコンポーネント (SystemStatusBar統合)
- ✅ JobTableコンポーネント (完全機能実装)
- ✅ SystemStatusBar (SSE接続・ライセンス状態表示)

#### **Phase 3: ジョブ管理機能** ✅ 70%完了
- ✅ NewJobModal (ファイルアップロード・検証・作成)
- ✅ ジョブ作成機能 (INPファイル処理・DB保存・SSE送信)
- 🔄 ジョブ編集・削除・キャンセル機能 (UI完成・アクション未実装)

#### **Phase 4: システム管理画面** ✅ 80%完了
- ✅ Admin認証システム (Bearer token・環境変数)
- ✅ AdminLayoutコンポーネント (サイドバーナビ)
- ✅ Files管理画面 (一覧・削除・統計・リアルタイム更新)
- ✅ Settings管理画面 (環境設定表示)
- 🔄 Nodes管理画面 (一覧表示完成・作成編集UI未完成)
- 🔄 Users管理画面 (基本表示のみ)

#### **Phase 5: リアルタイム通信** ✅ 100%完了
- ✅ SSE (Server-Sent Events) システム
- ✅ useSSEフック (型安全・自動再接続・チャンネル別)
- ✅ 型検証システム (Zod・discriminated union・exhaustive check)
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

### 進行中 (Phase 3-4の残り)
- 🔄 **ジョブアクション機能**
  - ジョブ編集モーダル・バリデーション
  - ジョブ削除確認・実行
  - ジョブキャンセル機能
- 🔄 **管理画面完成**
  - Nodes作成・編集・削除機能
  - Users詳細管理機能

### 今後の予定
- Phase 7: Abaqus実行制御 (既存remote-pwshライブラリ活用)
- Phase 8: 高度な監視・アラート機能
- Phase 9: パフォーマンス最適化・スケーリング

## リモート実行システム

### 既存remote-pwshライブラリ ✅ 実装済み
- **場所**: `/app/app/lib/remote-pwsh/`
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

### Abaqus統合実装計画
- 🔄 **AbaqusJobRunner実装**
  - remote-pwshラッパークラス
  - Abaqus固有のコマンド生成
  - ジョブステータス解析
- 🔄 **リアルタイム実行監視**
  - SSEによるジョブ進捗配信
  - ログ出力のリアルタイム表示
  - エラー検出・アラート機能
- 📋 **イベントシステム統合**
  - JobExecutionEmitterによるバックエンド処理管理
  - SSEEventEmitterとの連携システム
  - 詳細: [event-system-architecture.md](docs/event-system-architecture.md)