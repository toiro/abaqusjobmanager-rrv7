# Event System Architecture

## 概要

Abaqus Job Managerでは、フロントエンドとの通信およびバックエンドのジョブ実行管理において、EventEmitterベースのイベントシステムを採用しています。本ドキュメントでは、このイベントシステムの設計方針、実装戦略、および具体的な実装方法について説明します。

## アーキテクチャ決定

### 設計原則

1. **責任の分離**: SSE用とジョブ実行用でEventEmitterを分離
2. **型安全性**: TypeScriptの型システムを活用した厳密な型定義
3. **拡張性**: 将来的な機能追加に対応できる柔軟な設計
4. **セキュリティ**: 内部処理情報の外部流出防止

### EventEmitter分離戦略

#### 分離理由

**Pattern B (分離EventEmitter型)** を採用する理由：

1. **セキュリティの確保**
   - 内部処理イベントがSSEクライアントに流出するリスクを排除
   - 機密情報の適切な分離

2. **パフォーマンスの最適化**
   - SSE用とジョブ実行用で異なる最適化戦略
   - 不要なvalidationやserializationの回避

3. **明確な責任分離**
   - SSE: フロントエンド通知専用
   - JobExecution: バックエンド処理専用

4. **スケーラビリティ**
   - 将来的なマイクロサービス化への対応
   - 独立したデプロイメント戦略

## EventEmitterクラス設計

### 基底クラス共通化 (Option A)

**理由**: コードの重複排除と一貫したAPIの提供

```typescript
// lib/events/base-event-emitter.ts
export abstract class BaseEventEmitter<TEventMap = Record<string, unknown>> {
  protected listeners: Map<string, Set<(data: unknown) => void>> = new Map();
  
  on(event: string, callback: (data: unknown) => void): void { ... }
  off(event: string, callback: (data: unknown) => void): void { ... }
  emit(event: string, data: unknown): void { ... }
  
  // 共通ユーティリティ
  removeAllListeners(): void { ... }
  listenerCount(event: string): number { ... }
  getEventNames(): string[] { ... }
}
```

### 型安全性の実装

```typescript
// SSE用イベント型定義
interface SSEEvents {
  files: FileEventData;
  jobs: JobEventData;
  nodes: NodeEventData;
  users: UserEventData;
  system: SystemEventData;
}

// ジョブ実行用イベント型定義
interface JobExecutionEvents {
  'job.started': JobStartedData;
  'job.progress': JobProgressData;
  'job.completed': JobCompletedData;
  'job.failed': JobFailedData;
  'job.cancelled': JobCancelledData;
}
```

## 実装戦略

### Phase 1: 基底クラス抽出

#### 目標
- 既存の`EventEmitter`クラスを基底クラスとして抽出
- 共通機能の実装
- 基本的な型安全性の導入

#### 実装内容

```typescript
// lib/events/base-event-emitter.ts
export abstract class BaseEventEmitter<TEventMap = Record<string, unknown>> {
  protected listeners: Map<string, Set<(data: unknown) => void>> = new Map();

  on(event: string, callback: (data: unknown) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (data: unknown) => void): void {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event: string, data: unknown): void {
    this.listeners.get(event)?.forEach(callback => callback(data));
  }

  // 共通ユーティリティメソッド
  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  listenerCount(event: string): number {
    return this.listeners.get(event)?.size ?? 0;
  }

  getEventNames(): string[] {
    return Array.from(this.listeners.keys());
  }
}
```

### Phase 2: 特化クラス実装

#### SSE EventEmitter

```typescript
// lib/events/sse-event-emitter.ts
import { BaseEventEmitter } from './base-event-emitter';
import { logger } from '~/lib/logger';
import type { SSEChannel, SSEEvents } from '~/lib/sse-schemas';

export class SSEEventEmitter extends BaseEventEmitter<SSEEvents> {
  /**
   * 特定のSSEチャンネルにイベントを送信
   */
  emitToChannel(channel: SSEChannel, data: unknown): void {
    try {
      // SSE固有のvalidation
      this.validateSSEEvent(data);
      
      // チャンネル固有のロギング
      logger.debug('SSE event emitted', `SSE:${channel}`, { channel, data });
      
      this.emit(channel, data);
    } catch (error) {
      logger.error('SSE event emission failed', `SSE:${channel}`, { error, data });
    }
  }

  /**
   * SSEイベントの構造validation
   */
  private validateSSEEvent(data: unknown): void {
    // SSE固有のvalidationロジック
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid SSE event data structure');
    }
  }

  /**
   * 接続中のクライアント数を取得
   */
  getActiveConnections(channel: SSEChannel): number {
    return this.listenerCount(channel);
  }
}

// シングルトンインスタンス
export const sseEventEmitter = new SSEEventEmitter();
```

#### Job Execution EventEmitter

```typescript
// lib/events/job-execution-emitter.ts
import { BaseEventEmitter } from './base-event-emitter';
import { logger } from '~/lib/logger';
import type { JobExecutionEvents } from './types';

export class JobExecutionEmitter extends BaseEventEmitter<JobExecutionEvents> {
  /**
   * ジョブイベントの型安全な発行
   */
  emitJobEvent<K extends keyof JobExecutionEvents>(
    event: K, 
    data: JobExecutionEvents[K]
  ): void {
    try {
      // ジョブ実行固有のロギング
      logger.info('Job execution event', 'JobExecution', { event, data });
      
      this.emit(event as string, data);
    } catch (error) {
      logger.error('Job execution event failed', 'JobExecution', { error, event, data });
    }
  }

  /**
   * ジョブステータス変更の監視
   */
  onJobStatusChange(callback: (data: JobExecutionEvents['job.status_changed']) => void): void {
    this.on('job.status_changed', callback);
  }

  /**
   * ジョブ進捗の監視
   */
  onJobProgress(callback: (data: JobExecutionEvents['job.progress']) => void): void {
    this.on('job.progress', callback);
  }
}

// シングルトンインスタンス
export const jobExecutionEmitter = new JobExecutionEmitter();
```

### Phase 3: イベント連携システム

#### SSEとJobExecution間の連携

```typescript
// lib/events/event-bridge.ts
import { jobExecutionEmitter } from './job-execution-emitter';
import { emitJobEvent } from '~/lib/sse';
import { logger } from '~/lib/logger';

/**
 * ジョブ実行イベントをSSEイベントに変換・配信
 */
export function initializeEventBridge(): void {
  // ジョブ開始 → SSE通知
  jobExecutionEmitter.on('job.started', (data) => {
    emitJobEvent('status_changed', {
      jobId: data.jobId,
      status: 'starting',
      nodeId: data.nodeId,
      timestamp: new Date().toISOString()
    });
  });

  // ジョブ進捗 → SSE通知（間引き制御付き）
  let lastProgressEmit = 0;
  jobExecutionEmitter.on('job.progress', (data) => {
    const now = Date.now();
    // 1秒間に1回まで
    if (now - lastProgressEmit > 1000) {
      emitJobEvent('status_changed', {
        jobId: data.jobId,
        status: 'running',
        progress: data.progress,
        timestamp: new Date().toISOString()
      });
      lastProgressEmit = now;
    }
  });

  // ジョブ完了 → SSE通知
  jobExecutionEmitter.on('job.completed', (data) => {
    emitJobEvent('status_changed', {
      jobId: data.jobId,
      status: 'completed',
      result: {
        outputPath: data.outputPath,
        executionTime: data.executionTime
      },
      timestamp: new Date().toISOString()
    });
  });

  // ジョブ失敗 → SSE通知
  jobExecutionEmitter.on('job.failed', (data) => {
    emitJobEvent('status_changed', {
      jobId: data.jobId,
      status: 'failed',
      error: {
        message: data.error.message,
        // sensitiveな情報は除外
      },
      timestamp: new Date().toISOString()
    });
  });

  logger.info('Event bridge initialized', 'EventBridge');
}
```

## 型定義

### ジョブ実行イベント型

```typescript
// lib/events/types.ts
export interface JobExecutionEvents {
  'job.started': {
    jobId: number;
    nodeId: number;
    userId: number;
    inputFile: string;
    cpuCores: number;
    startTime: string;
  };

  'job.progress': {
    jobId: number;
    progress: number; // 0-100
    currentStep: string;
    estimatedTimeRemaining?: number;
  };

  'job.completed': {
    jobId: number;
    outputPath: string;
    executionTime: number;
    completedAt: string;
    summary: {
      cpuTime: number;
      memoryPeak: number;
      warnings: string[];
    };
  };

  'job.failed': {
    jobId: number;
    error: {
      code: string;
      message: string;
      details?: unknown;
      abaqusLog?: string;
    };
    failedAt: string;
  };

  'job.cancelled': {
    jobId: number;
    cancelledBy: number;
    cancelledAt: string;
    reason?: string;
  };

  'job.status_changed': {
    jobId: number;
    fromStatus: string;
    toStatus: string;
    changedAt: string;
  };
}
```

## 使用例

### ジョブ実行管理での使用

```typescript
// lib/job-execution/job-runner.ts
import { jobExecutionEmitter } from '~/lib/events/job-execution-emitter';

export class AbaqusJobRunner {
  async executeJob(jobId: number, jobConfig: JobConfig): Promise<void> {
    try {
      // ジョブ開始イベント
      jobExecutionEmitter.emitJobEvent('job.started', {
        jobId,
        nodeId: jobConfig.nodeId,
        userId: jobConfig.userId,
        inputFile: jobConfig.inputFile,
        cpuCores: jobConfig.cpuCores,
        startTime: new Date().toISOString()
      });

      // Abaqus実行
      const result = await this.runAbaqus(jobConfig);

      // 進捗イベント
      for await (const progress of this.monitorProgress(jobId)) {
        jobExecutionEmitter.emitJobEvent('job.progress', {
          jobId,
          progress: progress.percentage,
          currentStep: progress.step,
          estimatedTimeRemaining: progress.eta
        });
      }

      // 完了イベント
      jobExecutionEmitter.emitJobEvent('job.completed', {
        jobId,
        outputPath: result.outputPath,
        executionTime: result.executionTime,
        completedAt: new Date().toISOString(),
        summary: result.summary
      });

    } catch (error) {
      // 失敗イベント
      jobExecutionEmitter.emitJobEvent('job.failed', {
        jobId,
        error: {
          code: error.code || 'UNKNOWN_ERROR',
          message: error.message,
          details: error.details,
          abaqusLog: error.abaqusLog
        },
        failedAt: new Date().toISOString()
      });
    }
  }
}
```

### SSEでの使用

```typescript
// routes/api.events.ts で既存のSSEEventEmitterを使用
import { sseEventEmitter } from '~/lib/events/sse-event-emitter';

export async function loader({ request }: Route.LoaderArgs) {
  // ... 既存のSSE実装にsseEventEmitterを統合
  sseEventEmitter.on(channel, listener);
}
```

## マイグレーション計画

### Step 1: 基底クラス作成
- `BaseEventEmitter`クラスの実装
- 既存コードへの影響なし

### Step 2: SSE EventEmitter移行
- `api.events.ts`の`EventEmitter`を`SSEEventEmitter`に移行
- 既存のSSE機能の動作確認

### Step 3: Job Execution EventEmitter実装
- `JobExecutionEmitter`の実装
- イベントブリッジシステムの構築

### Step 4: 統合テスト
- SSEとジョブ実行の連携動作確認
- パフォーマンステスト

## セキュリティ考慮事項

### 情報分離
- ジョブ実行イベントに機密情報を含める場合の適切な分離
- SSE配信時の情報フィルタリング

### エラーハンドリング
- イベント発行失敗時の適切な処理
- デッドロック防止

### ログ出力
- デバッグ情報の適切な制御
- 本番環境でのログレベル調整

## パフォーマンス考慮事項

### イベント頻度制御
- 高頻度イベント（進捗更新等）の間引き処理
- メモリリーク防止

### リスナー管理
- 不要なイベントリスナーの適切な削除
- イベントリスナー数の監視

## 今後の拡張計画

### Phase 4: イベント永続化
- 重要なイベントのデータベース保存
- イベント履歴の管理

### Phase 5: 分散イベント処理
- 複数ノード間でのイベント共有
- Redis Pub/Subとの連携

### Phase 6: イベント分析
- イベントデータの分析・可視化
- パフォーマンス監視ダッシュボード

---

このイベントシステムアーキテクチャにより、スケーラブルで保守性の高いAbaqus Job Managerシステムを構築します。