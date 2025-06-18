# 運用・デプロイメント仕様

## デプロイメント構成

### 1. システム構成図
```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│  Management Server  │    │   Abaqus Node-01    │    │   Abaqus Node-02    │
│                     │    │                     │    │                     │
│ - React Router v7   │◄──►│ - Windows Server    │    │ - Windows Server    │
│ - Bun Runtime       │SSH │ - Abaqus 2023       │    │ - Abaqus 2023       │
│ - SQLite Database   │    │ - SSH Server        │    │ - SSH Server        │
│ - WebSocket Server  │    │ - PowerShell        │    │ - PowerShell        │
│                     │    │                     │    │                     │
│ Port: 3000          │    │ SSH Port: 22        │    │ SSH Port: 22        │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
```

### 2. 必要な環境
**管理サーバー（Linux）**
- Ubuntu 20.04 LTS 以上
- Bun 1.0 以上
- Node.js 18+ (フォールバック用)
- 最低 4GB RAM, 50GB Storage

**Abaqusノード（Windows）**
- Windows Server 2019/2022
- Abaqus 2023 以上
- OpenSSH Server
- PowerShell 5.1 以上
- 推奨 32GB+ RAM, 1TB+ Storage

## セキュリティ設定

### 1. SSH公開鍵認証設定
```bash
# 管理サーバーでキーペア生成
ssh-keygen -t ed25519 -f ~/.ssh/abaqus_nodes_key -C "abaqus-job-manager"

# 各Abaqusノードに公開鍵配布
ssh-copy-id -i ~/.ssh/abaqus_nodes_key.pub abaqus-user@node-01.local
ssh-copy-id -i ~/.ssh/abaqus_nodes_key.pub abaqus-user@node-02.local
```

### 2. 環境変数設定
```bash
# .env
DATABASE_PATH=./data/abaqus-jobs.db
SSH_PRIVATE_KEY_PATH=/home/abaqus/.ssh/abaqus_nodes_key
UPLOAD_DIR=./uploads
RESULTS_DIR=./results
MAX_FILE_SIZE_MB=100
TOTAL_LICENSE_TOKENS=50
LOG_LEVEL=info
SESSION_SECRET=your-secret-key-here
```

### 3. ファイル権限設定
```bash
# アップロードディレクトリ
mkdir -p ./uploads/inp-files ./results ./data
chmod 750 ./uploads ./results ./data
chown -R abaqus:abaqus ./uploads ./results ./data

# SSH秘密鍵
chmod 600 ~/.ssh/abaqus_nodes_key
```

## データベース管理

### 1. 初期化スクリプト
```sql
-- scripts/init-database.sql
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- テーブル作成
CREATE TABLE IF NOT EXISTS jobs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL UNIQUE,
    status          TEXT NOT NULL DEFAULT 'Waiting',
    user_id         TEXT NOT NULL,
    node_id         TEXT NOT NULL,
    cpu_count       INTEGER NOT NULL CHECK (cpu_count IN (2, 4, 8)),
    license_tokens  INTEGER NOT NULL,
    message         TEXT,
    inp_file_path   TEXT NOT NULL,
    execution_path  TEXT,
    result_path     TEXT,
    created_at      INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at      INTEGER DEFAULT (strftime('%s', 'now')),
    priority        INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS nodes (
    id                  TEXT PRIMARY KEY,
    hostname            TEXT NOT NULL,
    ssh_host            TEXT NOT NULL,
    ssh_port            INTEGER DEFAULT 22,
    ssh_user            TEXT NOT NULL,
    status              TEXT DEFAULT 'Available',
    total_cpu_cores     INTEGER NOT NULL,
    max_license_tokens  INTEGER NOT NULL,
    created_at          INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE IF NOT EXISTS users (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    role            TEXT DEFAULT 'student',
    created_at      INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE IF NOT EXISTS system_config (
    key             TEXT PRIMARY KEY,
    value           TEXT NOT NULL,
    description     TEXT,
    updated_at      INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 初期データ
INSERT OR REPLACE INTO system_config (key, value, description) VALUES 
('total_license_tokens', '50', 'システム全体で利用可能なAbaqusライセンストークン数');

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_node_id ON jobs(node_id);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
```

### 2. バックアップ・復旧
```bash
#!/bin/bash
# scripts/backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups/$DATE"

mkdir -p $BACKUP_DIR

# データベースバックアップ
sqlite3 ./data/abaqus-jobs.db ".backup $BACKUP_DIR/abaqus-jobs.db"

# アップロードファイルバックアップ
tar -czf $BACKUP_DIR/uploads.tar.gz ./uploads/

# 結果ファイルバックアップ（過去30日分）
find ./results -mtime -30 -type f | tar -czf $BACKUP_DIR/recent_results.tar.gz -T -

echo "バックアップ完了: $BACKUP_DIR"
```

## 監視・ログ管理

### 1. ログ設定
```typescript
// app/lib/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        // ファイル出力
        new winston.transports.File({ 
            filename: './logs/error.log', 
            level: 'error',
            maxsize: 10485760, // 10MB
            maxFiles: 5
        }),
        new winston.transports.File({ 
            filename: './logs/combined.log',
            maxsize: 10485760,
            maxFiles: 10
        }),
        // コンソール出力
        new winston.transports.Console({
            format: winston.format.simple()
        })
    ]
});

export default logger;
```

### 2. ヘルスチェック機能
```typescript
// app/routes/api/health.ts
export async function loader() {
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: await checkDatabase(),
        nodes: await checkNodes(),
        disk: await checkDiskSpace(),
        memory: await checkMemoryUsage()
    };
    
    const isHealthy = Object.values(health).every(
        check => typeof check === 'object' ? check.status === 'ok' : true
    );
    
    return Response.json(health, { 
        status: isHealthy ? 200 : 503 
    });
}

async function checkDatabase(): Promise<{status: string, responseTime: number}> {
    const start = Date.now();
    try {
        await db.prepare('SELECT 1').get();
        return { status: 'ok', responseTime: Date.now() - start };
    } catch (error) {
        return { status: 'error', responseTime: Date.now() - start };
    }
}
```

### 3. メトリクス収集
```typescript
// app/lib/metrics.ts
export class MetricsCollector {
    async collectJobMetrics() {
        const metrics = {
            totalJobs: await this.getTotalJobs(),
            jobsByStatus: await this.getJobsByStatus(),
            averageQueueTime: await this.getAverageQueueTime(),
            systemLicenseUsage: await this.getSystemLicenseUsage(),
            nodeUtilization: await this.getNodeUtilization()
        };
        
        // Prometheusメトリクス出力
        await this.exportPrometheusMetrics(metrics);
        
        return metrics;
    }
    
    private async exportPrometheusMetrics(metrics: any) {
        const prometheusMetrics = [
            `abaqus_jobs_total ${metrics.totalJobs}`,
            `abaqus_jobs_running ${metrics.jobsByStatus.Running || 0}`,
            `abaqus_jobs_waiting ${metrics.jobsByStatus.Waiting || 0}`,
            `abaqus_license_usage ${metrics.systemLicenseUsage.used}`,
            `abaqus_license_total ${metrics.systemLicenseUsage.total}`
        ].join('\n');
        
        await writeFile('./metrics/prometheus.txt', prometheusMetrics);
    }
}
```

## パフォーマンス最適化

### 1. データベース最適化
```sql
-- scripts/optimize-database.sql

-- 統計情報更新
ANALYZE;

-- 不要なデータのクリーンアップ
DELETE FROM jobs WHERE status = 'Completed' AND updated_at < strftime('%s', 'now', '-30 days');

-- VACUUMでデータベースサイズ最適化
VACUUM;

-- WALモードの設定確認
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = 10000;
PRAGMA temp_store = memory;
```

### 2. ファイルシステム最適化
```bash
#!/bin/bash
# scripts/cleanup.sh

# 古い結果ファイルの削除（90日以上）
find ./results -type f -mtime +90 -delete

# 古いログファイルの圧縮（7日以上）
find ./logs -name "*.log" -mtime +7 -exec gzip {} \;

# 一時ファイルのクリーンアップ
find /tmp -name "abaqus_*" -mtime +1 -delete

# アップロードディレクトリの孤立ファイル削除
node scripts/cleanup-orphaned-files.js
```

## 障害対応・復旧手順

### 1. 障害検知
```bash
#!/bin/bash
# scripts/monitor.sh

# プロセス監視
if ! pgrep -f "bun.*server" > /dev/null; then
    echo "ALERT: Abaqus Job Manager プロセスが停止しています"
    # 自動再起動
    systemctl restart abaqus-job-manager
fi

# ディスク容量監視
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 90 ]; then
    echo "ALERT: ディスク使用量が90%を超えています: ${DISK_USAGE}%"
fi

# データベースロック監視
if sqlite3 ./data/abaqus-jobs.db ".timeout 5000" "SELECT 1;" 2>/dev/null; then
    echo "OK: データベース正常"
else
    echo "ALERT: データベースがロックされています"
fi
```

### 2. 復旧手順書
```markdown
## 障害復旧手順

### レベル1: サービス復旧
1. プロセス確認: `systemctl status abaqus-job-manager`
2. ログ確認: `tail -f ./logs/error.log`
3. 再起動: `systemctl restart abaqus-job-manager`
4. ヘルスチェック: `curl http://localhost:3000/api/health`

### レベル2: データベース復旧
1. データベースファイル確認: `sqlite3 ./data/abaqus-jobs.db ".schema"`
2. 整合性チェック: `sqlite3 ./data/abaqus-jobs.db "PRAGMA integrity_check;"`
3. バックアップから復旧: `cp ./backups/latest/abaqus-jobs.db ./data/`
4. WALファイル削除: `rm ./data/abaqus-jobs.db-wal ./data/abaqus-jobs.db-shm`

### レベル3: 完全復旧
1. システム停止: `systemctl stop abaqus-job-manager`
2. 最新バックアップから全復旧
3. SSH接続確認: 各ノードへの接続テスト
4. サービス再開とテスト実行
```

## アップグレード手順

### 1. アプリケーション更新
```bash
#!/bin/bash
# scripts/deploy.sh

# 現在のバージョンをバックアップ
cp -r ./current-version ./backup-$(date +%Y%m%d_%H%M%S)

# 新バージョンの展開
tar -xzf abaqus-job-manager-v2.0.tar.gz

# データベースマイグレーション
bun run migrate

# 依存関係の更新
bun install

# 設定ファイルの確認
diff ./config/default.json ./backup-*/config/default.json

# テスト実行
bun run test

# サービス再起動
systemctl restart abaqus-job-manager

# 動作確認
curl http://localhost:3000/api/health
```

### 2. 設定管理
```typescript
// config/production.ts
export const config = {
    database: {
        path: process.env.DATABASE_PATH || './data/abaqus-jobs.db',
        backup: {
            interval: '0 2 * * *', // 毎日2時
            retention: 30 // 30日保持
        }
    },
    ssh: {
        keyPath: process.env.SSH_PRIVATE_KEY_PATH,
        timeout: 30000,
        retries: 3
    },
    monitoring: {
        metricsInterval: 60000, // 1分間隔
        healthCheckInterval: 30000, // 30秒間隔
        alertThresholds: {
            diskUsage: 90,
            memoryUsage: 85,
            queueLength: 100
        }
    }
};
```

これらの運用仕様により、システムの安定稼働と適切な保守が可能になります。