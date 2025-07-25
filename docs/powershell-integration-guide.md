# PowerShell スクリプト統合ガイド

## 📋 概要

このガイドでは、Abaqus Job Managerにおける既存PowerShellスクリプトの統合方法と、remote-pwshライブラリとの効果的な連携について詳述します。既存の実績あるスクリプトを活用して、安全で効率的なジョブ実行システムを構築します。

## 🔧 既存PowerShellスクリプト

### **1. sshRemoteSession.ps1 - SSH接続管理**

**場所**: `/app/resources/ps-scripts/sshRemoteSession.ps1`

```powershell
# SSH接続経由でリモートスクリプトを実行
param(
  [parameter(mandatory=$true)][string]$Hostname,
  [parameter(mandatory=$true)][string]$UserName,
  [parameter(mandatory=$true)][string]$ScriptPath,
  [parameter(ValueFromRemainingArguments=$true)]$args
)

# PSSession作成とスクリプト実行
$session = New-PSSession -HostName $Hostname -UserName $UserName
if (Test-FirstParamIsPSSession($sb)) {
  $argsWithSession = @($session) + $args
  Invoke-Command -ScriptBlock $sb -ArgumentList $argsWithSession
} else {
  Invoke-Command -ScriptBlock $sb -Session $session -ArgumentList $args
}
Remove-PSSession -Session $session
```

**特徴**:
- SSH PowerShell Remoting使用
- PSSession自動管理
- 第一引数のPSSession判定機能
- 適切なセッションクリーンアップ

### **2. executeAbaqus.ps1 - Abaqus実行**

**場所**: `/app/resources/ps-scripts/executeAbaqus.ps1`

```powershell
param(
  [parameter(mandatory=$true)][string]$jobName,
  [parameter(mandatory=$true)][string]$workingDir,
  [parameter(mandatory=$true)][string]$inputFile,
  [parameter(ValueFromRemainingArguments=$true)]$args
)

$input = "${workingDir}\${inputFile}"
Push-Location $workingDir
# interactiveオプションで実行してログファイルを生成
abaqus interactive "job=${jobName}" "input=${input}" @args | Tee-Object -FilePath "${jobName}.log"
Pop-Location
```

**特徴**:
- Interactiveモードでリアルタイム監視
- ログファイル自動生成
- 作業ディレクトリ管理
- 引数の動的渡し

### **3. sendDirectory.ps1 - ディレクトリアップロード**

**場所**: `/app/resources/ps-scripts/sendDirectory.ps1`

```powershell
param (
  [parameter(mandatory=$true)][System.Management.Automation.Runspaces.PSSession]$Session,
  [parameter(mandatory=$true)][string]$Source,
  [parameter(mandatory=$true)][string]$Destination
)
Copy-Item –Path $Source –Destination $Destination –ToSession $Session -Force -Recurse
```

**特徴**:
- PSSession経由のファイル転送
- 再帰的ディレクトリコピー
- 強制上書き（-Force）
- 既存セッション活用

### **4. receiveDirectory.ps1 - ディレクトリダウンロード**

**場所**: `/app/resources/ps-scripts/receiveDirectory.ps1`

```powershell
param (
  [parameter(mandatory=$true)][System.Management.Automation.Runspaces.PSSession]$Session,
  [parameter(mandatory=$true)][string]$Source,
  [parameter(mandatory=$true)][string]$Destination
)
Copy-Item –Path $Source –Destination $Destination –FromSession $Session -Force -Recurse
```

**特徴**:
- PSSession経由のファイル取得
- 再帰的ディレクトリコピー
- 強制上書き（-Force）
- 既存セッション活用

## 🔗 remote-pwshライブラリ統合

### **1. 既存remote-pwshアーキテクチャ**

**場所**: `/app/app/lib/services/remote-pwsh/`

#### **executor.ts - メイン実行エンジン**

```typescript
export function createRemotePwshExecutor(options: RemotePwshOptions) {
  const { host, user, scriptPath, encode = "utf8" } = options;
  const eventManager = createEventManager();
  
  return {
    // 同期実行
    invoke(): void {
      preparePowerShellEnvironment();
      const powerShell = spawnPowerShellProcess(host, user, scriptPath);
      setupEventHandlers(powerShell, eventManager, encode);
    },
    
    // 非同期実行
    async invokeAsync(): Promise<RemotePwshResult> {
      return new Promise<RemotePwshResult>((resolve, reject) => {
        // イベントハンドラー設定
        eventManager.emitter
          .on("stdout", (line: string) => stdout += line)
          .on("stderr", (line: string) => stderr += line)
          .on("error", (error: Error) => reject(error))
          .on("finish", (code: number | null, lastOutput: string) => {
            resolve({
              host, user, scriptPath, startAt, finishAt,
              stdout, stderr, returnCode: code, lastOutput
            });
          });
        
        this.invoke();
      });
    }
  };
}
```

#### **types.ts - 型定義**

```typescript
export interface RemotePwshOptions {
  host: string;
  user: string;
  scriptPath: string;
  encode?: string;
}

export interface RemotePwshResult {
  host: string;
  user: string;
  scriptPath: string;
  startAt: number;
  finishAt: number;
  returnCode: number;
  stdout: string;
  stderr: string;
  lastOutput: string;
}

export interface RemotePwshEvents {
  start: () => void;
  stdout: (line: string, count: number) => void;
  stderr: (line: string) => void;
  error: (error: Error) => void;
  finish: (code: number | null, lastOutput: string) => void;
}
```

## 🔄 統合実装パターン

### **1. FileTransferService実装**

```typescript
// /app/app/lib/services/file-transfer/file-transfer.server.ts
import { createRemotePwshExecutor } from '~/lib/services/remote-pwsh';
import type { Job, Node } from '~/lib/core/types/database';

export class FileTransferService {
  private readonly sendDirectoryScript = '/app/resources/ps-scripts/sendDirectory.ps1';
  private readonly receiveDirectoryScript = '/app/resources/ps-scripts/receiveDirectory.ps1';
  
  // 🚨 重要: シリアル処理要件対応
  private transferQueue = new Map<string, Promise<void>>(); // ノード別転送キュー
  private readonly maxConcurrentTransfers = 1; // 転送並列数制限
  
  async uploadJobFiles(job: Job, node: Node): Promise<UploadResult> {
    // ノード単位でシリアル処理（重要な要件）
    const nodeKey = `${node.hostname}:${node.ssh_port}`;
    
    // 前の転送完了を待機
    const previousTransfer = this.transferQueue.get(nodeKey);
    if (previousTransfer) {
      await previousTransfer;
    }
    
    // 新しい転送を開始
    const transferPromise = this.executeUpload(job, node);
    this.transferQueue.set(nodeKey, transferPromise);
    
    return await transferPromise;
  }
  
  private async executeUpload(job: Job, node: Node): Promise<UploadResult> {
    const localPath = await this.getJobFilePath(job);
    const remotePath = await this.createRemoteJobDirectory(job, node);
    
    // PSSession経由でファイル転送
    const executor = createRemotePwshExecutor({
      host: node.hostname,
      user: 'lab', // 設定から取得
      scriptPath: this.sendDirectoryScript
    });
    
    const startTime = Date.now();
    
    try {
      const result = await executor.invokeAsync();
      
      if (result.returnCode === 0) {
        return {
          success: true,
          remotePath,
          transferTime: Date.now() - startTime,
          fileSize: await this.getDirectorySize(localPath)
        };
      } else {
        throw new Error(`File transfer failed: ${result.stderr}`);
      }
    } catch (error) {
      throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async downloadResults(job: Job, node: Node): Promise<DownloadResult> {
    // ノード単位でシリアル処理（重要な要件）
    const nodeKey = `${node.hostname}:${node.ssh_port}`;
    
    // 前の転送完了を待機
    const previousTransfer = this.transferQueue.get(nodeKey);
    if (previousTransfer) {
      await previousTransfer;
    }
    
    // 新しい転送を開始
    const transferPromise = this.executeDownload(job, node);
    this.transferQueue.set(nodeKey, transferPromise);
    
    return await transferPromise;
  }
  
  private async executeDownload(job: Job, node: Node): Promise<DownloadResult> {
    const remotePath = this.getRemoteJobDirectory(job, node);
    const localPath = await this.createLocalResultDirectory(job);
    
    const executor = createRemotePwshExecutor({
      host: node.hostname,
      user: 'lab',
      scriptPath: this.receiveDirectoryScript
    });
    
    const startTime = Date.now();
    
    try {
      const result = await executor.invokeAsync();
      
      if (result.returnCode === 0) {
        const resultFiles = await this.listResultFiles(localPath);
        return {
          success: true,
          localPath,
          resultFiles,
          transferTime: Date.now() - startTime
        };
      } else {
        throw new Error(`Download failed: ${result.stderr}`);
      }
    } catch (error) {
      throw new Error(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
```

### **2. AbaqusJobExecutor実装**

```typescript
// /app/app/lib/services/abaqus/abaqus-job-executor.server.ts
import { createRemotePwshExecutor } from '~/lib/services/remote-pwsh';
import { FileTransferService } from '~/lib/services/file-transfer/file-transfer.server';
import { JobStatusMonitor } from './job-status-monitor.server';

export class AbaqusJobExecutor {
  private readonly executeAbaqusScript = '/app/resources/ps-scripts/executeAbaqus.ps1';
  
  constructor(
    private fileTransfer: FileTransferService,
    private statusMonitor: JobStatusMonitor
  ) {}
  
  async executeJob(job: Job, node: Node): Promise<JobExecutionResult> {
    const executionId = `job-${job.id}-${Date.now()}`;
    
    try {
      // 1. ファイル転送（シリアル処理）
      await this.updateJobStatus(job.id, 'starting', 'Uploading files...');
      const uploadResult = await this.fileTransfer.uploadJobFiles(job, node);
      
      if (!uploadResult.success) {
        throw new Error(`File upload failed: ${uploadResult.error}`);
      }
      
      // 2. Abaqus実行（並列処理可能）
      await this.updateJobStatus(job.id, 'running', 'Starting Abaqus execution...');
      const executionResult = await this.executeAbaqusJob(job, node, uploadResult.remotePath);
      
      // 3. 結果収集（シリアル処理）
      await this.updateJobStatus(job.id, 'running', 'Collecting results...');
      const downloadResult = await this.fileTransfer.downloadResults(job, node);
      
      // 4. 完了処理
      await this.updateJobStatus(job.id, 'completed', 'Job completed successfully');
      
      return {
        success: true,
        jobId: job.id,
        executionTime: executionResult.executionTime,
        outputFiles: downloadResult.resultFiles,
        executionId
      };
      
    } catch (error) {
      await this.updateJobStatus(job.id, 'failed', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }
  
  // 🚨 重要: バッチ実行時の適切な実行フロー
  async executeJobsBatch(jobs: Job[]): Promise<JobExecutionResult[]> {
    const results: JobExecutionResult[] = [];
    
    try {
      // Phase 1: ファイル転送（シリアル処理）
      console.log('Phase 1: ファイル転送開始（シリアル処理）');
      for (const job of jobs) {
        console.log(`ジョブ ${job.id} のファイル転送を開始`);
        const uploadResult = await this.fileTransfer.uploadJobFiles(job, job.assignedNode);
        if (!uploadResult.success) {
          throw new Error(`Job ${job.id} file upload failed: ${uploadResult.error}`);
        }
      }
      
      // Phase 2: Abaqus実行（並列処理）
      console.log('Phase 2: Abaqus実行開始（並列処理）');
      const executionPromises = jobs.map(job => 
        this.executeAbaqusOnly(job, job.assignedNode)
      );
      const executionResults = await Promise.all(executionPromises);
      
      // Phase 3: 結果収集（シリアル処理）
      console.log('Phase 3: 結果収集開始（シリアル処理）');
      for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i];
        const executionResult = executionResults[i];
        
        if (executionResult.success) {
          console.log(`ジョブ ${job.id} の結果収集を開始`);
          const downloadResult = await this.fileTransfer.downloadResults(job, job.assignedNode);
          
          results.push({
            success: true,
            jobId: job.id,
            executionTime: executionResult.executionTime,
            outputFiles: downloadResult.resultFiles,
            executionId: `batch-${job.id}-${Date.now()}`
          });
        } else {
          results.push({
            success: false,
            jobId: job.id,
            error: executionResult.error,
            executionId: `batch-${job.id}-${Date.now()}`
          });
        }
      }
      
    } catch (error) {
      console.error('バッチ実行エラー:', error);
      throw error;
    }
    
    return results;
  }
  
  private async executeAbaqusOnly(job: Job, node: Node): Promise<AbaqusExecutionResult> {
    // Abaqus実行のみ（ファイル転送は別途実行済み）
    const jobName = `job-${job.id}`;
    const inputFile = await this.getInputFileName(job);
    const remotePath = this.getRemoteJobDirectory(job, node);
    
    // ExecuteAbaqus.ps1を実行
    const executor = createRemotePwshExecutor({
      host: node.hostname,
      user: 'lab',
      scriptPath: this.executeAbaqusScript
    });
    
    // リアルタイム監視開始
    const monitor = this.statusMonitor.startMonitoring(job, executor);
    
    const startTime = Date.now();
    
    try {
      // PowerShellスクリプト引数：jobName, workingDir, inputFile, cpu=X
      const scriptArgs = [
        jobName,
        remotePath,
        inputFile,
        `cpu=${job.cpu_cores}`
      ];
      
      const result = await executor.invokeAsync();
      
      if (result.returnCode === 0) {
        return {
          success: true,
          executionTime: Date.now() - startTime,
          stdout: result.stdout,
          stderr: result.stderr
        };
      } else {
        throw new Error(`Abaqus execution failed: ${result.stderr}`);
      }
    } finally {
      await this.statusMonitor.stopMonitoring(job.id);
    }
  }
  
  private async executeAbaqusJob(job: Job, node: Node, remotePath: string): Promise<AbaqusExecutionResult> {
    const jobName = `job-${job.id}`;
    const inputFile = await this.getInputFileName(job);
    
    // ExecuteAbaqus.ps1を実行
    const executor = createRemotePwshExecutor({
      host: node.hostname,
      user: 'lab',
      scriptPath: this.executeAbaqusScript
    });
    
    // リアルタイム監視開始
    const monitor = this.statusMonitor.startMonitoring(job, executor);
    
    const startTime = Date.now();
    
    try {
      // PowerShellスクリプト引数：jobName, workingDir, inputFile, cpu=X
      const scriptArgs = [
        jobName,
        remotePath,
        inputFile,
        `cpu=${job.cpu_cores}`
      ];
      
      const result = await executor.invokeAsync();
      
      if (result.returnCode === 0) {
        return {
          success: true,
          executionTime: Date.now() - startTime,
          stdout: result.stdout,
          stderr: result.stderr
        };
      } else {
        throw new Error(`Abaqus execution failed: ${result.stderr}`);
      }
    } finally {
      await this.statusMonitor.stopMonitoring(job.id);
    }
  }
}
```

### **3. リアルタイム監視統合**

```typescript
// /app/app/lib/services/abaqus/job-status-monitor.server.ts
import type { RemotePwshExecutor } from '~/lib/services/remote-pwsh';
import { emitSSE } from '~/lib/services/sse/sse.server';

export class JobStatusMonitor {
  private activeMonitors = new Map<number, MonitorSession>();
  
  async startMonitoring(job: Job, executor: RemotePwshExecutor): Promise<MonitorSession> {
    const session: MonitorSession = {
      jobId: job.id,
      startTime: Date.now(),
      lastUpdate: Date.now()
    };
    
    // stdoutイベントハンドラー
    executor.on('stdout', (line: string, count: number) => {
      this.processAbaqusOutput(job, line);
      session.lastUpdate = Date.now();
    });
    
    // stderrイベントハンドラー
    executor.on('stderr', (line: string) => {
      this.processAbaqusError(job, line);
    });
    
    // 完了イベントハンドラー
    executor.on('finish', (code: number | null, lastOutput: string) => {
      this.processAbaqusCompletion(job, code, lastOutput);
      this.activeMonitors.delete(job.id);
    });
    
    this.activeMonitors.set(job.id, session);
    return session;
  }
  
  private processAbaqusOutput(job: Job, output: string): void {
    // Abaqus出力解析
    const progress = this.parseProgress(output);
    const currentStep = this.parseCurrentStep(output);
    
    if (progress !== null || currentStep !== null) {
      // SSEイベント発信
      emitSSE('jobs', {
        type: 'job_execution_progress',
        data: {
          jobId: job.id,
          progress: progress ?? 0,
          currentStep: currentStep ?? 'Processing',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
  
  private parseProgress(output: string): number | null {
    // Abaqus進捗メッセージ解析
    const progressMatch = output.match(/(\d+)%\s+complete/i);
    if (progressMatch) {
      return parseInt(progressMatch[1], 10);
    }
    
    // Step完了メッセージ
    const stepMatch = output.match(/Step\s+(\d+)\s+of\s+(\d+)/i);
    if (stepMatch) {
      const current = parseInt(stepMatch[1], 10);
      const total = parseInt(stepMatch[2], 10);
      return Math.round((current / total) * 100);
    }
    
    return null;
  }
  
  private parseCurrentStep(output: string): string | null {
    // 現在のステップ解析
    const stepMatch = output.match(/Step\s+(\d+):\s+(.+)/i);
    if (stepMatch) {
      return `Step ${stepMatch[1]}: ${stepMatch[2]}`;
    }
    
    // 解析フェーズ
    if (output.includes('Beginning analysis')) {
      return 'Analysis starting';
    }
    
    if (output.includes('Writing output')) {
      return 'Writing results';
    }
    
    return null;
  }
}
```

## 🔧 PowerShellスクリプト実行パターン

### **1. 基本実行パターン**

```typescript
// シンプルなスクリプト実行
async function executeSimpleScript(host: string, user: string, scriptPath: string): Promise<void> {
  const executor = createRemotePwshExecutor({
    host,
    user,
    scriptPath
  });
  
  const result = await executor.invokeAsync();
  
  if (result.returnCode !== 0) {
    throw new Error(`Script execution failed: ${result.stderr}`);
  }
}
```

### **2. 引数付き実行パターン**

```typescript
// 引数付きスクリプト実行
async function executeScriptWithArgs(
  host: string, 
  user: string, 
  scriptPath: string, 
  args: string[]
): Promise<string> {
  // 引数を含むスクリプト作成
  const scriptContent = `
    param($args)
    & "${scriptPath}" @args
  `;
  
  const tempScriptPath = await this.createTempScript(scriptContent);
  
  const executor = createRemotePwshExecutor({
    host,
    user,
    scriptPath: tempScriptPath
  });
  
  const result = await executor.invokeAsync();
  
  await this.cleanupTempScript(tempScriptPath);
  
  return result.stdout;
}
```

### **3. リアルタイム監視パターン**

```typescript
// リアルタイム出力監視
async function executeWithMonitoring(
  host: string,
  user: string,
  scriptPath: string,
  onOutput: (line: string) => void
): Promise<void> {
  const executor = createRemotePwshExecutor({
    host,
    user,
    scriptPath
  });
  
  // リアルタイム出力監視
  executor.on('stdout', (line: string) => {
    onOutput(line);
  });
  
  executor.on('stderr', (line: string) => {
    console.warn(`stderr: ${line}`);
  });
  
  await executor.invokeAsync();
}
```

## 🛠️ エラーハンドリングと回復

### **1. PowerShellエラー処理**

```typescript
export class PowerShellErrorHandler {
  static async handleScriptError(error: Error, context: ExecutionContext): Promise<void> {
    if (error.message.includes('Authentication failed')) {
      throw new AuthenticationError(`SSH authentication failed for ${context.host}`);
    }
    
    if (error.message.includes('Network unreachable')) {
      throw new NetworkError(`Cannot reach host ${context.host}`);
    }
    
    if (error.message.includes('File not found')) {
      throw new FileNotFoundError(`Script not found: ${context.scriptPath}`);
    }
    
    // 一般的なエラー
    throw new PowerShellExecutionError(`Script execution failed: ${error.message}`);
  }
  
  static async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error('Max retries exceeded');
  }
}
```

### **2. 接続プール管理**

```typescript
export class PSSessionPool {
  private pool = new Map<string, PSSessionInfo>();
  private maxSessions = 10;
  private sessionTimeout = 30 * 60 * 1000; // 30分
  
  async acquireSession(host: string, user: string): Promise<PSSessionInfo> {
    const key = `${host}:${user}`;
    const existing = this.pool.get(key);
    
    if (existing && this.isSessionValid(existing)) {
      existing.lastUsed = Date.now();
      return existing;
    }
    
    // 新しいセッション作成
    const session = await this.createNewSession(host, user);
    this.pool.set(key, session);
    
    return session;
  }
  
  private isSessionValid(session: PSSessionInfo): boolean {
    const now = Date.now();
    return (now - session.lastUsed) < this.sessionTimeout;
  }
  
  async cleanupExpiredSessions(): Promise<void> {
    const now = Date.now();
    
    for (const [key, session] of this.pool.entries()) {
      if ((now - session.lastUsed) > this.sessionTimeout) {
        await this.closeSession(session);
        this.pool.delete(key);
      }
    }
  }
}
```

## 📊 パフォーマンス最適化

### **1. 🚨 重要: FileTransferServiceシリアル処理要件**

FileTransferServiceには以下の重要な要件があります：

#### **シリアル処理の必要性**
- **ファイル転送**: 準備段階（アップロード）と結果取得段階（ダウンロード）は**シリアル処理**
- **Abaqus実行**: 解析段階は**並列処理**可能
- **理由**: リソース競合回避、ストレージ容量管理、エラー処理簡素化

#### **実行フロー図**
```
┌─────────────────────────────────────────────────────────────┐
│                 適切な実行フロー                              │
├─────────────────────────────────────────────────────────────┤
│ Phase 1: ファイル準備 (シリアル処理)                         │
│ ├─ Job A: INPファイル転送 ■■■■■                          │
│ ├─ Job B: INPファイル転送      ■■■■■                     │
│ └─ Job C: INPファイル転送           ■■■■■                │
│                                                             │
│ Phase 2: Abaqus実行 (並列処理)                              │
│ ├─ Job A: Abaqus実行 ■■■■■■■■■■■■■■■■■■■■■■■■■■■■ │
│ ├─ Job B: Abaqus実行 ■■■■■■■■■■■■■■■■■■■■■■■■■■■■ │
│ └─ Job C: Abaqus実行 ■■■■■■■■■■■■■■■■■■■■■■■■■■■■ │
│                                                             │
│ Phase 3: 結果収集 (シリアル処理)                             │
│ ├─ Job A: 結果ファイル転送 ■■■■■                          │
│ ├─ Job B: 結果ファイル転送      ■■■■■                     │
│ └─ Job C: 結果ファイル転送           ■■■■■                │
└─────────────────────────────────────────────────────────────┘
```

#### **シリアル処理の理由**
1. **ネットワーク帯域制限**: 複数の大容量ファイル転送による帯域競合回避
2. **ディスクI/O制限**: 同時ファイル操作によるI/Oボトルネック回避
3. **SSH接続制限**: 同一ノードへの複数接続による競合回避
4. **ストレージ容量**: 一時的な大容量ファイル蓄積による容量不足回避
5. **エラー処理**: 転送エラーの原因特定と回復処理の簡素化

### **2. 適切な並行実行**

```typescript
// 🚨 修正版: 適切な並行実行（ファイル転送はシリアル）
export class AbaqusJobScheduler {
  private readonly maxConcurrentExecutions = 5; // Abaqus実行のみ並列
  private readonly fileTransferService: FileTransferService;
  
  async executeJobsBatch(jobs: Job[], nodes: Node[]): Promise<JobExecutionResult[]> {
    const results: JobExecutionResult[] = [];
    
    try {
      // Phase 1: ファイル転送（シリアル処理）
      console.log('Phase 1: ファイル転送開始（シリアル処理）');
      for (const job of jobs) {
        const node = this.selectOptimalNode(job, nodes);
        job.assignedNode = node;
        
        console.log(`ジョブ ${job.id} のファイル転送を開始`);
        const uploadResult = await this.fileTransferService.uploadJobFiles(job, node);
        
        if (!uploadResult.success) {
          throw new Error(`Job ${job.id} file upload failed: ${uploadResult.error}`);
        }
      }
      
      // Phase 2: Abaqus実行（並列処理）
      console.log('Phase 2: Abaqus実行開始（並列処理）');
      const executionPromises = jobs.map(job => 
        this.executeAbaqusOnly(job, job.assignedNode)
      );
      const executionResults = await Promise.all(executionPromises);
      
      // Phase 3: 結果収集（シリアル処理）
      console.log('Phase 3: 結果収集開始（シリアル処理）');
      for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i];
        const executionResult = executionResults[i];
        
        if (executionResult.success) {
          console.log(`ジョブ ${job.id} の結果収集を開始`);
          const downloadResult = await this.fileTransferService.downloadResults(job, job.assignedNode);
          
          results.push({
            success: true,
            jobId: job.id,
            executionTime: executionResult.executionTime,
            outputFiles: downloadResult.resultFiles,
            executionId: `batch-${job.id}-${Date.now()}`
          });
        } else {
          results.push({
            success: false,
            jobId: job.id,
            error: executionResult.error,
            executionId: `batch-${job.id}-${Date.now()}`
          });
        }
      }
      
    } catch (error) {
      console.error('バッチ実行エラー:', error);
      throw error;
    }
    
    return results;
  }
  
  private selectOptimalNode(job: Job, nodes: Node[]): Node {
    // 最適ノード選択ロジック
    return nodes.find(node => 
      node.cpu_cores_limit >= job.cpu_cores &&
      node.status === 'available'
    ) || nodes[0];
  }
}
```

### **2. ファイル転送最適化**

```typescript
// 大容量ファイル転送最適化
export class OptimizedFileTransfer {
  async transferLargeDirectory(
    source: string,
    destination: string,
    session: PSSession
  ): Promise<void> {
    const fileCount = await this.countFiles(source);
    
    if (fileCount > 1000) {
      // 大量ファイルの場合は圧縮転送
      await this.compressAndTransfer(source, destination, session);
    } else {
      // 通常転送
      await this.standardTransfer(source, destination, session);
    }
  }
  
  private async compressAndTransfer(
    source: string,
    destination: string,
    session: PSSession
  ): Promise<void> {
    const zipPath = `${source}.zip`;
    
    // 圧縮
    await this.compressDirectory(source, zipPath);
    
    // 転送
    await this.transferFile(zipPath, destination, session);
    
    // リモートで解凍
    await this.extractRemoteZip(destination, session);
    
    // クリーンアップ
    await this.cleanup(zipPath);
  }
}
```

## 🧪 テスト戦略

### **1. 単体テスト**

```typescript
// PowerShellスクリプトのモックテスト
describe('FileTransferService', () => {
  let service: FileTransferService;
  let mockExecutor: jest.Mocked<RemotePwshExecutor>;
  
  beforeEach(() => {
    mockExecutor = {
      invokeAsync: jest.fn(),
      on: jest.fn()
    };
    
    service = new FileTransferService(mockExecutor);
  });
  
  test('should upload files successfully', async () => {
    mockExecutor.invokeAsync.mockResolvedValue({
      returnCode: 0,
      stdout: 'Files uploaded successfully',
      stderr: '',
      host: 'test-host',
      user: 'test-user',
      scriptPath: '/test/script.ps1',
      startAt: Date.now(),
      finishAt: Date.now(),
      lastOutput: ''
    });
    
    const result = await service.uploadJobFiles(mockJob, mockNode);
    
    expect(result.success).toBe(true);
    expect(mockExecutor.invokeAsync).toHaveBeenCalledWith();
  });
});
```

### **2. 統合テスト**

```typescript
// 実際のPowerShellスクリプト実行テスト
describe('PowerShell Integration', () => {
  test('should execute real PowerShell script', async () => {
    const executor = createRemotePwshExecutor({
      host: 'test-node',
      user: 'test-user',
      scriptPath: '/app/resources/ps-scripts/executeAbaqus.ps1'
    });
    
    const result = await executor.invokeAsync();
    
    expect(result.returnCode).toBe(0);
    expect(result.stdout).toContain('Abaqus execution completed');
  });
});
```

## 🔒 セキュリティ考慮事項

### **1. 認証情報管理**

```typescript
// 安全な認証情報管理
export class SecureCredentialManager {
  private static readonly CREDENTIALS_KEY = 'ssh-credentials';
  
  static async getCredentials(nodeId: number): Promise<NodeCredentials> {
    const credentials = await this.getEncryptedCredentials(nodeId);
    return this.decryptCredentials(credentials);
  }
  
  static async setCredentials(nodeId: number, credentials: NodeCredentials): Promise<void> {
    const encrypted = await this.encryptCredentials(credentials);
    await this.storeEncryptedCredentials(nodeId, encrypted);
  }
}
```

### **2. スクリプト検証**

```typescript
// PowerShellスクリプトの整合性検証
export class ScriptValidator {
  static async validateScript(scriptPath: string): Promise<boolean> {
    const content = await fs.readFile(scriptPath, 'utf8');
    
    // 危険なコマンドのチェック
    const dangerousCommands = [
      'Remove-Item',
      'Delete',
      'Format-',
      'Clear-'
    ];
    
    for (const command of dangerousCommands) {
      if (content.includes(command)) {
        console.warn(`Potentially dangerous command found: ${command}`);
      }
    }
    
    return true;
  }
}
```

## 📝 新規PowerShellスクリプト作成ガイドライン

### **1. スクリプト命名規則**

**重要**: PowerShellスクリプトファイル名は**キャメルケース**を使用してください。

```
✅ 正しい命名（キャメルケース）
- executeAbaqus.ps1
- sendDirectory.ps1
- receiveDirectory.ps1
- sshRemoteSession.ps1
- getJobStatus.ps1
- cleanupWorkspace.ps1

❌ 間違った命名（ケバブケース・スネークケース）
- execute-abaqus.ps1
- send-directory.ps1
- execute_abaqus.ps1
- send_directory.ps1
```

### **2. sshRemoteSession.ps1実行パターン**

`sshRemoteSession.ps1`は、第一引数の型を解析して2つの実行パターンを自動選択します：

#### **パターン1: PSSession-aware スクリプト**
第一引数が`PSSession`型の場合、PSSessionが直接引数として渡されます。

```powershell
# PSSession-aware スクリプト例
param (
  [parameter(mandatory=$true)][System.Management.Automation.Runspaces.PSSession]$Session,
  [parameter(mandatory=$true)][string]$Source,
  [parameter(mandatory=$true)][string]$Destination
)

# PSSessionを使用したファイル操作
Copy-Item –Path $Source –Destination $Destination –ToSession $Session -Force -Recurse
```

**実行方法**:
```powershell
# sshRemoteSession.ps1が自動的にPSSessionを作成し、第一引数として渡す
pwsh sshRemoteSession.ps1 hostname username sendDirectory.ps1 /local/path /remote/path
```

#### **パターン2: 通常のスクリプト**
第一引数が`PSSession`型でない場合、PSSessionコンテキスト内で実行されます。

```powershell
# 通常のスクリプト例
param(
  [parameter(mandatory=$true)][string]$jobName,
  [parameter(mandatory=$true)][string]$workingDir,
  [parameter(mandatory=$true)][string]$inputFile,
  [parameter(ValueFromRemainingArguments=$true)]$args
)

# リモートノード上で直接実行される
Push-Location $workingDir
abaqus interactive "job=${jobName}" "input=${inputFile}" @args
Pop-Location
```

**実行方法**:
```powershell
# sshRemoteSession.ps1がPSSessionを作成し、その中でスクリプトを実行
pwsh sshRemoteSession.ps1 hostname username executeAbaqus.ps1 testJob /work/dir input.inp cpu=4
```

### **3. スクリプト作成テンプレート**

#### **テンプレート1: PSSession-aware スクリプト**
ファイル転送やリモートオブジェクト操作向け：

```powershell
# 新しいファイル転送スクリプト例: uploadResults.ps1
param (
  [parameter(mandatory=$true)][System.Management.Automation.Runspaces.PSSession]$Session,
  [parameter(mandatory=$true)][string]$LocalPath,
  [parameter(mandatory=$true)][string]$RemotePath,
  [parameter(mandatory=$false)][switch]$Compress
)

try {
  if ($Compress) {
    # 圧縮転送の場合
    $tempZip = "${LocalPath}.zip"
    Compress-Archive -Path $LocalPath -DestinationPath $tempZip -Force
    Copy-Item -Path $tempZip -Destination $RemotePath -ToSession $Session -Force
    Remove-Item -Path $tempZip -Force
  } else {
    # 通常転送の場合
    Copy-Item -Path $LocalPath -Destination $RemotePath -ToSession $Session -Force -Recurse
  }
  
  Write-Output "Upload completed successfully"
} catch {
  Write-Error "Upload failed: $_"
  exit 1
}
```

#### **テンプレート2: 通常のスクリプト**
リモートノード上でのコマンド実行向け：

```powershell
# 新しいAbaqus管理スクリプト例: checkAbaqusStatus.ps1
param(
  [parameter(mandatory=$true)][string]$JobName,
  [parameter(mandatory=$true)][string]$WorkingDir,
  [parameter(mandatory=$false)][int]$TimeoutMinutes = 60
)

try {
  Push-Location $WorkingDir
  
  # Abaqusジョブステータスチェック
  $statusFile = "${JobName}.sta"
  $logFile = "${JobName}.log"
  
  if (Test-Path $statusFile) {
    $statusContent = Get-Content $statusFile -Tail 10
    Write-Output "Status file contents (last 10 lines):"
    $statusContent | ForEach-Object { Write-Output $_ }
  } else {
    Write-Output "Status file not found: $statusFile"
  }
  
  if (Test-Path $logFile) {
    $logContent = Get-Content $logFile -Tail 20
    Write-Output "Log file contents (last 20 lines):"
    $logContent | ForEach-Object { Write-Output $_ }
  } else {
    Write-Output "Log file not found: $logFile"
  }
  
  Pop-Location
  
  Write-Output "Status check completed"
} catch {
  Write-Error "Status check failed: $_"
  exit 1
}
```

### **4. スクリプト作成のベストプラクティス**

#### **4.1 共通規則**
```powershell
# 1. 必須パラメータは明示的に定義
param(
  [parameter(mandatory=$true)][string]$RequiredParam,
  [parameter(mandatory=$false)][string]$OptionalParam = "default"
)

# 2. エラーハンドリングを必須実装
try {
  # メイン処理
} catch {
  Write-Error "Operation failed: $_"
  exit 1
}

# 3. 進捗とログ出力
Write-Output "Starting operation..."
Write-Output "Operation completed successfully"
```

#### **4.2 PSSession-aware スクリプト固有**
```powershell
# 1. PSSession型を明示的に定義
param (
  [parameter(mandatory=$true)][System.Management.Automation.Runspaces.PSSession]$Session,
  # 他のパラメータ...
)

# 2. PSSessionを使用したリモート操作
Copy-Item -Path $local -Destination $remote -ToSession $Session -Force
Invoke-Command -Session $Session -ScriptBlock { Get-Process }
```

#### **4.3 通常スクリプト固有**
```powershell
# 1. 作業ディレクトリ管理
Push-Location $WorkingDir
try {
  # メイン処理
} finally {
  Pop-Location
}

# 2. 外部コマンド実行
$result = & "external-command" @args
if ($LASTEXITCODE -ne 0) {
  throw "External command failed with exit code $LASTEXITCODE"
}
```

### **5. TypeScript連携パターン**

#### **5.1 PSSession-aware スクリプト実行**
```typescript
// TypeScriptからPSSession-awareスクリプトを実行
async function executeFileTransfer(
  host: string,
  user: string,
  localPath: string,
  remotePath: string
): Promise<void> {
  const executor = createRemotePwshExecutor({
    host,
    user,
    scriptPath: '/app/resources/ps-scripts/uploadResults.ps1'
  });
  
  // 引数はsshRemoteSession.ps1が自動的にPSSessionを追加
  const result = await executor.invokeAsync();
  
  if (result.returnCode !== 0) {
    throw new Error(`File transfer failed: ${result.stderr}`);
  }
}
```

#### **5.2 通常スクリプト実行**
```typescript
// TypeScriptから通常スクリプトを実行
async function checkJobStatus(
  host: string,
  user: string,
  jobName: string,
  workingDir: string
): Promise<string> {
  const executor = createRemotePwshExecutor({
    host,
    user,
    scriptPath: '/app/resources/ps-scripts/checkAbaqusStatus.ps1'
  });
  
  const result = await executor.invokeAsync();
  
  if (result.returnCode !== 0) {
    throw new Error(`Status check failed: ${result.stderr}`);
  }
  
  return result.stdout;
}
```

### **6. 新規スクリプト追加手順**

1. **スクリプト命名**: キャメルケースでファイル名を決定
2. **実行パターン選択**: PSSession-awareか通常スクリプトかを決定
3. **テンプレート使用**: 適切なテンプレートをベースに作成
4. **エラーハンドリング**: try-catchブロックとexit codeを実装
5. **テスト**: 手動実行で動作確認
6. **TypeScript統合**: 必要に応じてTypeScriptラッパー関数を作成

### **7. 既存スクリプトの参照**

既存のスクリプトを参考にして新規作成を行うことを推奨します：

- `sendDirectory.ps1` - PSSession-awareファイル転送の例
- `receiveDirectory.ps1` - PSSession-awareファイル取得の例
- `executeAbaqus.ps1` - 通常スクリプトでの外部コマンド実行例
- `sshRemoteSession.ps1` - PSSession管理とスクリプト実行パターン判定

このガイドラインに従って、効率的で保守性の高いPowerShellスクリプトを作成し、sshRemoteSession.ps1との連携を確実に行えます。

このPowerShell統合ガイドにより、既存のスクリプトを活用した安全で効率的なAbaqusジョブ実行システムを構築できます。