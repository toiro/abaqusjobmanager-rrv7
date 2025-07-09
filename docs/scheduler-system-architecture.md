# Scheduler System Architecture

## 📋 目次

1. [概要](#概要)
2. [アーキテクチャ](#アーキテクチャ)
3. [共通基盤](#共通基盤)
4. [スケジューラータイプ](#スケジューラータイプ)
5. [監視とヘルスチェック](#監視とヘルスチェック)
6. [使用方法](#使用方法)
7. [既存スケジューラーの移行](#既存スケジューラーの移行)
8. [拡張ガイド](#拡張ガイド)

---

## 概要

### 設計目標
Abaqus Job Manager のスケジューラーシステムは、サーバーサイドで動作する定期タスクの統一管理を提供します。

**主な特徴:**
- ✅ **統一インターフェース**: すべてのスケジューラーが共通の基盤を使用
- ✅ **適応的スケジューリング**: タスク結果に基づく動的間隔調整
- ✅ **包括的監視**: ヘルスチェック、統計、アラート機能
- ✅ **グレースフルシャットダウン**: 安全な停止処理
- ✅ **型安全性**: TypeScript による完全な型定義
- ✅ **後方互換性**: 既存スケジューラーとの互換性維持

### 対象システム
- **SSE クリーンアップ**: デッドリスナーの定期削除
- **ノードヘルスチェック**: Abaqus実行ノードの状態監視
- **ジョブ実行管理**: （将来実装予定）
- **システムメンテナンス**: ログローテーション、一時ファイル削除等

---

## アーキテクチャ

### 全体構成図
```
┌─────────────────────────────────────────────────────────────┐
│                    Scheduler System                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────────┐ │
│  │ SchedulerRegistry│    │SchedulerMonitor │    │Admin API │ │
│  │   (Management)  │    │   (Health)      │    │(Control) │ │
│  └─────────────────┘    └─────────────────┘    └──────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                BaseScheduler (Abstract)                 │ │
│  │  - Lifecycle management                                 │ │
│  │  - Statistics tracking                                  │ │
│  │  - Health monitoring                                    │ │
│  │  - Error handling                                       │ │
│  └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐              ┌─────────────────────┐  │
│  │IntervalScheduler │              │AdaptiveScheduler    │  │
│  │ - Fixed intervals│              │ - Dynamic intervals │  │
│  │ - Simple tasks   │              │ - Result-based      │  │
│  │ - Cleanup jobs   │              │ - Health checks     │  │
│  └──────────────────┘              └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────┐  │
│  │SSE Cleanup      │    │Node Health      │    │Future   │  │
│  │Scheduler        │    │Check Scheduler  │    │Jobs     │  │
│  └─────────────────┘    └─────────────────┘    └─────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### コンポーネント関係図
```
Application Startup
        │
        ├── initializeSchedulerSystem()
        │
        ├── SSE System Import
        │   └── sse-cleanup-scheduler (auto-start)
        │
        ├── Health Check System
        │   └── defaultHealthCheckScheduler (auto-start)
        │
        ├── Scheduler Monitor
        │   └── createBasicSchedulerMonitor() (auto-start)
        │
        └── Signal Handlers
            ├── SIGTERM → graceful shutdown
            ├── SIGINT → graceful shutdown
            └── process errors → emergency shutdown
```

---

## 共通基盤

### BaseScheduler (Abstract Class)

#### 主要機能
```typescript
abstract class BaseScheduler {
  // Lifecycle
  public start(): void
  public async stop(): Promise<void>
  public isRunning(): boolean

  // Statistics
  public getStats(): SchedulerStats
  public getHealth(): SchedulerHealth

  // Task execution with error handling
  protected async executeTask(taskFunction: () => Promise<void>): Promise<void>

  // Abstract methods (must implement)
  protected abstract doStart(): void
  protected abstract doStop(): Promise<void>
  protected abstract doCleanup(): Promise<void>
  protected abstract getNextExecutionTime(): Date | undefined
  protected abstract handleTaskError(error: unknown): Promise<void>
}
```

#### 統計情報
```typescript
interface SchedulerStats {
  name: string;
  isRunning: boolean;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  lastExecutionTime?: Date;
  nextExecutionTime?: Date;
  currentExecutionStart?: Date;
  averageExecutionDuration?: number;
}
```

#### ヘルス情報
```typescript
interface SchedulerHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'stopped';
  lastHealthCheck: Date;
  message?: string;
  metrics?: Record<string, any>;
}
```

### SchedulerRegistry (Global Management)

#### 主要機能
```typescript
class SchedulerRegistry {
  static register(scheduler: BaseScheduler): void
  static unregister(scheduler: BaseScheduler): void
  static getAll(): BaseScheduler[]
  static getByName(name: string): BaseScheduler | undefined
  static getOverallStats(): OverallStats
  static async stopAll(): Promise<void>
}
```

#### 自動登録
```typescript
// スケジューラーは作成時に自動的にレジストリに登録される
const scheduler = new IntervalScheduler({
  name: 'my-task',
  intervalMs: 60000
}, taskFunction);
// ↑ 自動的に SchedulerRegistry.register(scheduler) が呼ばれる
```

---

## スケジューラータイプ

### 1. IntervalScheduler (固定間隔)

#### 用途
- 定期クリーンアップタスク
- ログローテーション
- 一時ファイル削除
- 定期的なメトリクス収集

#### 実装例
```typescript
import { createIntervalScheduler, createCleanupScheduler } from '~/lib/scheduler';

// 基本的な間隔スケジューラー
const logRotationScheduler = createIntervalScheduler(
  'log-rotation',
  24 * 60 * 60 * 1000, // 24時間間隔
  async () => {
    await rotateLogFiles();
    await cleanupOldLogs();
  },
  {
    executeImmediately: false,
    maxExecutionTime: 60000 // 最大1分
  }
);

// 簡単なクリーンアップスケジューラー
const tempFileCleanup = createCleanupScheduler(
  'temp-file-cleanup',
  async () => {
    await cleanupTempFiles();
  },
  10 // 10分間隔
);
```

#### 設定オプション
```typescript
interface IntervalSchedulerConfig extends SchedulerConfig {
  intervalMs: number;                    // 実行間隔（ミリ秒）
  executeImmediately?: boolean;          // 開始時即実行（default: false）
  maxExecutionTime?: number;             // 最大実行時間（default: 5 * intervalMs）
}
```

### 2. AdaptiveScheduler (適応的間隔)

#### 用途
- ヘルスチェック
- 負荷監視
- 動的リソース管理
- エラー率に基づく調整が必要なタスク

#### 実装例
```typescript
import { createAdaptiveScheduler, createHealthCheckScheduler } from '~/lib/scheduler';

// 基本的な適応的スケジューラー
const resourceMonitor = createAdaptiveScheduler(
  'resource-monitor',
  60000, // 通常1分間隔
  async (): Promise<AdaptiveTaskResult> => {
    try {
      const usage = await checkResourceUsage();
      
      if (usage.cpu > 80) {
        // 高負荷時はより頻繁にチェック
        return {
          success: true,
          suggestedNextInterval: 30000, // 30秒後
          metadata: { cpuUsage: usage.cpu }
        };
      } else {
        // 正常時は間隔を延ばす
        return {
          success: true,
          suggestedNextInterval: 120000, // 2分後
          metadata: { cpuUsage: usage.cpu }
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error as Error
      };
    }
  },
  {
    minIntervalMs: 15000,    // 最小15秒
    maxIntervalMs: 300000,   // 最大5分
    executeImmediately: true
  }
);

// ヘルスチェック専用スケジューラー
const serviceHealthCheck = createHealthCheckScheduler(
  'service-health',
  async () => {
    const isHealthy = await checkServiceHealth();
    return { 
      success: isHealthy,
      details: { lastCheck: new Date(), serviceVersion: '1.0.0' }
    };
  },
  5 // 通常5分間隔
);
```

#### 適応ロジック
```typescript
// 成功時の間隔調整
if (consecutiveSuccesses >= 5) {
  currentInterval *= 0.8; // 20%短縮
} else if (consecutiveSuccesses >= 10) {
  currentInterval *= 0.6; // 40%短縮
}

// 失敗時の間隔調整
if (consecutiveFailures === 1) {
  currentInterval *= 1.5; // 50%延長
} else if (consecutiveFailures >= 3) {
  currentInterval *= 2;   // 100%延長
} else if (consecutiveFailures >= 5) {
  currentInterval *= 3;   // 200%延長
}
```

---

## 監視とヘルスチェック

### SchedulerMonitor

#### 機能
- 定期的なヘルスチェック
- アラート生成
- パフォーマンス統計
- ステータス変化の検出

#### 実装例
```typescript
import { createSchedulerMonitor } from '~/lib/scheduler';

const monitor = createSchedulerMonitor({
  name: 'system-scheduler-monitor',
  checkIntervalMinutes: 5,
  detailedLogging: true,
  alertThresholds: {
    errorRateThreshold: 0.1,          // 10%以上でdegraded
    criticalErrorRateThreshold: 0.5,  // 50%以上でunhealthy
    maxExecutionTimeMs: 60000         // 1分以上でアラート
  },
  alertHandlers: {
    onDegraded: (health) => {
      console.warn(`Scheduler degraded: ${health.name}`);
    },
    onUnhealthy: (health) => {
      console.error(`Scheduler unhealthy: ${health.name}`);
      // Slack通知、メール送信等
    },
    onRecovered: (health) => {
      console.info(`Scheduler recovered: ${health.name}`);
    }
  }
});

monitor.start();
```

#### レポート生成
```typescript
const report = monitor.generateReport();
console.log('Scheduler Report:', {
  timestamp: report.timestamp,
  summary: {
    total: report.totalSchedulers,
    healthy: report.healthySchedulers,
    degraded: report.degradedSchedulers,
    unhealthy: report.unhealthySchedulers
  },
  alerts: report.alerts.length
});
```

### Admin API

#### エンドポイント
```typescript
// GET /api/scheduler-status - システム状態取得
fetch('/api/scheduler-status', {
  headers: { 'Authorization': 'Bearer ' + adminToken }
})

// POST /api/scheduler-status - 制御操作
fetch('/api/scheduler-status', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + adminToken },
  body: JSON.stringify({
    action: 'stop-scheduler',
    schedulerName: 'sse-cleanup-scheduler'
  })
})
```

#### 利用可能なアクション
- `stop-all`: 全スケジューラー停止
- `get-scheduler`: 特定スケジューラーの状態取得
- `stop-scheduler`: 特定スケジューラー停止
- `start-scheduler`: 特定スケジューラー開始

---

## 使用方法

### 1. 基本的なスケジューラー作成

#### 簡単なクリーンアップタスク
```typescript
import { createCleanupScheduler } from '~/lib/scheduler';

const fileCleanup = createCleanupScheduler(
  'file-cleanup',
  async () => {
    // クリーンアップ処理
    await cleanupTempFiles();
    await removeOldLogs();
  },
  15 // 15分間隔
);

// 自動開始（autoStart: true がデフォルト）
// 手動制御も可能
// fileCleanup.stop();
// fileCleanup.start();
```

#### カスタム間隔スケジューラー
```typescript
import { createIntervalScheduler } from '~/lib/scheduler';

const backupScheduler = createIntervalScheduler(
  'database-backup',
  6 * 60 * 60 * 1000, // 6時間間隔
  async () => {
    await createDatabaseBackup();
    await uploadToS3();
  },
  {
    executeImmediately: false,
    maxExecutionTime: 30 * 60 * 1000, // 最大30分
    autoStart: true
  }
);
```

### 2. 適応的スケジューラー作成

#### リソース監視
```typescript
import { createAdaptiveScheduler } from '~/lib/scheduler';

const resourceMonitor = createAdaptiveScheduler(
  'resource-monitor',
  2 * 60 * 1000, // 通常2分間隔
  async () => {
    const stats = await getSystemStats();
    
    // 高負荷検出
    if (stats.cpuUsage > 80 || stats.memoryUsage > 90) {
      return {
        success: true,
        suggestedNextInterval: 30 * 1000, // 30秒後に再チェック
        metadata: { reason: 'high-load', stats }
      };
    }
    
    // 正常時
    return {
      success: true,
      suggestedNextInterval: 5 * 60 * 1000, // 5分後
      metadata: { reason: 'normal', stats }
    };
  },
  {
    minIntervalMs: 15 * 1000,      // 最小15秒
    maxIntervalMs: 10 * 60 * 1000, // 最大10分
    executeImmediately: true
  }
);
```

### 3. エラーハンドリング

#### カスタムエラー処理
```typescript
class CustomScheduler extends BaseScheduler {
  protected async handleTaskError(error: unknown): Promise<void> {
    // カスタムエラー処理
    if (error instanceof NetworkError) {
      // ネットワークエラーの場合は一時的に間隔を延ばす
      this.temporaryBackoff();
    } else if (error instanceof CriticalError) {
      // 重大なエラーの場合はアラート送信
      await this.sendAlert(error);
    }
    
    // 標準ログ出力
    super.handleTaskError(error);
  }
}
```

### 4. グレースフルシャットダウン

#### 自動シャットダウン設定
```typescript
// scheduler-system.ts で自動的に設定される
process.on('SIGTERM', async () => {
  await SchedulerRegistry.stopAll();
  process.exit(0);
});

// 手動でのシャットダウン
import { SchedulerRegistry } from '~/lib/scheduler';

async function gracefulShutdown() {
  console.log('Shutting down schedulers...');
  await SchedulerRegistry.stopAll();
  console.log('All schedulers stopped');
}
```

---

## 既存スケジューラーの移行

### 1. SSE Cleanup Scheduler

#### 移行前 (レガシー)
```typescript
class SSECleanupScheduler {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private readonly cleanupInterval = 5 * 60 * 1000;

  start() {
    this.intervalId = setInterval(() => {
      this.performCleanup();
    }, this.cleanupInterval);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
```

#### 移行後 (新基盤使用)
```typescript
import { createCleanupScheduler } from './scheduler';

class SSECleanupScheduler {
  private scheduler = createCleanupScheduler(
    'sse-cleanup-scheduler',
    performSSECleanup,
    5 // 5分間隔
  );

  start() { this.scheduler.start(); }
  stop() { return this.scheduler.stop(); }
  getStatus() { return this.scheduler.getStats(); }
}
```

### 2. Health Check Scheduler

#### 移行前 (複雑なロジック)
```typescript
export class HealthCheckScheduler {
  private config: SchedulerConfig;
  private isActive: boolean = false;
  private timeoutId?: NodeJS.Timeout;
  private nodeStates: Map<number, NodeCheckState> = new Map();
  
  // 複雑な間隔計算ロジック
  private calculateNextInterval(): number {
    // 100行以上の複雑なロジック...
  }
}
```

#### 移行後 (適応的スケジューラー使用)
```typescript
import { createAdaptiveScheduler } from './scheduler';

export function createNodeHealthCheckScheduler(config = {}) {
  return createAdaptiveScheduler(
    'node-health-check-scheduler',
    config.normalIntervalMs,
    async () => {
      // ヘルスチェックロジック
      const result = await performHealthChecks();
      return {
        success: result.allHealthy,
        suggestedNextInterval: calculateAdaptiveInterval(result)
      };
    },
    {
      minIntervalMs: config.minIntervalMs,
      maxIntervalMs: config.maxIntervalMs
    }
  );
}
```

### 3. 移行のメリット

#### 統一性
- 同じインターフェースでの制御
- 統一されたログとモニタリング
- 一貫したエラーハンドリング

#### 監視性
- ヘルスチェック機能
- パフォーマンス統計
- 自動アラート機能

#### 運用性
- グレースフルシャットダウン
- Admin API での制御
- デバッグ情報の充実

---

## 拡張ガイド

### 1. 新しいスケジューラーの追加

#### Job Execution Scheduler の例
```typescript
import { createAdaptiveScheduler, type AdaptiveTaskResult } from '~/lib/scheduler';
import { findPendingJobs, executeJob } from '~/lib/job-execution';

export function createJobExecutionScheduler() {
  return createAdaptiveScheduler(
    'job-execution-scheduler',
    30 * 1000, // 通常30秒間隔
    async (): Promise<AdaptiveTaskResult> => {
      try {
        const pendingJobs = await findPendingJobs();
        
        if (pendingJobs.length === 0) {
          // ジョブがない場合は間隔を延ばす
          return {
            success: true,
            suggestedNextInterval: 2 * 60 * 1000, // 2分後
            metadata: { pendingJobs: 0 }
          };
        }

        // ジョブ実行
        const results = await Promise.allSettled(
          pendingJobs.map(job => executeJob(job))
        );

        const successCount = results.filter(r => r.status === 'fulfilled').length;
        const failureCount = results.length - successCount;

        // 失敗が多い場合は間隔を延ばす
        if (failureCount > successCount) {
          return {
            success: false,
            suggestedNextInterval: 60 * 1000, // 1分後
            metadata: { executed: results.length, failed: failureCount }
          };
        }

        // ジョブが多い場合は間隔を短くする
        if (pendingJobs.length > 5) {
          return {
            success: true,
            suggestedNextInterval: 10 * 1000, // 10秒後
            metadata: { executed: results.length, pending: pendingJobs.length }
          };
        }

        return {
          success: true,
          metadata: { executed: results.length }
        };

      } catch (error) {
        return {
          success: false,
          error: error as Error,
          suggestedNextInterval: 2 * 60 * 1000 // エラー時は2分後
        };
      }
    },
    {
      minIntervalMs: 5 * 1000,       // 最小5秒
      maxIntervalMs: 10 * 60 * 1000, // 最大10分
      executeImmediately: true,
      maxExecutionTime: 5 * 60 * 1000 // 最大5分
    }
  );
}

// 使用例
const jobScheduler = createJobExecutionScheduler();
```

### 2. カスタムスケジューラーの作成

#### BaseScheduler を継承
```typescript
import { BaseScheduler, type SchedulerConfig } from '~/lib/scheduler';

interface CustomSchedulerConfig extends SchedulerConfig {
  customParam: string;
  customInterval: number;
}

class CustomScheduler extends BaseScheduler {
  private config: CustomSchedulerConfig;
  private timeoutId?: NodeJS.Timeout;

  constructor(config: CustomSchedulerConfig, private taskFunc: () => Promise<void>) {
    super(config);
    this.config = config;
  }

  protected doStart(): void {
    this.scheduleNext();
  }

  protected async doStop(): Promise<void> {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }
  }

  protected async doCleanup(): Promise<void> {
    // カスタムクリーンアップ処理
  }

  protected getNextExecutionTime(): Date | undefined {
    return this.timeoutId ? 
      new Date(Date.now() + this.config.customInterval) : undefined;
  }

  protected async handleTaskError(error: unknown): Promise<void> {
    // カスタムエラーハンドリング
  }

  private scheduleNext(): void {
    if (!this.isActive) return;

    this.timeoutId = setTimeout(async () => {
      await this.executeTask(this.taskFunc);
      this.scheduleNext();
    }, this.config.customInterval);
  }
}

// 使用例
const customScheduler = new CustomScheduler(
  {
    name: 'custom-task',
    customParam: 'value',
    customInterval: 60000
  },
  async () => {
    await performCustomTask();
  }
);
```

### 3. 高度な監視の追加

#### カスタムメトリクス
```typescript
class AdvancedScheduler extends BaseScheduler {
  private customMetrics = {
    apiCallCount: 0,
    dataProcessedBytes: 0,
    lastApiResponse: null as any
  };

  protected getHealthMetrics(): Record<string, any> {
    const baseMetrics = super.getHealthMetrics();
    
    return {
      ...baseMetrics,
      customMetrics: this.customMetrics,
      apiCallsPerMinute: this.calculateApiCallsPerMinute(),
      dataProcessingRate: this.calculateDataProcessingRate()
    };
  }

  private calculateApiCallsPerMinute(): number {
    // カスタム計算ロジック
    return this.customMetrics.apiCallCount / this.getUptimeMinutes();
  }
}
```

### 4. クラスター対応

#### 分散環境での調整
```typescript
import { createAdaptiveScheduler } from '~/lib/scheduler';

export function createDistributedScheduler(nodeId: string) {
  return createAdaptiveScheduler(
    `distributed-task-${nodeId}`,
    60000,
    async () => {
      // 分散ロック取得
      const lock = await acquireDistributedLock('task-execution');
      
      if (!lock) {
        // 他のノードが実行中
        return {
          success: true,
          suggestedNextInterval: 30000, // 30秒後に再試行
          metadata: { reason: 'lock-not-acquired' }
        };
      }

      try {
        // タスク実行
        await performDistributedTask();
        return { success: true };
      } finally {
        await releaseLock(lock);
      }
    }
  );
}
```

---

## まとめ

### 設計の利点

1. **統一性**: すべてのスケジューラーが同じインターフェースを使用
2. **拡張性**: 新しいスケジューラーを簡単に追加可能
3. **監視性**: 包括的なヘルスチェックと統計
4. **運用性**: グレースフルシャットダウンとAdmin API
5. **型安全性**: TypeScript による完全な型定義
6. **後方互換性**: 既存コードの段階的移行が可能

### 今後の拡張予定

1. **ジョブ実行スケジューラー**: Abaqus ジョブキューの管理
2. **メトリクス収集**: より詳細なパフォーマンス監視
3. **アラート統合**: Slack、メール等の通知システム
4. **Web UI**: スケジューラー管理のためのWeb インターフェース
5. **分散対応**: クラスター環境での協調動作

この設計により、Abaqus Job Manager のスケジューラーシステムは、拡張性と保守性を両立した堅牢な基盤となっています。