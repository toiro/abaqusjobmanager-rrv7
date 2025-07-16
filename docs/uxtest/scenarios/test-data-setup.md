# SSEテストデータセットアップガイド

## 📋 概要

SSE特化テストで使用するテストデータの準備・管理方法を説明します。テストの一貫性と再現性を確保するために、標準化されたデータセットを使用します。

## 🎯 テストデータ要件

### **基本要件**
- **再現性**: 同じ条件で何度でも実行可能
- **独立性**: テスト間でデータの干渉なし
- **リアルタイム**: SSEイベントの発生・受信が可能
- **クリーンアップ**: テスト後の自動データ削除

### **データ種別**
- **ユーザーデータ**: SSEイベント送信用
- **ライセンス情報**: 更新テスト用の状態データ
- **ジョブデータ**: ステータス変更テスト用
- **ノード情報**: 接続テスト用

## 📊 テストデータ構成

### **1. ユーザーデータ**

```javascript
// tests/fixtures/users.json
{
  "testUsers": [
    {
      "id": 1,
      "name": "test-user",
      "display_name": "Test User",
      "max_concurrent_jobs": 5,
      "is_active": true
    },
    {
      "id": 2,
      "name": "admin-user",
      "display_name": "Admin User",
      "max_concurrent_jobs": 10,
      "is_active": true
    }
  ]
}
```

### **2. ライセンス状態データ**

```javascript
// tests/fixtures/license-states.json
{
  "licenseStates": [
    {
      "name": "initial",
      "used_tokens": 5,
      "total_tokens": 12,
      "warning_threshold": 0.9,
      "should_show_warning": false
    },
    {
      "name": "updated",
      "used_tokens": 11,
      "total_tokens": 12,
      "warning_threshold": 0.9,
      "should_show_warning": true
    },
    {
      "name": "critical",
      "used_tokens": 12,
      "total_tokens": 12,
      "warning_threshold": 0.9,
      "should_show_warning": true
    }
  ]
}
```

### **3. SSEイベントデータ**

```javascript
// tests/fixtures/sse-events.json
{
  "sseEvents": [
    {
      "type": "license_update",
      "channel": "system",
      "data": {
        "used_tokens": 11,
        "total_tokens": 12,
        "timestamp": "2025-01-15T10:30:00Z"
      }
    },
    {
      "type": "job_status_changed",
      "channel": "jobs",
      "data": {
        "job_id": 1,
        "status": "running",
        "timestamp": "2025-01-15T10:31:00Z"
      }
    },
    {
      "type": "connected",
      "channel": "system",
      "data": {
        "client_id": "test-client",
        "timestamp": "2025-01-15T10:32:00Z"
      }
    },
    {
      "type": "ping",
      "channel": "system",
      "data": {
        "timestamp": "2025-01-15T10:33:00Z"
      }
    }
  ]
}
```

### **4. ジョブテストデータ**

```javascript
// tests/fixtures/jobs.json
{
  "testJobs": [
    {
      "id": 1,
      "name": "SSE Test Job 1",
      "status": "waiting",
      "user_id": 1,
      "node_id": 1,
      "created_at": "2025-01-15T10:00:00Z"
    },
    {
      "id": 2,
      "name": "SSE Test Job 2",
      "status": "running",
      "user_id": 1,
      "node_id": 1,
      "created_at": "2025-01-15T10:05:00Z"
    }
  ]
}
```

## 🛠 テストデータベースセットアップ

### **1. テストデータベース初期化**

```javascript
// tests/setup/database-setup.js
import { Database } from 'bun:sqlite';
import fs from 'fs';

export async function initializeTestDatabase() {
  const dbPath = './tests/test-database.db';
  
  // 既存のテストデータベースを削除
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
  
  // 新しいテストデータベースを作成
  const db = new Database(dbPath);
  
  // スキーマ作成
  const schema = fs.readFileSync('./resources/sql/01_create_tables.sql', 'utf-8');
  db.exec(schema);
  
  // テストデータ投入
  await insertTestData(db);
  
  db.close();
  return dbPath;
}

async function insertTestData(db) {
  // ユーザーデータ投入
  db.run(`
    INSERT INTO users (name, display_name, max_concurrent_jobs, is_active)
    VALUES 
      ('test-user', 'Test User', 5, 1),
      ('admin-user', 'Admin User', 10, 1)
  `);
  
  // ノードデータ投入
  db.run(`
    INSERT INTO nodes (name, hostname, ssh_port, ssh_username, cpu_cores, max_license_tokens, is_active)
    VALUES 
      ('test-node-01', 'localhost', 22, 'testuser', 8, 8, 1),
      ('test-node-02', 'localhost', 22, 'testuser', 4, 4, 1)
  `);
  
  // テストジョブデータ投入
  db.run(`
    INSERT INTO jobs (name, status, user_id, node_id, cpu_cores, priority, file_id, created_at)
    VALUES 
      ('SSE Test Job 1', 'waiting', 1, 1, 4, 'normal', 1, datetime('now')),
      ('SSE Test Job 2', 'running', 1, 1, 2, 'high', 2, datetime('now'))
  `);
}
```

### **2. テストデータクリーンアップ**

```javascript
// tests/setup/database-cleanup.js
import fs from 'fs';

export async function cleanupTestDatabase() {
  const dbPath = './tests/test-database.db';
  
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
  
  // テストファイルのクリーンアップ
  const testUploadsDir = './tests/uploads';
  if (fs.existsSync(testUploadsDir)) {
    fs.rmSync(testUploadsDir, { recursive: true, force: true });
  }
}
```

## 🎭 テストヘルパー関数

### **1. SSEイベント送信ヘルパー**

```javascript
// tests/utils/sse-helpers.js
export class SSETestHelpers {
  static async sendLicenseUpdate(page, newState = 'updated') {
    await page.goto('/test/sse');
    await page.getByRole('button', { name: 'Send License Update' }).click();
    await expect(page.getByText('✅ license_update event emitted successfully')).toBeVisible();
  }
  
  static async sendJobStatusUpdate(page, jobId = 1, newStatus = 'running') {
    await page.goto('/test/sse');
    await page.getByRole('button', { name: 'Send Job Status Update' }).click();
    await expect(page.getByText('✅ job_status_changed event emitted successfully')).toBeVisible();
  }
  
  static async sendConnectionEvent(page) {
    await page.goto('/test/sse');
    await page.getByRole('button', { name: 'Send Connection Event' }).click();
    await expect(page.getByText('✅ connected event emitted successfully')).toBeVisible();
  }
  
  static async sendPingEvent(page) {
    await page.goto('/test/sse');
    await page.getByRole('button', { name: 'Send Ping Event' }).click();
    await expect(page.getByText('✅ ping event emitted successfully')).toBeVisible();
  }
}
```

### **2. 状態確認ヘルパー**

```javascript
// tests/utils/state-helpers.js
export class StateHelpers {
  static async waitForSSEConnection(page, timeout = 10000) {
    await expect(page.getByText('Real-time updates active')).toBeVisible({ timeout });
    await expect(page.getByText('(connected)')).toBeVisible();
  }
  
  static async getCurrentLicenseState(page) {
    const licenseText = await page.getByText(/License: \d+\/\d+ tokens/).textContent();
    const match = licenseText.match(/License: (\d+)\/(\d+) tokens/);
    
    if (!match) {
      throw new Error('License information not found');
    }
    
    return {
      used: parseInt(match[1]),
      total: parseInt(match[2]),
      text: licenseText
    };
  }
  
  static async hasLicenseWarning(page) {
    return await page.getByText('⚠ Limited submission').isVisible();
  }
  
  static async getSSEConnectionStatus(page) {
    const statusElements = await page.locator('text=/\\((connected|connecting|error)\\)/').all();
    
    if (statusElements.length === 0) {
      return 'unknown';
    }
    
    const statusText = await statusElements[0].textContent();
    return statusText.replace(/[()]/g, ''); // Remove parentheses
  }
}
```

### **3. ネットワーク操作ヘルパー**

```javascript
// tests/utils/network-helpers.js
export class NetworkHelpers {
  static async simulateNetworkFailure(page) {
    await page.route('**/api/events*', route => route.abort());
    console.log('Network failure simulated - SSE endpoint blocked');
  }
  
  static async simulateServerError(page, statusCode = 500) {
    await page.route('**/api/events*', route => route.fulfill({
      status: statusCode,
      body: JSON.stringify({ error: 'Server Error' })
    }));
    console.log(`Server error simulated - Status: ${statusCode}`);
  }
  
  static async restoreNetwork(page) {
    await page.unroute('**/api/events*');
    console.log('Network restored - SSE endpoint unblocked');
  }
  
  static async simulateSlowNetwork(page, delayMs = 2000) {
    await page.route('**/api/events*', async route => {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      route.continue();
    });
    console.log(`Slow network simulated - Delay: ${delayMs}ms`);
  }
}
```

## 📋 テストデータ管理戦略

### **1. テスト実行前セットアップ**

```javascript
// tests/setup/global-setup.js
import { initializeTestDatabase } from './database-setup.js';

async function globalSetup() {
  console.log('🔧 Setting up test environment...');
  
  // テストデータベース初期化
  await initializeTestDatabase();
  
  // テスト用ディレクトリ作成
  const testDirs = ['./tests/uploads', './tests/screenshots', './tests/logs'];
  testDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
  
  console.log('✅ Test environment ready');
}

export default globalSetup;
```

### **2. テスト実行後クリーンアップ**

```javascript
// tests/setup/global-teardown.js
import { cleanupTestDatabase } from './database-cleanup.js';

async function globalTeardown() {
  console.log('🧹 Cleaning up test environment...');
  
  // テストデータベース削除
  await cleanupTestDatabase();
  
  console.log('✅ Test environment cleaned');
}

export default globalTeardown;
```

### **3. 各テスト前後の処理**

```javascript
// tests/setup/test-hooks.js
import { test as base } from '@playwright/test';
import { StateHelpers } from '../utils/state-helpers.js';

export const test = base.extend({
  // テスト前処理
  async page({ page }, use) {
    // 各テスト前の初期化
    await page.goto('/');
    await StateHelpers.waitForSSEConnection(page);
    
    await use(page);
    
    // テスト後のクリーンアップ
    await page.close();
  }
});
```

## 📊 テストデータ検証

### **1. データ整合性チェック**

```javascript
// tests/utils/data-validation.js
export class DataValidation {
  static async validateLicenseState(page, expectedState) {
    const currentState = await StateHelpers.getCurrentLicenseState(page);
    
    expect(currentState.used).toBe(expectedState.used);
    expect(currentState.total).toBe(expectedState.total);
    
    const shouldShowWarning = (currentState.used / currentState.total) >= 0.9;
    const hasWarning = await StateHelpers.hasLicenseWarning(page);
    
    expect(hasWarning).toBe(shouldShowWarning);
  }
  
  static async validateSSEConnection(page) {
    const status = await StateHelpers.getSSEConnectionStatus(page);
    expect(status).toBe('connected');
    
    await expect(page.getByText('Real-time updates active')).toBeVisible();
  }
}
```

### **2. テストデータ一貫性確保**

```javascript
// tests/utils/data-consistency.js
export class DataConsistency {
  static async resetToInitialState(page) {
    // データベース状態をリセット
    await page.goto('/test/reset-data'); // 実装が必要
    
    // SSE接続を再確立
    await StateHelpers.waitForSSEConnection(page);
    
    // 初期ライセンス状態を確認
    const initialState = await StateHelpers.getCurrentLicenseState(page);
    expect(initialState.used).toBe(5);
    expect(initialState.total).toBe(12);
  }
  
  static async ensureCleanState(page) {
    // 既存のネットワーク設定をクリア
    await page.unroute('**/api/events*');
    
    // SSE接続状態を確認
    await StateHelpers.waitForSSEConnection(page);
  }
}
```

## 🎯 使用例

### **典型的なテストケース**

```javascript
// tests/sse-focused/example-with-data.spec.js
import { test, expect } from '@playwright/test';
import { SSETestHelpers } from '../utils/sse-helpers.js';
import { StateHelpers } from '../utils/state-helpers.js';
import { DataValidation } from '../utils/data-validation.js';

test.describe('SSE with Test Data', () => {
  test('TC-SSE-002: License update with validation', async ({ page }) => {
    // 初期状態確認
    await StateHelpers.waitForSSEConnection(page);
    await DataValidation.validateLicenseState(page, { used: 5, total: 12 });
    
    // ライセンス更新イベント送信
    await SSETestHelpers.sendLicenseUpdate(page);
    
    // 更新後状態確認
    await page.goto('/');
    await DataValidation.validateLicenseState(page, { used: 11, total: 12 });
  });
});
```

## 📈 データ管理ベストプラクティス

### **1. データ独立性**
- 各テストケースで独立したデータセット使用
- テスト間でのデータ共有を避ける
- 並列実行時のデータ競合防止

### **2. リアルタイム性**
- SSEイベントのタイムスタンプ管理
- イベント順序の保証
- 状態変化の追跡可能性

### **3. エラーハンドリング**
- データ準備失敗時の適切なエラーメッセージ
- 部分的なデータ準備での対応
- テスト環境の健全性チェック

### **4. パフォーマンス**
- 必要最小限のデータ準備
- データ準備時間の最適化
- メモリ使用量の監視

---

このテストデータセットアップにより、一貫性のあるSSE特化テストの実行環境を効率的に構築・管理できます。