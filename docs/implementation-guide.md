# 実装ガイド

## 言語設定方針

### フロントエンド
- **ユーザーインターフェース**: 英語
- **エラーメッセージ**: 英語
- **ボタン・ラベル**: 英語
- **バリデーションメッセージ**: 英語

### バックエンド・ドキュメント
- **ドキュメント**: 日本語
- **コメント**: 日本語
- **ログメッセージ**: 日本語（開発者向け）
- **データベース**: 英語（テーブル名・カラム名）

## 実装手順

### Phase 1: 基盤整備
1. **SQLite データベース設定**
   - `bun:sqlite` を使用したデータベース接続
   - テーブル初期化とマイグレーション
   - データベースファイルの配置 (`./data/abaqus-jobs.db`)

2. **ファイル管理システム**
   - INPファイルアップロード機能
   - アップロードディレクトリ管理 (`./uploads/inp-files/`)
   - ファイル名の衝突回避

3. **React Router v7 フレームワークモード設定**
   - API routesの設定
   - サーバーサイドレンダリング対応
   - 開発環境とプロダクション環境の設定

### Phase 2: API実装
1. **ジョブ管理API**
   - ジョブ作成・取得・更新・削除
   - ステータス管理
   - ジョブキュー処理

2. **ファイルアップロードAPI**
   - マルチパートフォームデータ処理
   - ファイル検証（拡張子、サイズ）
   - データベースへのファイル情報保存

3. **WebSocket実装**
   - リアルタイム状態更新
   - クライアント接続管理

### Phase 3: フロントエンド実装
1. **ジョブ管理画面**
   - ジョブ一覧テーブル
   - ジョブ詳細表示
   - ステータス表示

2. **ファイルアップロード機能**
   - ドラッグ&ドロップ対応
   - アップロード進捗表示
   - ファイル検証

3. **リアルタイム更新**
   - WebSocket接続
   - 状態の自動更新

### Phase 4: Abaqus統合
1. **SSH接続機能**
   - ノード管理
   - SSH認証設定

2. **Abaqus実行制御**
   - ジョブ実行
   - ステータス監視
   - 結果ファイル取得

## 必要な依存関係

```json
{
  "dependencies": {
    "@react-router/fs-routes": "^7.3.0",
    "@react-router/node": "^7.3.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router": "^7.3.0",
    "ws": "^8.0.0"
  },
  "devDependencies": {
    "@react-router/dev": "^7.3.0",
    "@types/ws": "^8.0.0"
  }
}
```

## ディレクトリ構造

```
/home/soraji/projects/abaqusjobmanager-rrv7/
├── app/
│   ├── routes/
│   │   ├── _index.tsx                 # ジョブ一覧
│   │   ├── jobs/
│   │   │   ├── $jobId.tsx            # ジョブ詳細
│   │   │   └── new.tsx               # 新規ジョブ作成
│   │   └── api/
│   │       ├── jobs.ts               # ジョブAPI
│   │       ├── upload.ts             # アップロードAPI
│   │       └── files.ts              # ファイル取得API
│   ├── components/
│   │   ├── JobTable.tsx              # ジョブテーブル
│   │   ├── JobDetails.tsx            # ジョブ詳細
│   │   ├── FileUpload.tsx            # ファイルアップロード
│   │   └── StatusBadge.tsx           # ステータス表示
│   └── lib/
│       ├── database.ts               # データベース接続
│       ├── fileManager.ts            # ファイル管理
│       ├── jobManager.ts             # ジョブ管理
│       └── websocketManager.ts       # WebSocket管理
├── data/
│   └── abaqus-jobs.db               # SQLiteデータベース
├── uploads/
│   └── inp-files/                   # アップロードファイル
└── docs/
    ├── requirements.md
    ├── architecture.md
    ├── api-specification.md
    └── implementation-guide.md
```

## 環境設定

### 開発環境
```bash
# 開発サーバー起動
bun run dev

# データベース初期化
bun run init-db

# 型チェック
bun run typecheck
```

### 本番環境
```bash
# ビルド
bun run build

# サーバー起動
bun run start
```

## セキュリティ考慮事項

1. **ファイルアップロード**
   - 許可する拡張子の制限 (`.inp`)
   - ファイルサイズ制限
   - アップロードディレクトリの外部アクセス防止

2. **データベース**
   - SQLインジェクション防止
   - プリペアドステートメントの使用

3. **SSH接続**
   - 公開鍵認証の使用
   - 接続情報の安全な管理

## 監視・ログ

1. **アプリケーションログ**
   - ジョブ実行ログ
   - エラーログ
   - アクセスログ

2. **システム監視**
   - データベース接続状態
   - ファイルシステム使用量
   - SSH接続状態

## バックアップ・復旧

1. **データベースバックアップ**
   - SQLiteファイルの定期バックアップ
   - 差分バックアップ機能

2. **ファイルバックアップ**
   - アップロードファイルのバックアップ
   - 結果ファイルのアーカイブ