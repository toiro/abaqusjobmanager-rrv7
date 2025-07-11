# 実装ロードマップ

## 実装戦略

### 基本方針
1. **段階的実装**: 各フェーズで動作確認しながら進行
2. **リスク分散**: 技術的難易度の高い部分を早期に検証
3. **依存関係の考慮**: 基盤→コア機能→拡張機能の順序
4. **テスト駆動**: 各フェーズでテスト実装とレビュー

## Phase 1: 基盤構築 (Week 1-2)

### 1.1 プロジェクト初期化
```bash
# 優先度: ★★★ / 難易度: ★☆☆
- package.json の依存関係追加
- TypeScript設定
- ESLint/Prettier設定
- 基本的なフォルダ構造作成
```

**実装順序:**
1. React Router v7フレームワークモード設定
2. Bunランタイム動作確認
3. 開発環境構築（hot reload等）

**完了条件:**
- `bun run dev` でアプリケーション起動
- 基本的なルーティング動作確認

### 1.2 データベース基盤
```bash
# 優先度: ★★★ / 難易度: ★★☆
- SQLite接続設定
- テーブル作成とマイグレーション
- 基本的なCRUD操作
```

**実装順序:**
1. `app/lib/database.ts` - bun:sqlite接続
2. テーブル作成SQL実行
3. 基本的なデータアクセス関数
4. データベース初期化スクリプト

**完了条件:**
- データベースファイル作成
- 基本的なクエリ実行確認
- テストデータの挿入・取得

### 1.3 英語メッセージシステム
```bash
# 優先度: ★★☆ / 難易度: ★☆☆
- メッセージ定数の実装
- 基本的なUIコンポーネント
```

**実装順序:**
1. `app/lib/messages.ts` の実装
2. 基本UIコンポーネント（Button, Input等）
3. エラー表示コンポーネント

**完了条件:**
- 英語メッセージの一元管理
- 基本UIコンポーネントの動作確認

## Phase 2: Webインターフェース基盤 (Week 2-3)

### 2.1 基本UIコンポーネント
```bash
# 優先度: ★★★ / 難易度: ★★☆
- レイアウトコンポーネント
- 共通UIコンポーネント
- ナビゲーション
```

**実装順序:**
1. `app/components/layout/` - メインレイアウト
2. `app/components/ui/` - Button, Input, Table等
3. `app/components/navigation/` - ナビゲーション
4. TailwindCSSテーマ設定

**完了条件:**
- 基本レイアウトの表示
- 再利用可能なUIコンポーネント
- レスポンシブ対応

### 2.2 ダッシュボード画面
```bash
# 優先度: ★★★ / 難易度: ★★☆
- システム状況表示
- リソース使用状況
- ジョブ統計
```

**実装順序:**
1. `app/routes/_index.tsx` - ダッシュボード
2. システム情報表示コンポーネント
3. リソース使用率の可視化
4. ジョブ統計チャート

**完了条件:**
- システム全体の可視化
- リアルタイム情報表示
- 直感的なUI/UX

## Phase 3: ジョブ管理画面 (Week 3-4)

### 3.1 ジョブ一覧・詳細表示
```bash
# 優先度: ★★★ / 難易度: ★★☆
- ジョブ一覧テーブル
- ジョブ詳細表示
- ステータス表示
```

**実装順序:**
1. `app/routes/jobs/_index.tsx` - ジョブ一覧画面
2. `app/routes/jobs/$jobId.tsx` - ジョブ詳細画面
3. ステータスバッジコンポーネント
4. ジョブテーブルコンポーネント

**完了条件:**
- ジョブ一覧の表示
- ジョブ詳細情報の表示
- ステータス別の表示

### 3.2 ジョブ作成フォーム
```bash
# 優先度: ★★★ / 難易度: ★★☆
- ジョブ作成フォーム
- バリデーション
- ファイルアップロード統合
```

**実装順序:**
1. `app/routes/jobs/new.tsx` - ジョブ作成画面
2. ジョブ作成バリデーション
3. ファイルアップロードコンポーネント
4. リソース可用性チェック表示

**完了条件:**
- ジョブ作成フォームの動作
- バリデーションエラー表示
- ファイルアップロード機能

## Phase 4: システム管理画面 (Week 4-5)

### 4.1 ユーザー管理画面
```bash
# 優先度: ★★★ / 難易度: ★★☆
- ユーザー一覧・作成・編集
- 同時実行ジョブ数設定
- ユーザー状態管理
```

**実装順序:**
1. `app/routes/admin/users/_index.tsx` - ユーザー一覧
2. `app/routes/admin/users/new.tsx` - ユーザー作成
3. `app/routes/admin/users/$userId.tsx` - ユーザー編集
4. ユーザー管理API統合

**完了条件:**
- ユーザーCRUD操作
- 設定値の管理
- ユーザー状態表示

### 4.2 ライセンス・ノード管理
```bash
# 優先度: ★★★ / 難易度: ★★☆
- ライセンス設定画面
- ノード管理画面
- システム設定
```

**実装順序:**
1. `app/routes/admin/settings.tsx` - システム設定
2. `app/routes/admin/nodes/_index.tsx` - ノード管理
3. ライセンス設定コンポーネント
4. リソース使用状況の可視化

**完了条件:**
- ライセンス設定の更新
- ノード情報の管理
- リソース使用状況の表示

## Phase 5: ファイル管理システム (Week 5-6)

### 5.1 ファイルアップロード機能
```bash
# 優先度: ★★★ / 難易度: ★★☆
- INPファイルアップロード
- ファイル検証
- ローカル保存
```

**実装順序:**
1. `app/routes/api/upload.ts` - マルチパートファイル処理
2. `app/lib/fileManager.ts` - ファイル管理クラス
3. ファイル検証ロジック（拡張子、サイズ）
4. フロントエンドアップロードコンポーネント

**完了条件:**
- INPファイルのアップロード
- ファイル検証とエラー表示
- アップロードファイルの管理

### 5.2 ファイル表示・ダウンロード
```bash
# 優先度: ★★☆ / 難易度: ★☆☆
- アップロードファイル一覧
- ファイルダウンロード
- ファイル削除機能
```

**実装順序:**
1. `app/routes/api/files.ts` - ファイル取得API
2. ファイル一覧表示コンポーネント
3. ダウンロード機能

**完了条件:**
- アップロードファイルの一覧表示
- ファイルダウンロード
- 不要ファイルの削除

## Phase 6: SSE・リアルタイム更新 (Week 6-7)

### 6.1 SSEサーバー
```bash
# 優先度: ★★★ / 難易度: ★★★
- SSEサーバーの実装
- クライアント接続管理
- メッセージ配信
```

**実装順序:**
1. `app/routes/api.events.ts` - SSE エンドポイント
2. `app/server.ts` での統合
3. クライアント接続管理
4. ブロードキャスト機能

**完了条件:**
- SSEサーバーの起動
- クライアント接続の確立
- メッセージ送受信

### 6.2 フロントエンドSSE
```bash
# 優先度: ★★★ / 難易度: ★★☆
- SSEフック
- リアルタイム更新
- 自動再接続
```

**実装順序:**
1. `app/hooks/useSSE.ts` - SSEフック
2. ジョブ一覧のリアルタイム更新
3. 接続状態表示
4. エラーハンドリング

**完了条件:**
- リアルタイムでのジョブ状態更新
- 接続断時の自動再接続
- エラー時の適切な表示

## Phase 7: SSH接続・実行制御 (Week 7-9)

### 7.1 SSH接続基盤
```bash
# 優先度: ★★★ / 難易度: ★★★
- SSH接続管理
- 認証設定
- 接続プール
```

**実装順序:**
1. `app/lib/sshManager.ts` - SSH接続管理クラス
2. SSH認証設定（公開鍵）
3. 接続テスト機能
4. ヘルスチェック実装

**完了条件:**
- Abaqusノードへの接続
- SSH認証の動作確認
- 接続状態の監視

### 7.2 ファイル転送機能
```bash
# 優先度: ★★★ / 難易度: ★★★
- SFTP実装
- INPファイル転送
- 結果ファイル収集
```

**実装順序:**
1. `app/lib/fileTransfer.ts` - ファイル転送クラス
2. INPファイル転送機能
3. 結果ファイル収集機能
4. 転送エラーハンドリング

**完了条件:**
- INPファイルのノード転送
- 結果ファイルの回収
- 転送状況の表示

### 7.3 Abaqus実行制御
```bash
# 優先度: ★★★ / 難易度: ★★★
- PowerShell経由実行
- 進捗監視
- エラー検知
```

**実装順序:**
1. `app/lib/abaqusExecutor.ts` - Abaqus実行クラス
2. PowerShell経由でのAbaqus実行
3. 出力パターンの解析
4. エラー分類と処理

**完了条件:**
- Abaqusジョブの実行
- 実行状況の監視
- 完了・エラーの検知

## Phase 8: ジョブスケジューラー (Week 9-10)

### 8.1 基本スケジューラー
```bash
# 優先度: ★★★ / 難易度: ★★★
- ジョブキューシステム
- リソース制約チェック
- 自動実行
```

**実装順序:**
1. `app/lib/jobScheduler.ts` - スケジューラークラス
2. リソース可用性判定
3. ジョブ割り当てロジック
4. スケジューラーの起動・停止

**完了条件:**
- 自動ジョブ実行
- リソース制約の遵守
- 優先度順の実行

### 8.2 ノード管理統合
```bash
# 優先度: ★★☆ / 難易度: ★★☆
- ノード状態管理
- 負荷分散
- ヘルスチェック統合
```

**実装順序:**
1. `app/lib/nodeManager.ts` - ノード管理クラス
2. ノード状態の自動更新
3. ヘルスチェック統合
4. 障害ノードの除外

**完了条件:**
- ノード状態の自動管理
- 障害時の自動除外
- 復旧時の自動復帰

## Phase 9: 監視・運用機能 (Week 10-11)

### 9.1 監視機能
```bash
# 優先度: ★★☆ / 難易度: ★★☆
- メトリクス収集
- ヘルスチェック
- アラート機能
```

**実装順序:**
1. `app/lib/monitoring.ts` - 監視機能
2. システムメトリクス収集
3. ダッシュボード表示
4. アラート設定

**完了条件:**
- システム状況の可視化
- 異常時のアラート
- パフォーマンス監視

### 9.2 ログ・エラー管理
```bash
# 優先度: ★★☆ / 難易度: ★☆☆
- 構造化ログ
- エラー追跡
- ログローテーション
```

**実装順序:**
1. `app/lib/logger.ts` - ログ管理
2. エラー分類と記録
3. ログ表示機能
4. ログファイル管理

**完了条件:**
- 構造化されたログ出力
- エラーの追跡可能性
- ログの適切な管理

## Phase 10: テスト・最適化・デプロイメント (Week 11-12)

### 10.1 テスト・最適化
```bash
# 優先度: ★★★ / 難易度: ★★☆
- ユニットテスト
- 統合テスト
- パフォーマンス最適化
```

**実装順序:**
1. 各モジュールのユニットテスト
2. API統合テスト
3. E2Eテストシナリオ
4. パフォーマンス最適化

**完了条件:**
- テストカバレッジ80%以上
- 応答時間目標達成
- 安定動作の確認

### 10.2 本番環境対応
```bash
# 優先度: ★★★ / 難易度: ★★☆
- 環境設定
- セキュリティ強化
- バックアップ・復旧
```

**実装順序:**
1. 本番環境設定ファイル
2. セキュリティ設定強化
3. バックアップスクリプト
4. 復旧手順の検証

**完了条件:**
- 本番環境での動作確認
- セキュリティ監査通過
- 運用手順書完成

## 重要な注意点

### 各フェーズで必須の作業
1. **コードレビュー**: 各フェーズ完了時
2. **動作テスト**: 段階的な統合テスト
3. **ドキュメント更新**: 実装に伴う仕様変更の反映
4. **バックアップ**: 各フェーズでの作業バックアップ

### リスク軽減策
1. **Phase 6 (SSH/Abaqus)**: 最も技術的難易度が高いため、早期のPoC実施を推奨
2. **Phase 7 (スケジューラー)**: 複雑な制御ロジックのため、段階的実装と十分なテスト
3. **Phase 5 (SSE)**: React Router v7との統合で予期しない問題の可能性

### 並行作業の可能性
- Phase 2-3: ライセンス管理とファイル管理は並行実装可能
- Phase 5-6: SSEとSSH接続は一部並行実装可能
- Phase 8-9: 監視機能とテスト実装は並行実装可能

この順序により、段階的に機能を構築しながら、技術的リスクを早期に特定・解決できます。