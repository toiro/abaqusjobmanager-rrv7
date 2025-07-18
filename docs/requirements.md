# Abaqus Job Manager 仕様書

## 概要

LAN上で動作するAbaqus用ジョブの可視化および実行順制御を行うWebアプリケーション。教職員および学生が利用する学術環境向けのツールです。

**現在の実装状況**: React Router v7 + Bun + SQLite + TailwindCSS + shadcn/ui による実装が完了し、基本的な機能は動作しています。

## 機能要件

### 1. Job可視化機能

#### 1.1 ジョブ一覧表示

**表示項目**
- ジョブ名
- ステータス
- ジョブ実行者
- ジョブ実行ノード（ユーザー指定）
- 使用CPU数（2/4/8コア）
- 使用ライセンストークン数
- ジョブ作成日時

**ステータス種別**
- `pending`: 順番待ち中
- `waiting`: 実行前処理中
- `running`: 実行中
- `completed`: 完了
- `failed`: 失敗
- `cancelled`: キャンセル済み

**実装状況**: ✅ 完了 - データベースに定義済み、UI で表示されています

**表示形式**
- テーブル形式での一覧表示
- テーブル上のボタンからジョブ詳細を表示

**実装状況**: ✅ 完了 - JobTableコンポーネントによる実装済み

#### 1.2 ジョブ詳細表示

**基本情報**
- Status
- Message: ステータス更新時に付随するメッセージ（あれば）
- Last Status Update
- Created At
- Execution Directory Path
- Result Directory Path
- ID

**Abaqus実行ファイル内容表示**
- `.sta` ファイル
- `.dat` ファイル
- `.log` ファイル
- `.msg` ファイル

**実装状況**: 🔄 一部実装 - データベースのjob_logsテーブルにログ保存機能はあるが、ファイル内容表示UIは未実装

### 2. 実行順制御機能

#### 2.1 基本機能
- ユーザー指定ノードでのジョブキュー管理
- ノード内での優先度順・FIFO実行
- 手動でのジョブ順序変更（優先度: 低）
- ジョブ優先度設定（優先度: 低）

**実装状況**: 🔄 一部実装 - データベース構造は完成、実際のジョブ実行制御は未実装

#### 2.2 ジョブ作成時の設定機能
- **実行ノード選択**: 利用可能なノードから選択
- **CPU数選択**: 2/4/8コアから選択
- **リソース状況表示**: 
  - ノードの利用可能CPU数
  - ノードの現在の使用CPU数
  - システム全体の利用可能ライセンストークン数
  - 各ノードの現在使用ライセンストークン数

**実装状況**: 🔄 一部実装 - NewJobModal でファイルアップロード機能は完成、ノード選択・CPU選択UI は未実装

#### 2.3 リソース管理機能
- **ライセンストークン管理**: システム全体の利用可能ライセンス数の監視
- **CPU使用量管理**: 各ノードのCPU使用状況の監視
- **実行可能性判定**: 指定されたCPU数とライセンストークンの利用可能性チェック

**実装状況**: 🔄 一部実装 - license-config.ts でライセンス計算機能は完成、実際のリソース監視は未実装

#### 2.4 除外機能
- 依存関係設定機能は不要

### 3. リアルタイム更新機能

- ジョブステータスのリアルタイム更新
- 新規ジョブの自動表示
- 実行ログの動的更新

**実装状況**: ✅ 完了 - Server-Sent Events (SSE) により JobTable でリアルタイム更新を実装済み

## 技術要件

### 1. Abaqusとの連携

#### 1.1 実行環境
- SSH経由でのPowerShell接続
- `abaqus` コマンドによるジョブ実行

**実装状況**: ✅ 完了 - `/app/app/lib/services/remote-pwsh/` にSSH経由PowerShell実行ライブラリ実装済み

#### 1.2 状態監視方法
以下いずれかの方法で実装：
1. Abaqusジョブ実行ディレクトリのファイル監視
2. Abaqus interactiveオプション実行でのシェル制御待ち + 標準出力解析

**実装状況**: 🔄 一部実装 - remote-pwsh でstdout/stderrリアルタイム取得は完成、Abaqus固有の状態監視は未実装

### 2. LAN環境での運用

#### 2.1 システム構成
- 複数マシンでのAbaqus実行サポート
- 中央管理サーバーによる統合管理

**実装状況**: ✅ 完了 - Node管理機能でSSH接続による複数マシン対応、中央管理サーバーはReact Router v7で実装済み

#### 2.2 ユーザー管理
- ユーザー識別機能（パスワード認証不要）
- 教職員・学生向けの利用者管理

**実装状況**: 🔄 一部実装 - データベースにUserテーブルは完成、UI は管理画面で基本表示のみ実装済み

### 3. UI/UX要件

#### 3.1 対象ユーザー
- 教職員
- 学生

**実装状況**: ✅ 完了 - 一般ユーザー向けジョブ管理機能と管理者向け管理機能に分離済み

#### 3.2 UI仕様
- デスクトップブラウザ対応（モバイル対応不要）
- 直感的なテーブルベースのインターフェース
- リアルタイム更新対応

**実装状況**: ✅ 完了 - TailwindCSS + shadcn/ui によるレスポンシブデザイン、JobTable等テーブル中心UI、SSEによるリアルタイム更新実装済み

## 非機能要件

### 1. パフォーマンス要件
- リアルタイム更新の応答性
- 大量ジョブ処理時の表示性能

**実装状況**: ✅ 完了 - SSE による効率的なリアルタイム更新、テーブル仮想化は必要に応じて実装可能

### 2. 可用性要件
- LAN環境での安定動作
- ジョブ実行中のシステム継続性

**実装状況**: 🔄 一部実装 - 基本的なエラーハンドリングとログシステムは完成、高可用性機能は未実装

### 3. セキュリティ要件
- LAN内でのアクセス制御
- ユーザー識別による適切な権限管理

**実装状況**: 🔄 一部実装 - 管理者向けBearer認証システムは完成、一般ユーザー認証は未実装

## 実装優先度

### 高優先度 (Phase 1-5)
1. ジョブ一覧表示機能 ✅ **完了**
2. ジョブ詳細表示機能 🔄 **一部実装** - 基本情報表示は完成、Abaqusファイル内容表示UI未実装
3. 基本的な実行順制御 🔄 **一部実装** - データベース構造完成、実際の実行制御未実装
4. Abaqusとの基本連携 🔄 **一部実装** - SSH接続基盤完成、Abaqus固有処理未実装
5. リアルタイム更新機能 ✅ **完了**

### 中優先度 (Phase 6-8)
1. ユーザー管理機能 🔄 **一部実装** - 管理画面基本表示のみ
2. 複数ノード対応 ✅ **完了** - SSH接続による複数マシン対応済み

### 低優先度 (Phase 9-10)
1. ジョブ優先度設定 📋 **未実装**
2. 手動順序変更機能 📋 **未実装**