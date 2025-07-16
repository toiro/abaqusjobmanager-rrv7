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
   - `.server.ts`パターンによるサーバー・クライアント分離

### Phase 2: API実装
1. **ジョブ管理API**
   - ジョブ作成・取得・更新・削除
   - ステータス管理
   - ジョブキュー処理

2. **ファイルアップロードAPI**
   - マルチパートフォームデータ処理
   - ファイル検証（拡張子、サイズ）
   - データベースへのファイル情報保存

3. **SSE実装**
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
   - SSE接続
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
│       └── sseManager.ts             # SSE管理
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

## React Router v7 サーバー・クライアント分離パターン

### `.server.ts` ファイル拡張子による分離

React Router v7では、`.server.ts`拡張子を使用してサーバー専用モジュールを定義できます。これにより、ビルド時に自動的にサーバー・クライアント間でコードが分離されます。

#### **基本原則**

1. **サーバー専用処理**: `.server.ts` 拡張子を使用
   ```typescript
   // database/connection.server.ts - サーバー専用
   import { Database } from "bun:sqlite";
   export function getDatabase() { /* ... */ }
   ```

2. **クライアント・サーバー共通**: 通常の `.ts` 拡張子
   ```typescript
   // types/database.ts - 共通型定義
   export interface Job { /* ... */ }
   ```

3. **動的インポート**: サーバー専用モジュールをルートで使用
   ```typescript
   // routes/_index.tsx
   export async function loader() {
     const { getDatabase } = await import("~/lib/database/connection.server");
     // サーバー側でのみ実行
   }
   ```

#### **適用例: Logger システム**

**BEFORE（環境検出による分離）**:
```typescript
// ❌ 複雑で予測不可能
export function getLogger() {
  if (typeof window === 'undefined') {
    // サーバー側処理
  } else {
    // クライアント側処理
  }
}
```

**AFTER（.server.tsパターン）**:
```typescript
// logger.server.ts - サーバー専用
export function getLogger(): LoggerInterface {
  return new AppLogger(); // LogTape使用
}

// routes/_index.tsx - 使用例
export async function loader() {
  const { getLogger } = await import("~/lib/core/logger/logger.server");
  getLogger().info("サーバー側ログ");
}
```

#### **メリット**

1. **ビルド時分離**: 環境検出ロジック不要
2. **型安全性**: TypeScriptで完全な型チェック
3. **バンドルサイズ最適化**: クライアントにサーバー専用コードが含まれない
4. **開発者体験**: IDEでの補完とエラー検出
5. **パフォーマンス**: 実行時の環境判定が不要

#### **ファイル命名規則**

```
lib/
├── database/
│   ├── connection.server.ts  ← サーバー専用（SQLite、プロセス環境）
│   ├── types.ts              ← 共通（型定義）
│   └── utils.ts              ← 共通（ユーティリティ）
├── logger/
│   ├── logger.server.ts      ← サーバー専用（LogTape）
│   ├── types.ts              ← 共通（インターフェース）
│   └── config.ts             ← サーバー専用
└── services/
    ├── sse/
    │   ├── sse.server.ts     ← サーバー専用（SSE実装）
    │   └── sse-schemas.ts    ← 共通（型定義）
    └── license/
        ├── license-config.server.ts  ← サーバー専用（DB操作）
        ├── license-config.ts         ← 共通（計算・検証）
        └── license-validation.ts     ← 共通（バリデーション）
```

#### **注意事項**

1. **サーバー専用モジュールは直接インポート禁止**
   ```typescript
   // ❌ 直接インポートは禁止
   import { getDatabase } from "~/lib/database/connection.server";
   
   // ✅ 動的インポートを使用
   const { getDatabase } = await import("~/lib/database/connection.server");
   ```

2. **環境固有の依存関係**
   - `bun:sqlite`, `fs`, `process.env` → `.server.ts`
   - React hooks, DOM API → 通常の`.ts/.tsx`

3. **共通コードの分離**
   - 型定義、バリデーション、計算ロジック → 通常の`.ts`
   - DB操作、ファイルシステム → `.server.ts`

この分離パターンにより、React Router v7の力を最大限活用し、保守性と型安全性を両立できます。

## バックアップ・復旧

1. **データベースバックアップ**
   - SQLiteファイルの定期バックアップ
   - 差分バックアップ機能

2. **ファイルバックアップ**
   - アップロードファイルのバックアップ
   - 結果ファイルのアーカイブ