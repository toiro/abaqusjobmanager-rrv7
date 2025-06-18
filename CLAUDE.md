# Abaqus Job Manager

BunランタイムでAbaqusジョブの管理と環境変数の表示を行うReact Router v7 Webアプリケーション。

## 技術スタック

- **ランタイム**: Bun
- **フレームワーク**: React Router v7 (旧Remix)
- **スタイリング**: TailwindCSS
- **TypeScript**: 完全なTypeScriptサポート
- **ビルドツール**: Vite

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
│   └── utils.ts       # ユーティリティ関数
├── routes/            # ファイルベースルーティング
│   ├── _index.tsx     # ジョブ一覧 (初期画面)
│   ├── test-ui.tsx    # UIコンポーネントテスト
│   └── defer.tsx      # 遅延読み込みの例
├── styles/            # グローバルスタイル
│   └── tailwind.css   # TailwindCSSインポート
├── entry.server.tsx   # サーバーエントリーポイント
├── root.tsx          # ルートレイアウトコンポーネント
├── routes.ts         # ルート設定
└── server.ts         # サーバー設定
```

## 主な機能

- 環境変数のテーブル形式表示
- 状態管理付きカスタム入力コンポーネント
- サーバーサイドとクライアントサイドのデータ読み込み
- TailwindCSSによるレスポンシブデザイン
- データベースアイコンの統合

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

## 注意事項

- React Router v7によるファイルベースルーティングを使用
- データ取得にサーバーとクライアントの両方のローダーを実装
- 制御された状態を持つカスタム入力コンポーネント
- 環境変数はサーバーサイドで読み込まれ、レスポンシブテーブルで表示
- モダンなJavaScript機能を使用したBunランタイム向けに構築

## 技術スタック (更新)

- **ランタイム**: Bun
- **フレームワーク**: React Router v7 (フレームワークモード)
- **データベース**: SQLite3 (bun:sqlite)
- **スタイリング**: TailwindCSS + shadcn/ui
- **UIライブラリ**: shadcn/ui (モダン・ミニマルデザイン)
- **TypeScript**: 完全なTypeScriptサポート
- **ビルドツール**: Vite
- **ファイル管理**: INPファイルアップロード対応

## 主な機能 (更新)

- **Abaqusジョブ管理**
  - ジョブ一覧表示（初期画面）
  - ジョブ作成・編集・削除
  - リアルタイムステータス更新
  - ジョブ実行順序の制御

- **ファイル管理**
  - INPファイルのアップロード・管理
  - ファイル検証とエラーハンドリング
  - 結果ファイルのダウンロード

- **システム管理**
  - ユーザー管理（作成・編集・削除）
  - ノード管理（追加・設定・監視）
  - ライセンストークン管理

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

## 開発状況

### 完了済み (Phase 1.3)
- ✅ プロジェクト基盤構築 (React Router v7 + Bun)
- ✅ データベース基盤 (SQLite + CRUD操作)
- ✅ 英語メッセージシステム
- ✅ 基本UIコンポーネント (shadcn/ui)
- ✅ エラー・メッセージ表示システム

### 進行中 (Phase 2)
- 🔄 Webインターフェース基盤
  - トップナビゲーションコンポーネント
  - メインレイアウトコンポーネント
  - ジョブ一覧テーブル

### 今後の予定
- Phase 3: ジョブ管理画面
- Phase 4: システム管理画面
- Phase 5: ファイル管理システム
- Phase 6: WebSocket・リアルタイム更新
- Phase 7: SSH接続・実行制御