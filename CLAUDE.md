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
│   └── input.tsx      # カスタム入力コンポーネント
├── routes/            # ファイルベースルーティング
│   ├── _index.tsx     # 環境変数テーブルのホームページ
│   └── defer.tsx      # 遅延読み込みの例
├── styles/            # グローバルスタイル
│   └── tailwind.css   # TailwindCSSインポート
├── utils/             # ユーティリティ関数
│   └── env.server.ts  # サーバーサイド環境ユーティリティ
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
- **スタイリング**: TailwindCSS
- **TypeScript**: 完全なTypeScriptサポート
- **ビルドツール**: Vite
- **ファイル管理**: INPファイルアップロード対応

## 主な機能 (更新)

- 環境変数のテーブル形式表示
- Abaqusジョブの可視化と管理
- INPファイルのアップロードと管理
- ジョブ実行順序の制御
- サーバーサイドとクライアントサイドのデータ読み込み
- TailwindCSSによるレスポンシブデザイン
- リアルタイムジョブステータス更新

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
- [deployment-operations.md](docs/deployment-operations.md) - デプロイメント、監視、障害対応の運用仕様