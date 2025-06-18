# 技術仕様詳細

## SSH接続仕様

### 1. 接続環境
- **管理サーバー**: Linux (React Router v7 + Bun)
- **実行ノード**: Windows Server (Abaqus実行環境)
- **接続方式**: SSH + PowerShell経由でのAbaqus実行

### 2. 認証方式
```typescript
interface SSHConfig {
    host: string;
    port: number;
    username: string;
    // 公開鍵認証（推奨）
    privateKeyPath: string;
    passphrase?: string;
    // フォールバック用パスワード認証
    password?: string;
    // 接続設定
    readyTimeout: number; // 30000ms
    keepaliveInterval: number; // 60000ms
}
```

### 3. SSH接続管理
```typescript
// app/lib/sshManager.ts
import { Client } from 'ssh2';

export class SSHManager {
    private connections = new Map<string, Client>();
    
    async getConnection(nodeId: string): Promise<Client> {
        if (this.connections.has(nodeId)) {
            return this.connections.get(nodeId)!;
        }
        
        const node = await getNodeById(nodeId);
        const conn = new Client();
        
        return new Promise((resolve, reject) => {
            conn.on('ready', () => {
                this.connections.set(nodeId, conn);
                resolve(conn);
            });
            
            conn.on('error', (err) => {
                reject(new Error(`SSH接続失敗 (${nodeId}): ${err.message}`));
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

### 1. INPファイル処理フロー
```
[ユーザーアップロード] → [ローカル保存] → [バリデーション] → [ノード転送] → [実行]
```

### 2. ファイル転送実装
```typescript
// app/lib/fileTransfer.ts
export class FileTransfer {
    async transferInpFile(jobId: number, localPath: string, targetNode: string): Promise<string> {
        const ssh = await sshManager.getConnection(targetNode);
        const remotePath = `/abaqus/jobs/${jobId}/input.inp`;
        
        return new Promise((resolve, reject) => {
            ssh.sftp((err, sftp) => {
                if (err) reject(err);
                
                sftp.fastPut(localPath, remotePath, (err) => {
                    if (err) {
                        reject(new Error(`ファイル転送失敗: ${err.message}`));
                    } else {
                        resolve(remotePath);
                    }
                });
            });
        });
    }
    
    async collectResultFiles(jobId: number, nodeId: string): Promise<void> {
        const resultTypes = ['sta', 'dat', 'log', 'msg'];
        const ssh = await sshManager.getConnection(nodeId);
        
        for (const type of resultTypes) {
            try {
                await this.downloadFile(
                    ssh,
                    `/abaqus/jobs/${jobId}/${jobId}.${type}`,
                    `./results/${jobId}/${jobId}.${type}`
                );
            } catch (error) {
                console.warn(`結果ファイル取得失敗 (${type}):`, error);
            }
        }
    }
}
```

## Abaqusライセンス計算仕様

### 1. 実際のライセンス消費パターン
```typescript
// app/lib/licenseCalculator.ts (更新版)
/**
 * 実際のAbaqusライセンス消費パターンに基づく計算
 * 注意: 実環境での検証結果に基づいて調整が必要
 */
export function calculateLicenseTokens(cpuCount: number): number {
    // Abaqus 2023の実際のライセンス消費パターン
    // (要: 実環境での検証)
    const LICENSE_TABLE: Record<number, number> = {
        1: 1,
        2: 2,
        3: 3,
        4: 5,   // 実測値例: 4CPUで5トークン
        5: 6,
        6: 7,
        7: 8,
        8: 12,  // 実測値例: 8CPUで12トークン
    };
    
    if (LICENSE_TABLE[cpuCount]) {
        return LICENSE_TABLE[cpuCount];
    }
    
    // 8コア超過時の計算式（要調整）
    return Math.floor(cpuCount * 1.5 + 2);
}

// 実環境での検証用関数
export async function verifyLicenseCalculation(): Promise<void> {
    console.log('ライセンス計算検証:');
    console.log('2CPU:', calculateLicenseTokens(2), 'トークン');
    console.log('4CPU:', calculateLicenseTokens(4), 'トークン');
    console.log('8CPU:', calculateLicenseTokens(8), 'トークン');
    
    // TODO: 実際のAbaqus環境でのライセンス消費確認
    // abaqus licensing ru などのコマンドでの確認
}
```

## WebSocket実装詳細

### 1. サーバーサイド実装
```typescript
// app/server.ts
import { WebSocketServer } from 'ws';

export class JobWebSocketManager {
    private wss: WebSocketServer;
    private clients = new Set<WebSocket>();
    
    constructor(server: any) {
        this.wss = new WebSocketServer({ server });
        this.setupWebSocket();
    }
    
    private setupWebSocket() {
        this.wss.on('connection', (ws, request) => {
            const userId = new URL(request.url!, 'http://localhost').searchParams.get('user_id');
            
            this.clients.add(ws);
            console.log(`WebSocket接続確立: ${userId}`);
            
            ws.on('close', () => {
                this.clients.delete(ws);
                console.log(`WebSocket接続終了: ${userId}`);
            });
            
            ws.on('error', (error) => {
                console.error('WebSocketエラー:', error);
                this.clients.delete(ws);
            });
        });
    }
    
    broadcast(event: string, data: any) {
        const message = JSON.stringify({ event, data, timestamp: Date.now() });
        
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                try {
                    client.send(message);
                } catch (error) {
                    console.error('WebSocket送信エラー:', error);
                    this.clients.delete(client);
                }
            }
        });
    }
}
```

### 2. クライアントサイド実装
```typescript
// app/hooks/useWebSocket.ts
import { useEffect, useRef, useState } from 'react';

export function useJobWebSocket(userId: string) {
    const ws = useRef<WebSocket | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
    
    useEffect(() => {
        const connectWebSocket = () => {
            ws.current = new WebSocket(`ws://localhost:3000/ws?user_id=${userId}`);
            
            ws.current.onopen = () => {
                setConnectionStatus('connected');
                console.log('WebSocket接続成功');
            };
            
            ws.current.onmessage = (event) => {
                try {
                    const { event: eventType, data } = JSON.parse(event.data);
                    handleWebSocketMessage(eventType, data);
                } catch (error) {
                    console.error('WebSocketメッセージ解析エラー:', error);
                }
            };
            
            ws.current.onclose = () => {
                setConnectionStatus('disconnected');
                console.log('WebSocket接続終了');
                // 自動再接続
                setTimeout(connectWebSocket, 3000);
            };
            
            ws.current.onerror = (error) => {
                console.error('WebSocketエラー:', error);
                setConnectionStatus('disconnected');
            };
        };
        
        connectWebSocket();
        
        return () => {
            ws.current?.close();
        };
    }, [userId]);
    
    return { connectionStatus };
}
```

## パフォーマンス要件

### 1. システム要件定義
```typescript
export const PERFORMANCE_REQUIREMENTS = {
    // 同時処理能力
    MAX_CONCURRENT_JOBS: 50,
    MAX_CONCURRENT_UPLOADS: 10,
    MAX_NODES: 20,
    
    // レスポンス時間目標
    API_RESPONSE_TIME: 500, // ms
    FILE_UPLOAD_TIMEOUT: 300000, // 5分
    JOB_QUEUE_PROCESSING_INTERVAL: 5000, // 5秒
    
    // リソース制限
    MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
    MAX_RESULT_FILE_RETENTION: 30, // 日
    MAX_LOG_RETENTION: 90, // 日
    
    // データベース
    DB_CONNECTION_POOL_SIZE: 10,
    MAX_DB_QUERY_TIME: 1000, // ms
} as const;
```

### 2. 監視メトリクス
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

### 1. エラー分類体系
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