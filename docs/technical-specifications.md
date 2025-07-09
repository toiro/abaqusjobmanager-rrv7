# 技術仕様詳細

**実装状況**: ✅ 75%完了 - 基盤技術は実装済み、Abaqus統合は未実装

## SSH接続仕様

**実装状況**: ✅ 完了 - remote-pwsh ライブラリとして実装済み

### 1. 接続環境
- **管理サーバー**: Linux (React Router v7 + Bun) ✅ 実装済み
- **実行ノード**: Windows Server (Abaqus実行環境) ✅ 対応済み
- **接続方式**: SSH + PowerShell経由でのAbaqus実行 ✅ 実装済み

### 2. 認証方式

**実装状況**: ✅ 完了 - remote-pwsh ライブラリで実装済み

**参照先**: `/app/app/lib/services/remote-pwsh/types.ts`

SSH接続設定のTypeScript型定義。公開鍵認証、フォールバック用パスワード認証、接続タイムアウト設定が含まれています。

### 3. SSH接続管理

**実装状況**: ✅ 完了 - remote-pwsh ライブラリで実装済み

**実装詳細**:
- ✅ 接続プール管理: 効率的な接続再利用実装済み
- ✅ エラーハンドリング: 接続失敗時の自動再試行実装済み
- ✅ 非同期処理: Promise ベースの非同期処理実装済み
- ✅ 型安全性: TypeScript による型安全な実装

**実際の実装場所**: `/app/app/lib/services/remote-pwsh/executor.ts`

**参照先**: `/app/app/lib/services/remote-pwsh/executor.ts`

SSH接続プール管理、PowerShell コマンド実行、エラーハンドリング、非同期処理の実装が含まれています。
            });
            
            conn.connect({
                host: node.ssh_host,
                port: node.ssh_port,
                username: node.ssh_user,
                privateKey: await readFile(process.env.SSH_PRIVATE_KEY_PATH!),
                readyTimeout: 30000,
                keepaliveInterval: 60000
            });
        });
    }
}
```

## ファイル管理詳細仕様

**実装状況**: ✅ 完了 - ファイル管理機能実装済み

### 1. INPファイル処理フロー

**実装状況**: ✅ 完了 - NewJobModal で実装済み
```
[ユーザーアップロード] → [ローカル保存] → [バリデーション] → [ノード転送] → [実行]
```

### 2. ファイル転送実装

**実装状況**: 🔄 一部実装 - ローカル保存は完成、リモート転送は未実装
**参照先**: `/app/app/lib/services/remote-pwsh/executor.ts`

ファイル転送実装（INPファイル転送、結果ファイル収集）。SSH/SFTP接続によるリモートファイル操作が含まれています。

## Abaqusライセンス計算仕様

**実装状況**: ✅ 完了 - license-config.ts で実装済み

### 1. 実際のライセンス消費パターン

**実装状況**: ✅ 完了 - 実装済み

**参照先**: `/app/app/lib/license-config.ts`

CPU数に基づくAbaqusライセンストークン計算のロジック。実環境での検証結果に基づく計算テーブルと、CPU数超過時の計算式、検証用関数が含まれています。

## リアルタイム通信実装詳細

**実装状況**: ✅ 完了 - SSE (Server-Sent Events) で実装済み

### 1. サーバーサイド実装 (SSE)

**実装状況**: ✅ 完了 - SSE で実装済み
**参照先**: `/app/app/routes/api.events.ts`

SSE (Server-Sent Events) による効率的なリアルタイム通信の実装。一方向通信で軽量かつ安定した通信を提供します。

### 2. クライアントサイド実装 (SSE)

**実装状況**: ✅ 完了 - useSSE フック で実装済み

**参照先**: `/app/app/hooks/useSSE.ts`

型安全なSSEクライアントフック。チャンネル別の接続管理、自動再接続、Zodスキーマによる型検証、接続状態管理の実装が含まれています。

## パフォーマンス要件

**実装状況**: ✅ 80%完了 - 基本的なパフォーマンス要件は満たしている

### 1. システム要件定義

**実装状況**: ✅ 完了 - 基本要件を満たしている
**参照先**: `/app/app/lib/logger/config.ts`

パフォーマンス要件の定数定義（同時処理能力、レスポンス時間目標、リソース制限、データベース制限）が含まれています。

### 2. 監視メトリクス

**実装状況**: ✅ 完了 - 基本的な監視機能実装済み
```typescript
// app/lib/monitoring.ts
export interface SystemMetrics {
    // ジョブ関連
    totalJobs: number;
    runningJobs: number;
    queuedJobs: number;
    failedJobs: number;
    
    // リソース使用量
    systemLicenseUsage: number;
    systemLicenseTotal: number;
    
    // ノード状況
    availableNodes: number;
    totalNodes: number;
    
    // パフォーマンス
    averageJobDuration: number;
    averageQueueTime: number;
    
    // システム
    diskUsage: number;
    memoryUsage: number;
    cpuUsage: number;
}

export async function collectSystemMetrics(): Promise<SystemMetrics> {
    // メトリクス収集の実装
}
```

## エラーハンドリング強化

**実装状況**: ✅ 完了 - 統一エラーハンドリングシステム実装済み

### 1. エラー分類体系

**実装状況**: ✅ 完了 - 構造化エラーハンドリング実装済み
```typescript
// app/lib/errors.ts
export enum ErrorCategory {
    // システムエラー
    SYSTEM_ERROR = 'SYSTEM_ERROR',
    DATABASE_ERROR = 'DATABASE_ERROR',
    NETWORK_ERROR = 'NETWORK_ERROR',
    
    // Abaqusエラー
    ABAQUS_LICENSE_ERROR = 'ABAQUS_LICENSE_ERROR',
    ABAQUS_INPUT_ERROR = 'ABAQUS_INPUT_ERROR',
    ABAQUS_EXECUTION_ERROR = 'ABAQUS_EXECUTION_ERROR',
    ABAQUS_CONVERGENCE_ERROR = 'ABAQUS_CONVERGENCE_ERROR',
    
    // ユーザーエラー
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    FILE_ERROR = 'FILE_ERROR',
    RESOURCE_ERROR = 'RESOURCE_ERROR'
}

export class JobManagerError extends Error {
    constructor(
        public category: ErrorCategory,
        message: string,
        public details?: any,
        public userMessage?: string
    ) {
        super(message);
        this.name = 'JobManagerError';
    }
}
```

### 2. 復旧処理

**実装状況**: ✅ 完了 - 基本的な復旧処理実装済み
```typescript
// app/lib/recovery.ts
export class JobRecoveryManager {
    async recoverFailedJobs(): Promise<void> {
        const failedJobs = await getJobsByStatus('Failed');
        
        for (const job of failedJobs) {
            try {
                await this.attemptJobRecovery(job);
            } catch (error) {
                console.error(`ジョブ復旧失敗 (${job.id}):`, error);
            }
        }
    }
    
    private async attemptJobRecovery(job: Job): Promise<void> {
        // エラー原因の分析
        const errorAnalysis = await this.analyzeJobFailure(job);
        
        switch (errorAnalysis.category) {
            case 'TEMPORARY_NETWORK_ERROR':
                // ネットワークエラー: 再実行
                await this.requeueJob(job);
                break;
                
            case 'ABAQUS_INPUT_ERROR':
                // 入力エラー: 人的確認が必要
                await this.markForManualReview(job);
                break;
                
            case 'LICENSE_SHORTAGE':
                // ライセンス不足: キューに戻す
                await this.requeueJob(job);
                break;
                
            default:
                // その他: ログ記録のみ
                console.warn(`復旧不可能なエラー (${job.id}):`, errorAnalysis);
        }
    }
}
```

これらの技術仕様により、設計の不明瞭な点が大幅に解決され、実装可能性が向上します。