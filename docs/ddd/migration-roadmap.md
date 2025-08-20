# DDD アーキテクチャ移行ロードマップ & マイルストーン

## 📋 概要

このドキュメントは、Abaqus Job Managerプロジェクトにおける `server/client/shared` 構成から `infrastructure/domain` 構成への段階的な移行計画を定めます。

### **移行の基本方針**

1. **Domain + Infrastructure 層に集中** - UseCase層は後に検討
2. **同期的なディレクトリ移行** - DDD意味づけとディレクトリ構造変更を同時実施
3. **Infrastructure優先** - 明確に分類可能なInfrastructure コードを最優先で移行

## 🎯 現状分析

### **完了済み**
- ✅ **User Aggregate**: 関数型DDD実装完了（基準実装）
- ✅ **Domain Services**: 5つのドメインサービス実装完了
- ✅ **Value Objects**: エンティティID、バリデーション結果等
- ✅ **Domain Constants**: ビジネスルール定数群

### **Infrastructure 分類可能コード（最優先移行対象）**

#### **🔴 最高優先度: データベース層**
```
app/shared/core/database/ → app/infrastructure/persistence/
```
**対象ファイル**: 19ファイル
- `connection.server.ts` - SQLite接続管理
- `base-repository.ts` - ベースリポジトリパターン  
- `*-repository.ts` - 各エンティティリポジトリ実装
- `db-utils.ts` - DB操作ユーティリティ
- `settings-operations.ts` - 設定データ操作

**影響範囲**: 全システム（データアクセス層）

#### **🟠 高優先度: 外部システム統合**
```
app/server/lib/remote-pwsh/ → app/infrastructure/external/
```
**対象ファイル**: 9ファイル
- `executor.ts` - リモートPowerShell実行エンジン
- `types.ts` - SSH接続型定義
- `events.ts` - 実行イベント管理
- `process.ts` - プロセス制御

**影響範囲**: Abaqus実行制御システム

#### **🟡 中優先度: ログ基盤**
```
app/shared/core/logger/ → app/infrastructure/logging/
```
**対象ファイル**: 2ファイル
- `logger.server.ts` - ログ取得・出力
- `config.ts` - ログ設定管理

#### **🟡 中優先度: イベント基盤**
```
app/server/services/sse/ → app/infrastructure/events/
```
**対象ファイル**: 5ファイル
- `sse.server.ts` - SSEイベント送信
- `sse-event-emitter.server.ts` - イベントエミッター
- `sse-schemas.ts` - イベントスキーマ定義
- `sse-cleanup-manager.ts` - 接続クリーンアップ
- `sse-statistics.ts` - 統計情報管理

#### **🟡 中優先度: スケジューラー基盤**
```
app/server/lib/scheduler/ → app/infrastructure/scheduling/
```
**対象ファイル**: 4ファイル
- `interval-scheduler.server.ts` - 間隔実行スケジューラー
- `health-check-scheduler.server.ts` - ヘルスチェック
- `job-execution-scheduler.server.ts` - ジョブ実行スケジューラー
- `sse-cleanup-scheduler.server.ts` - SSEクリーンアップ

### **Domain 層実装予定**

#### **未実装 Aggregates（優先度順）**
1. **Job Aggregate** 🔴 - ジョブ実行管理（ドメインイベントあり）
2. **Node Aggregate** 🟠 - 実行ノード管理
3. **FileRecord Aggregate** 🟡 - ファイル管理

## 🗓️ マイルストーン計画

### **Phase 1: Infrastructure Foundation** 📅 **最優先実施**

#### **Milestone 1.1: Directory Structure Creation**
**期間**: 1日  
**目標**: 新しいディレクトリ構造の作成

```bash
app/infrastructure/
├── persistence/          # データベース・ストレージ
├── external/            # 外部システム統合
├── logging/             # ログ基盤
├── events/              # イベント基盤  
├── scheduling/          # スケジューラー基盤
└── index.ts            # Infrastructure層統一API
```

**成果物**:
- [ ] ディレクトリ構造作成
- [ ] 各レイヤーのindex.tsファイル作成
- [ ] Import/Export基盤準備

#### **Milestone 1.2: Database Layer Migration** 
**期間**: 2-3日  
**目標**: データベース層の完全移行

**移行対象**: `app/shared/core/database/*` → `app/infrastructure/persistence/`

**詳細作業**:
1. **Repository Interface分離**
   ```typescript
   // Domain層に移行
   app/domain/repositories/user-repository.ts (interface)
   app/domain/repositories/job-repository.ts (interface)
   app/domain/repositories/node-repository.ts (interface)
   app/domain/repositories/file-repository.ts (interface)
   
   // Infrastructure層に移行  
   app/infrastructure/persistence/user-repository.impl.ts (実装)
   app/infrastructure/persistence/job-repository.impl.ts (実装)
   app/infrastructure/persistence/node-repository.impl.ts (実装)
   app/infrastructure/persistence/file-repository.impl.ts (実装)
   ```

2. **Database Connection**
   ```
   app/shared/core/database/connection.server.ts
   → app/infrastructure/persistence/sqlite/connection.ts
   ```

3. **Base Repository Pattern**
   ```
   app/shared/core/database/base-repository.ts  
   → app/infrastructure/persistence/base/repository.ts
   ```

**成果物**:
- [ ] Repository interface定義（Domain層）
- [ ] Repository実装（Infrastructure層）
- [ ] データベース接続管理（Infrastructure層）
- [ ] 既存コード動作確認

#### **Milestone 1.3: External Systems Migration**
**期間**: 2日  
**目標**: 外部システム統合層の移行

**移行対象**: `app/server/lib/remote-pwsh/*` → `app/infrastructure/external/`

**新構成**:
```
app/infrastructure/external/
├── remote-pwsh/
│   ├── executor.ts           # PowerShell実行エンジン
│   ├── ssh-client.ts        # SSH接続クライアント  
│   ├── types.ts             # 外部システム型定義
│   └── events.ts            # 実行イベント
└── abaqus/
    ├── job-executor.ts      # Abaqus専用実行ラッパー
    └── file-transfer.ts     # ファイル転送サービス
```

**成果物**:
- [ ] リモートPowerShell実行基盤移行
- [ ] SSH接続管理移行
- [ ] Abaqus統合ラッパー整備
- [ ] イベント管理システム移行

#### **Milestone 1.4: Infrastructure Services Migration**
**期間**: 2日  
**目標**: ログ・イベント・スケジューラー基盤移行

**移行対象**:
- `app/shared/core/logger/*` → `app/infrastructure/logging/`
- `app/server/services/sse/*` → `app/infrastructure/events/`
- `app/server/lib/scheduler/*` → `app/infrastructure/scheduling/`

**成果物**:
- [ ] ログシステム移行
- [ ] SSEイベント基盤移行  
- [ ] スケジューラー基盤移行
- [ ] 統合Infrastructure API作成

#### **Milestone 1.5: Import Path Updates**
**期間**: 1-2日  
**目標**: 全コードベースのインポートパス更新

**作業内容**:
1. **Domain層インポート更新** 
   ```typescript
   // Before
   import { JobRepository } from "~/shared/core/database/job-repository";
   
   // After  
   import { JobRepository } from "~/domain/repositories/job-repository";
   ```

2. **Infrastructure層インポート更新**
   ```typescript
   // Before
   import { getDatabase } from "~/shared/core/database/connection.server";
   
   // After
   import { getDatabase } from "~/infrastructure/persistence/sqlite/connection";
   ```

**成果物**:
- [ ] 全ファイルのインポート更新
- [ ] TypeScript型チェック通過
- [ ] 既存機能動作確認

### **Phase 2: Domain Aggregates Completion** 📅 **Phase 1完了後**

#### **Milestone 2.1: Job Aggregate Implementation**
**期間**: 3-4日  
**目標**: 最も複雑なJob Aggregateの実装

**実装内容**:
```typescript
// app/domain/aggregates/job/
├── job.ts                    # Job Aggregate（関数型DDD）
├── job-repository.ts         # Repository Interface  
├── job-events.ts            # Domain Events
└── job-state-transitions.ts # 状態遷移ルール
```

**Domain Events**:
```typescript
export type JobDomainEvent = 
  | { type: 'JobStarted'; jobId: JobId; nodeId: NodeId; startedAt: Date }
  | { type: 'JobCompleted'; jobId: JobId; duration: number; outputSize: number }
  | { type: 'JobFailed'; jobId: JobId; error: JobExecutionError }
  | { type: 'JobCanceled'; jobId: JobId; canceledAt: Date };
```

**成果物**:
- [ ] Job Aggregate実装（関数型DDD）
- [ ] ジョブ状態遷移管理
- [ ] Domain Events定義
- [ ] Repository Interface実装
- [ ] 既存Job機能との統合確認

#### **Milestone 2.2: Node Aggregate Implementation**
**期間**: 2-3日  
**目標**: Node Aggregateの実装

**実装内容**:
```typescript
// app/domain/aggregates/node/
├── node.ts              # Node Aggregate（関数型DDD）
├── node-repository.ts   # Repository Interface
└── node-capability.ts   # ノード能力評価（ドメインサービスから移行）
```

**成果物**:
- [ ] Node Aggregate実装
- [ ] ノード能力評価ロジック統合
- [ ] リソース制約管理
- [ ] Repository Interface実装

#### **Milestone 2.3: FileRecord Aggregate Implementation** 
**期間**: 2日  
**目標**: FileRecord Aggregateの実装

**実装内容**:
```typescript
// app/domain/aggregates/file-record/  
├── file-record.ts              # FileRecord Aggregate（関数型DDD）
├── file-record-repository.ts   # Repository Interface
└── file-validation.ts          # ファイル検証（ドメインサービスから移行）
```

**成果物**:
- [ ] FileRecord Aggregate実装
- [ ] ファイル検証ロジック統合
- [ ] アップロード・ダウンロード管理
- [ ] Repository Interface実装

### **Phase 3: Integration & Legacy Cleanup** 📅 **Phase 2完了後**

#### **Milestone 3.1: Legacy Directory Removal**
**期間**: 1日  
**目標**: レガシーディレクトリの削除

**削除対象**:
- `app/shared/core/database/` （完全移行後）
- `app/shared/core/logger/` （完全移行後）  
- `app/server/lib/remote-pwsh/` （完全移行後）
- `app/server/lib/scheduler/` （完全移行後）
- `app/server/services/sse/` （完全移行後）

**成果物**:
- [ ] レガシーディレクトリ削除
- [ ] 不要ファイル削除
- [ ] TypeScript設定調整

#### **Milestone 3.2: Architecture Verification**
**期間**: 1-2日  
**目標**: 新アーキテクチャの動作確認

**検証項目**:
- [ ] 全機能の動作確認
- [ ] パフォーマンス検証
- [ ] テスト実行確認
- [ ] 型安全性検証

## 📊 進捗管理

### **進捗追跡指標**

| Phase | Milestone | ファイル数 | 推定工数 | 優先度 | Status |
|-------|-----------|------------|----------|--------|---------|
| 1.1   | Directory Structure | 5 | 0.5日 | 🔴 | 📋 Planned |
| 1.2   | Database Migration | 19 | 3日 | 🔴 | 📋 Planned |  
| 1.3   | External Systems | 9 | 2日 | 🟠 | 📋 Planned |
| 1.4   | Infrastructure Services | 11 | 2日 | 🟡 | 📋 Planned |
| 1.5   | Import Updates | ~50 | 2日 | 🟡 | 📋 Planned |
| 2.1   | Job Aggregate | 4 | 4日 | 🔴 | 📋 Planned |
| 2.2   | Node Aggregate | 3 | 3日 | 🟠 | 📋 Planned |
| 2.3   | FileRecord Aggregate | 3 | 2日 | 🟡 | 📋 Planned |
| 3.1   | Legacy Cleanup | - | 1日 | 🟡 | 📋 Planned |
| 3.2   | Architecture Verification | - | 2日 | 🔴 | 📋 Planned |

### **リスク管理**

#### **🚨 高リスク項目**
1. **データベース層移行** - 全機能への影響
   - **対策**: 段階的移行、既存機能維持確認
2. **インポートパス更新** - 大規模変更
   - **対策**: 自動化ツール使用、段階的更新

#### **⚠️ 中リスク項目**  
1. **外部システム統合** - SSH/PowerShell依存
   - **対策**: 既存テスト活用、動作確認強化
2. **Domain Events統合** - SSE連携複雑性
   - **対策**: イベント流れ図作成、段階的実装

## 🎯 成功基準

### **Phase 1完了条件**
- [ ] 全Infrastructure コードが `app/infrastructure/` 配下に移行完了
- [ ] Domain Repository Interface が分離完了
- [ ] 既存機能が100%動作
- [ ] TypeScript型チェック通過
- [ ] テストスイート実行成功

### **Phase 2完了条件**  
- [ ] Job/Node/FileRecord Aggregates実装完了
- [ ] Domain Events定義・統合完了
- [ ] 関数型DDD実装ガイドライン準拠
- [ ] 既存ビジネスロジックとの統合完了

### **Phase 3完了条件**
- [ ] レガシーディレクトリ完全削除
- [ ] 新アーキテクチャ動作確認完了
- [ ] パフォーマンス劣化なし
- [ ] ドキュメント更新完了

## 📚 関連ドキュメント

- [関数型DDD Aggregate実装ガイドライン](./functional-ddd-aggregate-guidelines.md)
- [プロジェクト開発方針](../../CLAUDE.md)
- [アーキテクチャ概要](../architecture.md)

---

**作成日**: 2025年1月  
**更新日**: 2025年1月  
**作成者**: Claude Code AI Assistant  
**対象**: Abaqus Job Manager Development Team