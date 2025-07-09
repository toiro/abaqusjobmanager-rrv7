# Abaqusライセンス管理仕様

## 概要

Abaqusのトークンベースライセンスシステムに対応したリソース管理機能の詳細仕様です。

## ライセンストークンシステム

### 1. 基本概念

- **ライセンストークン**: Abaqus実行に必要なライセンス単位
- **CPU-トークン関数**: CPU数からライセンストークン数を計算する非線形関数
- **システム制限**: 全体で利用可能なトークン数の上限
- **ノード制限**: 各ノードが使用可能なトークン数の上限

### 2. リソース階層

```
システム全体
├── 総ライセンストークン数: 50
└── ノード群
    ├── Node-01
    │   ├── 総CPU数: 16コア
    │   └── 最大ライセンストークン: 16
    ├── Node-02
    │   ├── 総CPU数: 32コア
    │   └── 最大ライセンストークン: 20
    └── Node-03
        ├── 総CPU数: 8コア
        └── 最大ライセンストークン: 8
```

## ライセンストークン計算関数

### 1. CPU数からライセンストークン数の計算

**参照先**: `/app/app/lib/license-config.ts`

CPU数からAbaqusライセンストークン数を計算する関数。実際のライセンス消費パターンに基づく非線形の計算式が実装されています。

### 2. ユーザー選択オプション

| CPU数 | ライセンストークン | 用途 |
|-------|-------------------|------|
| 2コア | `calculateLicenseTokens(2)` | 小規模解析・テスト |
| 4コア | `calculateLicenseTokens(4)` | 中規模解析 |
| 8コア | `calculateLicenseTokens(8)` | 大規模解析 |

**注意**: 実際のライセンストークン数は選択されたCPU数に基づいて動的に計算されます。

### 3. ジョブ作成時の検証

#### 入力検証
```typescript
interface JobResourceRequest {
    nodeId: string;
    cpuCount: 2 | 4 | 8;
    // licenseTokensは自動計算されるため除外
}

function validateJobRequest(request: JobResourceRequest): ValidationResult {
    // CPU数の有効性チェック
    if (![2, 4, 8].includes(request.cpuCount)) {
        return { valid: false, error: '無効なCPU数が指定されています' };
    }
    
    // ノード存在チェック
    const node = getNodeById(request.nodeId);
    if (!node) {
        return { valid: false, error: '指定されたノードが存在しません' };
    }
    
    return { valid: true };
}

function createJobWithCalculatedTokens(request: JobResourceRequest): JobRecord {
    // ライセンストークン数を自動計算
    const licenseTokens = calculateLicenseTokens(request.cpuCount);
    
    return {
        ...request,
        licenseTokens,
        status: 'Waiting'
    };
}
```

#### リソース可用性チェック
```typescript
async function checkResourceAvailability(request: JobResourceRequest): Promise<AvailabilityResult> {
    const node = await getNodeById(request.nodeId);
    const systemStatus = await getSystemResourceStatus();
    
    // ライセンストークン数を計算
    const requiredLicenseTokens = calculateLicenseTokens(request.cpuCount);
    
    // ノードCPU可用性
    const nodeAvailableCpu = node.total_cpu_cores - node.current_used_cpu;
    if (request.cpuCount > nodeAvailableCpu) {
        return {
            available: false,
            reason: 'ノードのCPUリソースが不足',
            availableCpu: nodeAvailableCpu,
            requiredCpu: request.cpuCount,
            calculatedTokens: requiredLicenseTokens
        };
    }
    
    // ノードライセンストークン可用性
    const nodeAvailableTokens = node.max_license_tokens - node.current_used_tokens;
    if (requiredLicenseTokens > nodeAvailableTokens) {
        return {
            available: false,
            reason: 'ノードのライセンストークンが不足',
            availableTokens: nodeAvailableTokens,
            requiredTokens: requiredLicenseTokens,
            requiredCpu: request.cpuCount
        };
    }
    
    // システム全体のライセンストークン可用性
    const systemAvailableTokens = systemStatus.total_license_tokens - systemStatus.used_license_tokens;
    if (requiredLicenseTokens > systemAvailableTokens) {
        return {
            available: false,
            reason: 'システム全体のライセンストークンが不足',
            availableTokens: systemAvailableTokens,
            requiredTokens: requiredLicenseTokens,
            requiredCpu: request.cpuCount
        };
    }
    
    return { 
        available: true,
        requiredCpu: request.cpuCount,
        calculatedTokens: requiredLicenseTokens
    };
}
```

## スケジューリング制約

### 1. 実行可能性判定

```sql
-- ノード毎のリソース使用状況
SELECT 
    n.id,
    n.total_cpu_cores,
    n.max_license_tokens,
    COALESCE(usage.used_cpu, 0) as current_used_cpu,
    COALESCE(usage.used_tokens, 0) as current_used_tokens,
    (n.total_cpu_cores - COALESCE(usage.used_cpu, 0)) as available_cpu,
    (n.max_license_tokens - COALESCE(usage.used_tokens, 0)) as available_tokens
FROM nodes n
LEFT JOIN (
    SELECT 
        node_id,
        SUM(cpu_count) as used_cpu,
        SUM(license_tokens) as used_tokens
    FROM jobs 
    WHERE status IN ('Starting', 'Running')
    GROUP BY node_id
) usage ON n.id = usage.node_id
WHERE n.status = 'Available';
```

### 2. ジョブ実行優先順位

```
1. ライセンストークン制約チェック
   ├── システム全体の利用可能トークン数
   └── ノード別の利用可能トークン数

2. CPU制約チェック
   └── ノード別の利用可能CPU数

3. 優先度順実行
   ├── 優先度降順
   └── 作成日時昇順（FIFO）
```

## UI表示仕様

### 1. ジョブ作成画面のリソース表示（英語UI）

```
┌─ Create New Job ─────────────────────────┐
│                                          │
│ Job Name: [________________]             │
│                                          │
│ Execution Node:                          │
│ ○ Node-01 🟢 Available                   │
│   CPU: 6/16 cores used (10 available)   │
│   License: 6/16 tokens (10 available)   │
│                                          │
│ ○ Node-02 🟠 High Load                   │
│   CPU: 28/32 cores used (4 available)   │
│   License: 18/20 tokens (2 available)   │
│                                          │
│ CPU Cores / License Tokens:              │
│ ○ 2 cores (2 tokens) - Light analysis   │
│ ○ 4 cores (5 tokens) - Medium analysis  │
│ ○ 8 cores (12 tokens) - Heavy analysis ⚠️│
│   ※Not available on selected node       │
│                                          │
│ System Total: 34/50 license tokens used │
│                                          │
└──────────────────────────────────────────┘
```

### 2. ジョブ一覧でのリソース表示（英語UI）

```
┌──────────────────────────────────────────────────┐
│ID │Job Name   │Status    │Node    │CPU│License   │
├──────────────────────────────────────────────────┤
│1  │beam_001   │🔄Running │Node-01 │4  │5         │
│2  │shell_002  │⏳Waiting │Node-02 │8  │12        │
│3  │contact_003│✅Complete│Node-01 │2  │2         │
└──────────────────────────────────────────────────┘
```

### 3. システム状況ダッシュボード（英語UI）

```
┌─ System Resource Status ─────────────────┐
│                                          │
│ 📊 License Token Usage                   │
│ ████████████░░░░░░░░ 34/50 (68%)         │
│                                          │
│ 🖥️ Node Usage                           │
│ Node-01: CPU 6/16, License 6/16         │
│ Node-02: CPU 28/32, License 18/20       │
│ Node-03: CPU 0/8, License 0/8           │
│                                          │
│ ⏳ Queued Jobs                           │
│ High CPU: 3 jobs (License shortage)     │
│ Normal: 5 jobs                          │
│                                          │
└──────────────────────────────────────────┘
```

## エラーハンドリング

### 1. リソース不足エラー

#### システム全体のライセンス不足
```typescript
{
    error: 'INSUFFICIENT_SYSTEM_LICENSES',
    message: 'システム全体のライセンストークンが不足しています',
    details: {
        required: 8,
        available: 3,
        total: 50,
        inUse: 47
    }
}
```

#### ノードのCPU不足
```typescript
{
    error: 'INSUFFICIENT_NODE_CPU',
    message: '選択されたノードのCPUリソースが不足しています',
    details: {
        nodeId: 'Node-02',
        required: 8,
        available: 4,
        total: 32,
        inUse: 28
    }
}
```

### 2. ユーザー向けメッセージ（英語）

- **ライセンス不足**: "Insufficient license tokens available. Please try again later."
- **CPU不足**: "Insufficient CPU cores on selected node. Please select another node or reduce CPU count."
- **ノードライセンス不足**: "Insufficient license tokens on selected node. Please select another node."
- **ファイル関連**: "Please upload a valid .inp file."
- **ジョブ名**: "Job name is required and must be unique."
- **ノード選択**: "Please select an execution node."

## 管理・運用

### 1. ライセンス設定管理

```sql
-- システム設定の更新
UPDATE system_config 
SET value = '60', updated_at = strftime('%s', 'now')
WHERE key = 'total_license_tokens';

-- ノードライセンス制限の更新
UPDATE nodes 
SET max_license_tokens = 24, updated_at = strftime('%s', 'now')
WHERE id = 'Node-02';
```

### 2. 監視・アラート

- **ライセンス使用率90%超過**: アラート通知
- **特定ノードの継続的な満負荷**: 負荷分散の検討提案
- **長時間待機ジョブ**: リソース設定の見直し提案

### 3. 統計・レポート

- 時間別ライセンス使用率
- ノード別CPU稼働率
- ジョブ待機時間統計
- ユーザー別リソース使用量