# Abaqus Job Manager アーキテクチャ設計

## システム構成

### 全体アーキテクチャ

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Client    │    │  Job Manager    │    │   Abaqus Node   │
│   (Browser)     │◄──►│    Server       │◄──►│   (SSH/PS)      │
│                 │    │ (React Router)  │    │                 │
│ - Job 一覧表示   │    │ - Job Queue管理  │    │ - Abaqus実行     │
│ - 詳細表示       │    │ - 状態監視       │    │ - ファイル出力   │
│ - ファイル       │    │ - INPファイル    │    │                 │
│   アップロード   │    │   管理          │    │                 │
│ - リアルタイム更新│    │ - SSH接続制御    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │   SQLite Database   │
                    │                     │
                    │ - Job情報            │
                    │ - ユーザー情報       │
                    │ - ファイル管理       │
                    │ - 実行ログ          │
                    └─────────────────────┘
```

## コンポーネント設計

### 1. フロントエンド (React Router v7)

#### コンポーネント構成
```
app/
├── routes/
│   ├── _index.tsx           # ジョブ一覧ページ
│   ├── jobs/
│   │   ├── $jobId.tsx       # ジョブ詳細ページ
│   │   ├── new.tsx          # 新規ジョブ作成・INPアップロード
│   │   └── upload.tsx       # ファイルアップロード処理
│   ├── api/
│   │   ├── jobs.ts          # ジョブ管理API
│   │   ├── upload.ts        # ファイルアップロードAPI
│   │   ├── files.ts         # ファイル取得API
│   │   └── nodes.ts         # ノード管理API
│   └── admin/
│       └── nodes.tsx        # ノード管理
├── components/
│   ├── JobTable.tsx         # ジョブ一覧テーブル
│   ├── JobDetails.tsx       # ジョブ詳細表示
│   ├── StatusBadge.tsx      # ステータス表示
│   ├── FileViewer.tsx       # Abaqusファイル表示
│   ├── FileUpload.tsx       # INPファイルアップロード
│   └── RealTimeUpdater.tsx  # リアルタイム更新
├── services/
│   ├── jobService.ts        # ジョブAPI呼び出し
│   ├── websocket.ts         # WebSocket接続
│   ├── fileService.ts       # ファイル取得
│   └── uploadService.ts     # ファイルアップロード
└── lib/
    ├── database.ts          # SQLite接続
    ├── fileManager.ts       # ファイル管理
    └── jobQueue.ts          # ジョブキュー管理
```

#### 状態管理
- React Router v7のローダー/アクションを活用
- WebSocketによるリアルタイム状態更新
- ローカル状態とサーバー状態の同期

### 2. バックエンド (React Router v7 Framework Mode)

#### API エンドポイント設計
React Router v7のAPI routesを使用したフレームワークモード実装

```
# API Routes (app/routes/api/以下)
GET    /api/jobs              # ジョブ一覧取得
GET    /api/jobs/:id          # ジョブ詳細取得
POST   /api/jobs              # 新規ジョブ作成
PUT    /api/jobs/:id/priority # ジョブ優先度変更
DELETE /api/jobs/:id          # ジョブ削除

POST   /api/upload            # INPファイルアップロード
GET    /api/jobs/:id/files/:type  # Abaqusファイル取得 (sta/dat/log/msg)
GET    /api/nodes             # ノード一覧取得
GET    /api/users             # ユーザー一覧取得

WebSocket /ws                 # リアルタイム更新（server.tsで実装）
```

#### サービス層構成
```
app/lib/
├── database.ts              # bun:sqlite データベース接続
├── jobManager.ts            # ジョブキュー管理
├── jobScheduler.ts          # ジョブスケジューラー（実行計画）
├── nodeManager.ts           # ノード管理・負荷分散
├── abaqusExecutor.ts        # Abaqus実行制御
├── fileManager.ts           # INPファイル管理
├── sshClient.ts             # SSH接続管理
├── fileMonitor.ts           # ファイル監視
├── statusChecker.ts         # ステータス確認
└── websocketManager.ts      # WebSocket管理
```

### 3. データベース設計 (SQLite with bun:sqlite)

#### テーブル構成

**jobs テーブル**
```sql
CREATE TABLE jobs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'Waiting',
    user_id         TEXT NOT NULL,
    node_id         TEXT,
    cpu_count       INTEGER NOT NULL CHECK (cpu_count IN (2, 4, 8)),  -- 使用CPU数
    license_tokens  INTEGER NOT NULL,  -- 使用ライセンストークン数
    message         TEXT,
    inp_file_path   TEXT NOT NULL,  -- アップロードされたINPファイルのパス
    execution_path  TEXT,
    result_path     TEXT,
    created_at      INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at      INTEGER DEFAULT (strftime('%s', 'now')),
    priority        INTEGER DEFAULT 0
);
```

**nodes テーブル**
```sql
CREATE TABLE nodes (
    id                  TEXT PRIMARY KEY,
    hostname            TEXT NOT NULL,
    ssh_host            TEXT NOT NULL,
    ssh_port            INTEGER DEFAULT 22,
    ssh_user            TEXT NOT NULL,
    status              TEXT DEFAULT 'Available',
    total_cpu_cores     INTEGER NOT NULL,           -- ノードの総CPU数
    max_license_tokens  INTEGER NOT NULL,           -- ノードが使用可能な最大ライセンストークン数
    created_at          INTEGER DEFAULT (strftime('%s', 'now'))
);
```

**users テーブル**
```sql
CREATE TABLE users (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    role            TEXT DEFAULT 'student',
    created_at      INTEGER DEFAULT (strftime('%s', 'now'))
);
```

**job_files テーブル**
```sql
CREATE TABLE job_files (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id          INTEGER NOT NULL,
    file_type       TEXT NOT NULL, -- 'sta', 'dat', 'log', 'msg'
    file_path       TEXT NOT NULL,
    file_size       INTEGER,
    updated_at      INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);
```

**uploaded_files テーブル** (INPファイル管理用)
```sql
CREATE TABLE uploaded_files (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    original_name   TEXT NOT NULL,
    stored_name     TEXT NOT NULL UNIQUE,
    file_path       TEXT NOT NULL,
    file_size       INTEGER NOT NULL,
    mime_type       TEXT,
    uploaded_by     TEXT NOT NULL,
    uploaded_at     INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);
```

**system_config テーブル** (システム設定用)
```sql
CREATE TABLE system_config (
    key             TEXT PRIMARY KEY,
    value           TEXT NOT NULL,
    description     TEXT,
    updated_at      INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 初期データ
INSERT INTO system_config (key, value, description) VALUES 
('total_license_tokens', '50', 'システム全体で利用可能なAbaqusライセンストークン数');
```

## 技術的詳細

### 1. React Router v7 Framework Mode設定

#### vite.config.ts設定
```typescript
import { defineConfig } from 'vite';
import { reactRouter } from '@react-router/dev/vite';

export default defineConfig({
  plugins: [
    reactRouter({
      // Framework modeの設定
      ssr: true,
      future: {
        unstable_optimizeDeps: true,
      },
    }),
  ],
  server: {
    port: 3000,
  },
});
```

### 2. SQLite Database Setup

#### database.ts (bun:sqlite)
```typescript
import { Database } from 'bun:sqlite';

export const db = new Database('./data/abaqus-jobs.db');

// テーブル作成
export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Waiting',
      user_id TEXT NOT NULL,
      node_id TEXT,
      message TEXT,
      inp_file_path TEXT NOT NULL,
      execution_path TEXT,
      result_path TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now')),
      priority INTEGER DEFAULT 0
    );
    
    CREATE TABLE IF NOT EXISTS uploaded_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL UNIQUE,
      file_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT,
      uploaded_by TEXT NOT NULL,
      uploaded_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
  `);
}
```

### 3. File Upload Management

#### fileManager.ts
```typescript
import { join } from 'path';
import { mkdir, exists } from 'fs/promises';

export class FileManager {
  private uploadDir = './uploads/inp-files';
  
  async ensureUploadDir() {
    if (!await exists(this.uploadDir)) {
      await mkdir(this.uploadDir, { recursive: true });
    }
  }
  
  generateStoredName(originalName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    const ext = originalName.split('.').pop();
    return `${timestamp}-${random}.${ext}`;
  }
  
  getUploadPath(storedName: string): string {
    return join(this.uploadDir, storedName);
  }
}
```

### 4. ジョブスケジューリング（実行計画）

#### jobScheduler.ts
```typescript
import { db } from './database';
import { NodeManager } from './nodeManager';
import { AbaqusExecutor } from './abaqusExecutor';

export class JobScheduler {
    private isRunning = false;
    private nodeManager = new NodeManager();
    private executor = new AbaqusExecutor();
    
    // スケジューラー開始
    async start() {
        this.isRunning = true;
        this.scheduleLoop();
    }
    
    // メインスケジューリングループ
    private async scheduleLoop() {
        while (this.isRunning) {
            try {
                await this.processQueue();
                await this.sleep(5000); // 5秒間隔でチェック
            } catch (error) {
                console.error('Scheduler error:', error);
                await this.sleep(10000); // エラー時は10秒待機
            }
        }
    }
    
    // ジョブキューの処理
    private async processQueue() {
        // 1. システム全体の利用可能ライセンストークン数を取得
        const totalLicenseTokens = await this.getLicenseConfig();
        const usedLicenseTokens = await this.getUsedLicenseTokens();
        const availableLicenseTokens = totalLicenseTokens - usedLicenseTokens;
        
        // 2. ノード毎に指定されたジョブを取得
        const jobsByNode = db.prepare(`
            SELECT j.*, n.status as node_status, 
                   n.total_cpu_cores, n.max_license_tokens,
                   COALESCE(node_usage.used_cpu, 0) as node_used_cpu,
                   COALESCE(node_usage.used_tokens, 0) as node_used_tokens
            FROM jobs j
            JOIN nodes n ON j.node_id = n.id
            LEFT JOIN (
                SELECT node_id, 
                       SUM(cpu_count) as used_cpu,
                       SUM(license_tokens) as used_tokens
                FROM jobs 
                WHERE status IN ('Starting', 'Running') 
                GROUP BY node_id
            ) node_usage ON n.id = node_usage.node_id
            WHERE j.status = 'Waiting' 
            AND n.status = 'Available'
            ORDER BY j.node_id, j.priority DESC, j.created_at ASC
        `).all();
        
        // 3. ノード毎にグループ化して処理
        const nodeGroups = this.groupJobsByNode(jobsByNode);
        
        for (const [nodeId, jobs] of nodeGroups.entries()) {
            const node = await this.nodeManager.getNodeById(nodeId);
            if (!node) continue;
            
            // 4. 各ジョブのリソース要求をチェックして実行
            for (const job of jobs) {
                // CPU使用量チェック
                const nodeAvailableCpu = node.total_cpu_cores - job.node_used_cpu;
                if (job.cpu_count > nodeAvailableCpu) continue;
                
                // ノードのライセンストークンチェック
                const nodeAvailableTokens = node.max_license_tokens - job.node_used_tokens;
                if (job.license_tokens > nodeAvailableTokens) continue;
                
                // システム全体のライセンストークンチェック
                if (job.license_tokens > availableLicenseTokens) continue;
                
                // 全ての条件を満たす場合、ジョブを実行
                await this.assignJobToNode(job, node);
                
                // 使用リソースを更新
                job.node_used_cpu += job.cpu_count;
                job.node_used_tokens += job.license_tokens;
                availableLicenseTokens -= job.license_tokens;
                
                // システム全体のライセンストークンが不足の場合は処理を停止
                if (availableLicenseTokens <= 0) return;
            }
        }
    }
    
    private async getLicenseConfig(): Promise<number> {
        const config = db.prepare(`
            SELECT value FROM system_config WHERE key = 'total_license_tokens'
        `).get() as { value: string } | undefined;
        return config ? parseInt(config.value) : 0;
    }
    
    private async getUsedLicenseTokens(): Promise<number> {
        const result = db.prepare(`
            SELECT COALESCE(SUM(license_tokens), 0) as used_tokens 
            FROM jobs 
            WHERE status IN ('Starting', 'Running')
        `).get() as { used_tokens: number };
        return result.used_tokens;
    }
    
    private groupJobsByNode(jobs: any[]): Map<string, any[]> {
        const groups = new Map<string, any[]>();
        
        for (const job of jobs) {
            const nodeId = job.node_id;
            if (!groups.has(nodeId)) {
                groups.set(nodeId, []);
            }
            groups.get(nodeId)!.push(job);
        }
        
        return groups;
    }
    
    // ジョブをノードに割り当て
    private async assignJobToNode(job: Job, node: Node) {
        // 1. ジョブステータスを"Starting"に更新
        db.prepare(`
            UPDATE jobs 
            SET status = 'Starting', node_id = ?, updated_at = strftime('%s', 'now')
            WHERE id = ?
        `).run(node.id, job.id);
        
        // 2. ノードの現在のジョブ数を更新
        await this.nodeManager.incrementJobCount(node.id);
        
        // 3. Abaqus実行を開始
        this.executor.executeJob(job, node);
    }
    
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
```

#### nodeManager.ts
```typescript
import { db } from './database';

export class NodeManager {
    // 特定ノードの情報を取得
    async getNodeById(nodeId: string): Promise<Node | null> {
        return db.prepare(`
            SELECT n.*, 
                   COALESCE(running_jobs.count, 0) as current_jobs
            FROM nodes n
            LEFT JOIN (
                SELECT node_id, COUNT(*) as count 
                FROM jobs 
                WHERE status IN ('Starting', 'Running') 
                GROUP BY node_id
            ) running_jobs ON n.id = running_jobs.node_id
            WHERE n.id = ?
        `).get(nodeId) as Node | null;
    }
    
    // 利用可能なノード一覧を取得
    async getAvailableNodes(): Promise<Node[]> {
        return db.prepare(`
            SELECT n.*, 
                   COALESCE(running_jobs.count, 0) as current_jobs
            FROM nodes n
            LEFT JOIN (
                SELECT node_id, COUNT(*) as count 
                FROM jobs 
                WHERE status IN ('Starting', 'Running') 
                GROUP BY node_id
            ) running_jobs ON n.id = running_jobs.node_id
            WHERE n.status = 'Available' 
            ORDER BY n.id ASC
        `).all();
    }
    
    // ノードの実行ジョブ数を更新
    async incrementJobCount(nodeId: string) {
        // 実際のジョブ数はデータベースクエリで動的に計算するため、
        // 特別な処理は不要
    }
    
    // ノードの健康状態をチェック
    async checkNodeHealth(nodeId: string): Promise<boolean> {
        try {
            // SSH接続テスト
            const result = await this.testSSHConnection(nodeId);
            
            // ノードステータスを更新
            const status = result ? 'Available' : 'Unavailable';
            db.prepare(`
                UPDATE nodes 
                SET status = ?, updated_at = strftime('%s', 'now')
                WHERE id = ?
            `).run(status, nodeId);
            
            return result;
        } catch (error) {
            console.error(`Node health check failed for ${nodeId}:`, error);
            return false;
        }
    }
    
    private async testSSHConnection(nodeId: string): Promise<boolean> {
        // SSH接続テストの実装
        // 簡単なコマンド（例：echo "test"）を実行して応答を確認
        return true; // 仮実装
    }
}
```

### 5. Abaqus実行制御

#### abaqusExecutor.ts
```typescript
import { spawn } from 'child_process';
import { db } from './database';
import { WebSocketManager } from './websocketManager';

export class AbaqusExecutor {
    private wsManager = new WebSocketManager();
    
    async executeJob(job: Job, node: Node): Promise<void> {
        try {
            // 1. ジョブステータスを"Running"に更新
            this.updateJobStatus(job.id, 'Running', 'Abaqus execution started');
            
            // 2. SSH経由でAbaqus実行
            const sshCommand = [
                'ssh',
                `${node.ssh_user}@${node.ssh_host}`,
                `powershell -Command "cd ${job.execution_path}; abaqus job=${job.name} input=${job.inp_file_path} interactive"`
            ];
            
            const process = spawn('ssh', sshCommand.slice(1));
            
            process.stdout.on('data', (data) => {
                const output = data.toString();
                console.log(`Job ${job.id} stdout: ${output}`);
                
                // 出力を解析してステータスを更新
                const status = this.parseAbaqusOutput(output);
                if (status) {
                    this.updateJobStatus(job.id, status.status, status.message);
                }
            });
            
            process.stderr.on('data', (data) => {
                console.error(`Job ${job.id} stderr: ${data}`);
                this.updateJobStatus(job.id, 'Failed', `Error: ${data.toString()}`);
            });
            
            process.on('close', (code) => {
                const status = code === 0 ? 'Completed' : 'Failed';
                const message = code === 0 ? 'Job completed successfully' : `Job failed with exit code ${code}`;
                this.updateJobStatus(job.id, status, message);
                
                // ジョブ完了後、結果ファイルを取得
                if (code === 0) {
                    this.collectResultFiles(job.id, job.execution_path);
                }
            });
            
        } catch (error) {
            console.error(`Failed to execute job ${job.id}:`, error);
            this.updateJobStatus(job.id, 'Failed', `Execution error: ${error.message}`);
        }
    }
    
    private updateJobStatus(jobId: number, status: string, message?: string) {
        db.prepare(`
            UPDATE jobs 
            SET status = ?, message = ?, updated_at = strftime('%s', 'now')
            WHERE id = ?
        `).run(status, message || null, jobId);
        
        // WebSocket経由でクライアントに通知
        this.wsManager.broadcast('job:status', {
            job_id: jobId,
            status,
            message,
            updated_at: Date.now()
        });
    }
    
    private parseAbaqusOutput(output: string): { status: string; message: string } | null {
        // Abaqus出力を解析してステータスを判定
        if (output.includes('ABAQUS JOB COMPLETED')) {
            return { status: 'Completed', message: 'Abaqus job completed' };
        }
        if (output.includes('ABAQUS ERROR')) {
            return { status: 'Failed', message: 'Abaqus execution error' };
        }
        if (output.includes('STEP')) {
            const stepMatch = output.match(/STEP\s+(\d+)/);
            if (stepMatch) {
                return { status: 'Running', message: `Processing step ${stepMatch[1]}` };
            }
        }
        return null;
    }
    
    private async collectResultFiles(jobId: number, executionPath: string) {
        // 結果ファイル(.sta, .dat, .log, .msg)を収集してデータベースに記録
        const fileTypes = ['sta', 'dat', 'log', 'msg'];
        
        for (const fileType of fileTypes) {
            const filePath = `${executionPath}/${jobId}.${fileType}`;
            
            try {
                // ファイル存在確認とサイズ取得
                const stats = await this.getFileStats(filePath);
                if (stats) {
                    db.prepare(`
                        INSERT INTO job_files (job_id, file_type, file_path, file_size, updated_at)
                        VALUES (?, ?, ?, ?, strftime('%s', 'now'))
                    `).run(jobId, fileType, filePath, stats.size);
                }
            } catch (error) {
                console.warn(`Failed to collect ${fileType} file for job ${jobId}:`, error);
            }
        }
    }
    
    private async getFileStats(filePath: string): Promise<{ size: number } | null> {
        // SSH経由でファイル情報を取得
        // 実装は簡略化
        return { size: 1024 }; // 仮実装
    }
}
```

#### ファイル監視による状態確認
```typescript
class FileMonitor {
    watchJobDirectory(jobPath: string, jobId: number): void {
        const watcher = chokidar.watch(jobPath, {
            ignored: /^\./, 
            persistent: true
        });
        
        watcher.on('change', async (path) => {
            if (path.endsWith('.lck')) {
                // ロックファイルの変更 = 実行状態変更
                await this.updateJobStatus(jobId);
            }
        });
    }
}
```

### 2. リアルタイム更新

#### WebSocket実装
```typescript
class WebSocketManager {
    private clients = new Set<WebSocket>();
    
    broadcast(event: string, data: any): void {
        const message = JSON.stringify({ event, data });
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }
    
    onJobStatusUpdate(jobId: number, status: JobStatus): void {
        this.broadcast('job:status', { jobId, status });
    }
}
```

### 3. セキュリティ考慮事項

#### SSH認証
- 公開鍵認証の使用
- SSH鍵の適切な管理
- 接続プールによる効率的な接続管理

#### ファイルアクセス制御
- ジョブ実行者による結果ファイルアクセス制限
- パストラバーサル攻撃の防止
- ファイルサイズ制限

## 拡張性考慮事項

### 1. スケーラビリティ
- 複数ノードでの負荷分散
- ジョブキューの永続化
- データベース接続プールの最適化

### 2. 監視・ログ
- ジョブ実行ログの保存
- システム監視メトリクス
- エラー追跡とアラート

### 3. 運用・保守
- 設定ファイルによる環境管理
- データベースマイグレーション
- 自動バックアップ機能