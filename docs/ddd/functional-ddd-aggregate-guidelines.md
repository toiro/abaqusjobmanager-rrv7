# 関数型DDD Aggregate実装ガイドライン

## 📋 概要

このドキュメントは、Abaqus Job Managerプロジェクトにおける**関数型DDD (Domain-Driven Design) Aggregate**の統一実装指針を定めます。20人規模のLAN内アプリケーションに適した、シンプルで実用的なDDD実装を目指します。

## 🎯 基本方針

### **関数型DDDアプローチ**
- **不変データ構造**: 全てのエンティティは`readonly`プロパティ
- **純粋関数**: 副作用なし、同じ入力→同じ出力を保証
- **シンプルAPI**: 複雑な抽象化を避け、理解しやすい関数群

### **KISS原則の適用**
- **20人規模適応**: 過度な抽象化を避けた実用的な粒度
- **例外ベースエラー処理**: 複雑な`Result<T,E>`パターン不使用
- **直接的な型**: Branded Typesで型安全性、但し過度な複雑化は避ける

## 🏗️ 実装テンプレート

### **基本構造**

```typescript
// === Imports ===
import type { EntityId } from "../../value-objects/entity-ids";
import { createEntityId, isEntityId } from "../../value-objects/entity-ids";

// === Types ===

/**
 * エンティティ作成データ（外部API用）
 */
export type EntityCreationData = {
  readonly id: string;              // プリミティブ型で受け取り
  readonly field1?: type1;
  readonly field2?: type2;
};

/**
 * エンティティ再構成データ（内部処理用）
 */
export type EntityData = {
  readonly id: EntityId;            // Branded Type使用
  readonly field1: type1;
  readonly field2: type2;
};

// === Entity State (Immutable) ===

/**
 * エンティティ状態（不変オブジェクト）
 */
export type Entity = {
  readonly id: EntityId;
  readonly field1: type1;
  readonly field2: type2;
  readonly isActive: boolean;       // 共通パターン
};

// === Pure Functions ===

/**
 * エンティティ作成（純粋関数）
 */
const createEntity = (id: string, field1: type1, field2?: type2): Entity => {
  if (!isEntityId(id)) {
    throw new Error(`Invalid Entity ID: ${id}`);
  }
  // ビジネスルールバリデーション
  if (/* ビジネス条件 */) {
    throw new Error("ビジネスルール違反メッセージ");
  }
  
  return {
    id: createEntityId(id),
    field1,
    field2: field2 ?? defaultValue,
    isActive: true,
  };
};

/**
 * 既存データから再構成（純粋関数）
 */
const fromData = (data: EntityData): Entity => {
  if (!isEntityId(data.id)) {
    throw new Error(`Invalid Entity ID: ${data.id}`);
  }
  
  return {
    id: data.id,
    field1: data.field1,
    field2: data.field2,
    isActive: data.isActive,
  };
};

/**
 * ビジネス操作メソッド（純粋関数）
 */
const businessOperation = (entity: Entity, param: ParamType): Entity => {
  // バリデーション
  if (!entity.isActive) {
    throw new Error("Cannot perform operation on inactive entity");
  }
  
  // 新しい状態を返す（不変性保持）
  return { ...entity, field1: newValue };
};

// === Public API ===

/**
 * Entity Functions (Functional DDD API)
 */
export const EntityFunctions = {
  /**
   * 作成・再構成
   */
  create: createEntity,
  fromData: fromData,

  /**
   * ビジネス操作（新しいオブジェクトを返す）
   */
  businessOperation: businessOperation,
  activate: (entity: Entity): Entity => ({ ...entity, isActive: true }),
  deactivate: (entity: Entity): Entity => ({ ...entity, isActive: false }),

  /**
   * クエリ操作（副作用なし）
   */
  canPerformAction: (entity: Entity, context: Context): boolean => {
    return entity.isActive && /* 他の条件 */;
  },
  
  /**
   * ヘルパー関数
   */
  helpers: {
    getId: (entity: Entity): EntityId => entity.id,
    isActive: (entity: Entity): boolean => entity.isActive,
    getField1: (entity: Entity): type1 => entity.field1,
  },
} as const;
```

### **Repository Interface**

```typescript
// === Repository Interface ===

import type { Entity } from "./entity";
import type { EntityId } from "../../value-objects/entity-ids";

/**
 * Entity Repository Interface (Functional DDD)
 */
export interface EntityRepository {
  /**
   * エンティティを保存
   */
  save(entity: Entity): Promise<void>;

  /**
   * IDで検索
   */
  findById(id: EntityId): Promise<Entity | null>;

  /**
   * アクティブなエンティティを全取得
   */
  findActiveEntities(): Promise<Entity[]>;

  /**
   * 全エンティティ取得
   */
  findAllEntities(): Promise<Entity[]>;

  /**
   * 存在確認
   */
  exists(id: EntityId): Promise<boolean>;
}
```

## 📁 ファイル構造規約

```
app/domain/
├── aggregates/
│   └── {entity-name}/                    # ケバブケース
│       ├── {entity-name}.ts              # メインAggregate
│       └── {entity-name}-repository.ts   # Repository interface
├── events/
│   └── {entity-name}-events.ts           # Domain Events（必要時のみ）
├── value-objects/
│   └── entity-ids.ts                     # Branded Types定義
└── constants/
    └── {entity-name}.ts                  # エンティティ固有定数
```

## 🎯 粒度基準（User Aggregate基準）

### **エンティティサイズ**
- **主要プロパティ**: 3-5個（idとisActiveを含む）
- **ビジネスメソッド**: 3-7個の核となる操作
- **単一責任**: 1つの明確なビジネス概念を表現

### **バリデーション戦略**
```typescript
// ✅ 推奨: 即座にthrow
if (!isValidBusinessRule(value)) {
  throw new Error("明確なビジネスエラーメッセージ");
}

// ❌ 禁止: 複雑なResult型
return { success: false, error: { type: 'BusinessError', ... } };
```

### **ID管理戦略**
```typescript
// ✅ 推奨: Branded Types使用
export type UserId = Brand<string, symbol>;
export type JobId = Brand<number, symbol>;

// 外部→内部変換
const user = UserFunctions.create("user123", 2);  // string入力
const userId = UserFunctions.helpers.getId(user); // UserId出力
```

## 🎭 イベント設計指針

### **Domain Events（Domain層）**
ビジネス上重要な状態変化に対してのみ定義：

```typescript
// domain/events/job-execution-events.ts
export type JobExecutionEvent = 
  | { type: 'JobStarted'; jobId: JobId; nodeId: NodeId; startedAt: Date }
  | { type: 'JobCompleted'; jobId: JobId; duration: number; outputSize: number }
  | { type: 'JobFailed'; jobId: JobId; error: JobExecutionError };

// Aggregateでイベント生成
export const JobFunctions = {
  startExecution: (job: Job, nodeId: NodeId): [Job, JobExecutionEvent] => {
    const updatedJob = { ...job, status: 'running' as const, nodeId };
    const event: JobExecutionEvent = {
      type: 'JobStarted',
      jobId: job.id,
      nodeId,
      startedAt: new Date()
    };
    return [updatedJob, event];
  }
};
```

### **Application Events（Application層）**
SSE通知等のシステム統合用：

```typescript
// application/services/job-application-service.ts
private mapToSSEEvent(event: JobExecutionEvent): SSEEvent {
  return {
    type: 'job_status_changed',
    jobId: event.jobId,
    timestamp: new Date().toISOString(),
    // SSE固有フィールド
  };
}
```

## 🔒 命名規約

### **ファイル名**
- **ケバブケース**: `job-execution.ts`, `user-repository.ts`
- **明確な名詞**: エンティティ名を明確に表現

### **型名**
- **PascalCase**: `User`, `JobExecution`, `NodeStatus`
- **説明的**: `UserCreationData`, `JobExecutionEvent`

### **関数名**
- **camelCase**: `createUser`, `changeStatus`, `canExecuteJob`
- **動詞ベース**: 動作を明確に表現

### **イベント名**
- **過去形**: `JobStarted`, `UserDeactivated`, `NodeAssigned`
- **EntityAction形式**: 何が何をしたかを明確に

## ✅ 実装チェックリスト

### **Domain層**
- [ ] Branded Types使用（entity-ids.tsから）
- [ ] 不変データ構造（readonly修飾）
- [ ] 純粋関数実装（副作用なし）
- [ ] 例外ベースエラー処理
- [ ] Domain Events定義（ビジネス重要時のみ）
- [ ] Repository interface作成
- [ ] domain/index.ts export追加

### **Application層**
- [ ] Domain Event → SSE Event変換
- [ ] トランザクション管理
- [ ] 複数システム統合オーケストレーション
- [ ] エラーハンドリング

### **型安全性**
- [ ] TypeScriptコンパイル成功
- [ ] Branded Types正しく使用
- [ ] Import/Export整合性

## 🚫 禁止事項

### **Domain層**
- ❌ Mutableな状態変更（`entity.field = newValue`）
- ❌ Domain層でのSSE要件混入
- ❌ Infrastructure関心事の混入（DB操作、HTTP通信等）
- ❌ タイムスタンプのDomain層処理（Infrastructure層で）

### **コード品質**
- ❌ 複雑なResult<T,E>パターン（例外使用推奨）
- ❌ 過度な抽象化レイヤー
- ❌ 20人規模を超える複雑性
- ❌ 用途不明な将来対応コード（YAGNI原則）

## 📋 対象Aggregates

### **実装予定リスト**
1. **User Aggregate** ✅ 完了（基準実装）
2. **Job Aggregate**（ジョブ実行管理・Domain Eventsあり）
3. **Node Aggregate**（実行ノード管理）
4. **FileRecord Aggregate**（ファイル管理）

### **優先度基準**
- **高**: ビジネスクリティカル（Job, User）
- **中**: 運用管理（Node, FileRecord）
- **低**: 付随機能（ログ、統計等）

## 🌟 使用例

```typescript
import { UserFunctions, type User } from "~/domain";

// ✅ 正しい使用法
const user = UserFunctions.create("user123", 2);
const updatedUser = UserFunctions.changeMaxConcurrentJobs(user, 3);

// クエリ操作
if (UserFunctions.canRunConcurrentJobs(user, 1)) {
  // ジョブ実行処理
}

// 型安全性
const userId = UserFunctions.helpers.getId(user); // UserId型
```

## 📈 メリット

1. **型安全性**: コンパイル時の型チェック
2. **不変性**: 予期しない状態変更の防止
3. **テスト容易性**: 純粋関数のテスト
4. **保守性**: 明確な責任分離
5. **拡張性**: 新機能追加の容易さ
6. **一貫性**: プロジェクト全体での統一パターン

---

## 📚 参考資料

- [User Aggregate実装例](../../app/domain/aggregates/user/user.ts)
- [Entity IDs定義](../../app/domain/value-objects/entity-ids.ts)
- [プロジェクト開発方針](../../CLAUDE.md)

---

**更新日**: 2025年1月
**作成者**: Claude Code AI Assistant
**対象**: Abaqus Job Manager Development Team