# SSEテスト用ヘルパー関数ドキュメント

## 📋 概要

SSE（Server-Sent Events）特化テストで使用するヘルパー関数の詳細ドキュメントです。再利用可能で効率的なテストコードを書くための共通ライブラリを提供します。

## 🎯 ヘルパー関数体系

### **関数分類**
- **SSEHelpers**: SSEイベント送信・接続管理
- **StateHelpers**: 画面状態確認・データ取得
- **NetworkHelpers**: ネットワーク操作・障害シミュレート
- **PerformanceHelpers**: パフォーマンス測定
- **DebugHelpers**: デバッグ情報収集

## 🔧 SSEHelpers - SSE操作関数

### **接続管理**

```javascript
// tests/utils/sse-helpers.js
import { expect } from '@playwright/test';

export class SSEHelpers {
  /**
   * SSE接続確立の待機
   * @param {Page} page - Playwrightページオブジェクト
   * @param {number} timeout - タイムアウト（デフォルト: 10秒）
   * @returns {Promise<void>}
   */
  static async waitForSSEConnection(page, timeout = 10000) {
    await expect(page.getByText('Real-time updates active')).toBeVisible({ timeout });
    await expect(page.getByText('(connected)')).toBeVisible();
    
    console.log('✅ SSE connection established');
  }
  
  /**
   * SSE接続状態の確認
   * @param {Page} page - Playwrightページオブジェクト
   * @returns {Promise<boolean>} 接続済みかどうか
   */
  static async isSSEConnected(page) {
    try {
      await page.getByText('Real-time updates active').waitFor({ timeout: 1000 });
      await page.getByText('(connected)').waitFor({ timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * SSE接続の再確立
   * @param {Page} page - Playwrightページオブジェクト
   * @param {number} maxRetries - 最大リトライ回数
   * @returns {Promise<void>}
   */
  static async reconnectSSE(page, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await page.reload();
        await this.waitForSSEConnection(page);
        console.log(`✅ SSE reconnected on attempt ${i + 1}`);
        return;
      } catch (error) {
        console.log(`❌ SSE reconnection failed on attempt ${i + 1}`);
        if (i === maxRetries - 1) throw error;
        await page.waitForTimeout(2000);
      }
    }
  }
}
```

### **イベント送信**

```javascript
export class SSEHelpers {
  /**
   * ライセンス更新イベント送信
   * @param {Page} page - Playwrightページオブジェクト
   * @returns {Promise<void>}
   */
  static async sendLicenseUpdate(page) {
    await page.goto('/test/sse');
    await this.waitForSSEConnection(page);
    
    const startTime = Date.now();
    await page.getByRole('button', { name: 'Send License Update' }).click();
    await expect(page.getByText('✅ license_update event emitted successfully')).toBeVisible();
    
    const duration = Date.now() - startTime;
    console.log(`📡 License update event sent (${duration}ms)`);
  }
  
  /**
   * ジョブステータス更新イベント送信
   * @param {Page} page - Playwrightページオブジェクト
   * @returns {Promise<void>}
   */
  static async sendJobStatusUpdate(page) {
    await page.goto('/test/sse');
    await this.waitForSSEConnection(page);
    
    await page.getByRole('button', { name: 'Send Job Status Update' }).click();
    await expect(page.getByText('✅ job_status_changed event emitted successfully')).toBeVisible();
    
    console.log('📡 Job status update event sent');
  }
  
  /**
   * 接続イベント送信
   * @param {Page} page - Playwrightページオブジェクト
   * @returns {Promise<void>}
   */
  static async sendConnectionEvent(page) {
    await page.goto('/test/sse');
    await this.waitForSSEConnection(page);
    
    await page.getByRole('button', { name: 'Send Connection Event' }).click();
    await expect(page.getByText('✅ connected event emitted successfully')).toBeVisible();
    
    console.log('📡 Connection event sent');
  }
  
  /**
   * Pingイベント送信
   * @param {Page} page - Playwrightページオブジェクト
   * @returns {Promise<void>}
   */
  static async sendPingEvent(page) {
    await page.goto('/test/sse');
    await this.waitForSSEConnection(page);
    
    await page.getByRole('button', { name: 'Send Ping Event' }).click();
    await expect(page.getByText('✅ ping event emitted successfully')).toBeVisible();
    
    console.log('📡 Ping event sent');
  }
  
  /**
   * 複数イベントの連続送信
   * @param {Page} page - Playwrightページオブジェクト
   * @param {Array<string>} eventTypes - 送信するイベント種別
   * @param {number} intervalMs - イベント間の間隔（ms）
   * @returns {Promise<void>}
   */
  static async sendMultipleEvents(page, eventTypes, intervalMs = 500) {
    await page.goto('/test/sse');
    await this.waitForSSEConnection(page);
    
    const eventMethods = {
      'license_update': () => this.sendLicenseUpdate(page),
      'job_status_update': () => this.sendJobStatusUpdate(page),
      'connection': () => this.sendConnectionEvent(page),
      'ping': () => this.sendPingEvent(page)
    };
    
    for (const eventType of eventTypes) {
      if (eventMethods[eventType]) {
        await eventMethods[eventType]();
        await page.waitForTimeout(intervalMs);
      }
    }
    
    console.log(`📡 Sent ${eventTypes.length} events with ${intervalMs}ms intervals`);
  }
}
```

## 📊 StateHelpers - 状態確認関数

### **ライセンス状態管理**

```javascript
// tests/utils/state-helpers.js
export class StateHelpers {
  /**
   * 現在のライセンス状態取得
   * @param {Page} page - Playwrightページオブジェクト
   * @returns {Promise<Object>} ライセンス状態オブジェクト
   */
  static async getCurrentLicenseState(page) {
    try {
      const licenseText = await page.getByText(/License: \d+\/\d+ tokens/).textContent();
      const match = licenseText.match(/License: (\d+)\/(\d+) tokens/);
      
      if (!match) {
        throw new Error('License information not found');
      }
      
      const used = parseInt(match[1]);
      const total = parseInt(match[2]);
      const utilizationRate = used / total;
      
      return {
        used,
        total,
        utilizationRate,
        text: licenseText,
        isNearLimit: utilizationRate >= 0.9
      };
    } catch (error) {
      console.error('❌ Failed to get license state:', error.message);
      throw error;
    }
  }
  
  /**
   * ライセンス警告の表示確認
   * @param {Page} page - Playwrightページオブジェクト
   * @returns {Promise<boolean>} 警告表示されているかどうか
   */
  static async hasLicenseWarning(page) {
    try {
      return await page.getByText('⚠ Limited submission').isVisible();
    } catch {
      return false;
    }
  }
  
  /**
   * ライセンス状態の変更待機
   * @param {Page} page - Playwrightページオブジェクト
   * @param {Object} expectedState - 期待される状態
   * @param {number} timeout - タイムアウト（ms）
   * @returns {Promise<void>}
   */
  static async waitForLicenseStateChange(page, expectedState, timeout = 5000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const currentState = await this.getCurrentLicenseState(page);
      
      if (currentState.used === expectedState.used && 
          currentState.total === expectedState.total) {
        console.log('✅ License state changed to expected values');
        return;
      }
      
      await page.waitForTimeout(100);
    }
    
    throw new Error(`License state did not change within ${timeout}ms`);
  }
}
```

### **SSE接続状態管理**

```javascript
export class StateHelpers {
  /**
   * SSE接続状態の取得
   * @param {Page} page - Playwrightページオブジェクト
   * @returns {Promise<string>} 接続状態 ('connected', 'connecting', 'error', 'unknown')
   */
  static async getSSEConnectionStatus(page) {
    try {
      const connectedVisible = await page.getByText('(connected)').isVisible();
      if (connectedVisible) return 'connected';
      
      const connectingVisible = await page.getByText('(connecting)').isVisible();
      if (connectingVisible) return 'connecting';
      
      const errorVisible = await page.getByText('(error)').isVisible();
      if (errorVisible) return 'error';
      
      return 'unknown';
    } catch (error) {
      console.error('❌ Failed to get SSE connection status:', error.message);
      return 'unknown';
    }
  }
  
  /**
   * 接続状態の変更待機
   * @param {Page} page - Playwrightページオブジェクト
   * @param {string} expectedStatus - 期待される状態
   * @param {number} timeout - タイムアウト（ms）
   * @returns {Promise<void>}
   */
  static async waitForConnectionStatusChange(page, expectedStatus, timeout = 10000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const currentStatus = await this.getSSEConnectionStatus(page);
      
      if (currentStatus === expectedStatus) {
        console.log(`✅ SSE connection status changed to: ${expectedStatus}`);
        return;
      }
      
      await page.waitForTimeout(200);
    }
    
    throw new Error(`Connection status did not change to ${expectedStatus} within ${timeout}ms`);
  }
  
  /**
   * Admin画面でのSSE接続状態確認
   * @param {Page} page - Playwrightページオブジェクト
   * @returns {Promise<Object>} 接続状態オブジェクト
   */
  static async getAdminSSEStatus(page) {
    try {
      const filesConnected = await page.getByText('Files: Connected').isVisible();
      const jobsConnected = await page.getByText('Jobs: Connected').isVisible();
      
      return {
        filesChannel: filesConnected ? 'connected' : 'disconnected',
        jobsChannel: jobsConnected ? 'connected' : 'disconnected',
        allConnected: filesConnected && jobsConnected
      };
    } catch (error) {
      console.error('❌ Failed to get admin SSE status:', error.message);
      return {
        filesChannel: 'unknown',
        jobsChannel: 'unknown',
        allConnected: false
      };
    }
  }
}
```

## 🌐 NetworkHelpers - ネットワーク操作関数

### **ネットワーク障害シミュレート**

```javascript
// tests/utils/network-helpers.js
export class NetworkHelpers {
  /**
   * ネットワーク障害をシミュレート
   * @param {Page} page - Playwrightページオブジェクト
   * @param {string} pattern - ブロックするURLパターン
   * @returns {Promise<void>}
   */
  static async simulateNetworkFailure(page, pattern = '**/api/events*') {
    await page.route(pattern, route => route.abort());
    console.log(`🚫 Network failure simulated for pattern: ${pattern}`);
  }
  
  /**
   * サーバーエラーをシミュレート
   * @param {Page} page - Playwrightページオブジェクト
   * @param {number} statusCode - HTTPステータスコード
   * @param {string} pattern - 対象URLパターン
   * @returns {Promise<void>}
   */
  static async simulateServerError(page, statusCode = 500, pattern = '**/api/events*') {
    await page.route(pattern, route => route.fulfill({
      status: statusCode,
      body: JSON.stringify({ error: `Server Error ${statusCode}` }),
      headers: { 'Content-Type': 'application/json' }
    }));
    console.log(`❌ Server error simulated (${statusCode}) for pattern: ${pattern}`);
  }
  
  /**
   * ネットワーク遅延をシミュレート
   * @param {Page} page - Playwrightページオブジェクト
   * @param {number} delayMs - 遅延時間（ms）
   * @param {string} pattern - 対象URLパターン
   * @returns {Promise<void>}
   */
  static async simulateSlowNetwork(page, delayMs = 2000, pattern = '**/api/events*') {
    await page.route(pattern, async route => {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      route.continue();
    });
    console.log(`🐌 Slow network simulated (${delayMs}ms delay) for pattern: ${pattern}`);
  }
  
  /**
   * ネットワーク設定をリセット
   * @param {Page} page - Playwrightページオブジェクト
   * @param {string} pattern - リセット対象のURLパターン
   * @returns {Promise<void>}
   */
  static async restoreNetwork(page, pattern = '**/api/events*') {
    await page.unroute(pattern);
    console.log(`✅ Network restored for pattern: ${pattern}`);
  }
}
```

### **ネットワーク監視**

```javascript
export class NetworkHelpers {
  /**
   * SSEリクエストの監視
   * @param {Page} page - Playwrightページオブジェクト
   * @returns {Promise<Array>} SSEリクエストのログ
   */
  static async monitorSSERequests(page) {
    const sseRequests = [];
    
    page.on('request', request => {
      if (request.url().includes('/api/events')) {
        sseRequests.push({
          url: request.url(),
          method: request.method(),
          timestamp: new Date().toISOString(),
          type: 'request'
        });
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/events')) {
        sseRequests.push({
          url: response.url(),
          status: response.status(),
          timestamp: new Date().toISOString(),
          type: 'response'
        });
      }
    });
    
    return sseRequests;
  }
  
  /**
   * ネットワーク統計の取得
   * @param {Array} requests - リクエストログ
   * @returns {Object} ネットワーク統計
   */
  static getNetworkStats(requests) {
    const responses = requests.filter(r => r.type === 'response');
    const successful = responses.filter(r => r.status === 200);
    const failed = responses.filter(r => r.status !== 200);
    
    return {
      totalRequests: requests.filter(r => r.type === 'request').length,
      totalResponses: responses.length,
      successfulResponses: successful.length,
      failedResponses: failed.length,
      successRate: responses.length > 0 ? (successful.length / responses.length) * 100 : 0
    };
  }
}
```

## 📈 PerformanceHelpers - パフォーマンス測定関数

### **時間測定**

```javascript
// tests/utils/performance-helpers.js
export class PerformanceHelpers {
  /**
   * SSE接続時間の測定
   * @param {Page} page - Playwrightページオブジェクト
   * @returns {Promise<number>} 接続時間（ms）
   */
  static async measureSSEConnectionTime(page) {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForSelector('text=Real-time updates active', { timeout: 10000 });
    await page.waitForSelector('text=(connected)', { timeout: 5000 });
    
    const connectionTime = Date.now() - startTime;
    console.log(`⏱️ SSE connection time: ${connectionTime}ms`);
    
    return connectionTime;
  }
  
  /**
   * イベント処理遅延の測定
   * @param {Page} page - Playwrightページオブジェクト
   * @param {string} eventType - イベント種別
   * @returns {Promise<number>} 処理遅延（ms）
   */
  static async measureEventLatency(page, eventType = 'license_update') {
    await page.goto('/test/sse');
    
    const startTime = Date.now();
    
    switch (eventType) {
      case 'license_update':
        await page.getByRole('button', { name: 'Send License Update' }).click();
        break;
      case 'job_status_update':
        await page.getByRole('button', { name: 'Send Job Status Update' }).click();
        break;
      default:
        throw new Error(`Unknown event type: ${eventType}`);
    }
    
    await page.waitForSelector('text=✅', { timeout: 5000 });
    
    const latency = Date.now() - startTime;
    console.log(`⏱️ Event latency (${eventType}): ${latency}ms`);
    
    return latency;
  }
  
  /**
   * 連続イベント処理性能の測定
   * @param {Page} page - Playwrightページオブジェクト
   * @param {number} eventCount - イベント数
   * @returns {Promise<Object>} パフォーマンス統計
   */
  static async measureBurstPerformance(page, eventCount = 5) {
    await page.goto('/test/sse');
    
    const startTime = Date.now();
    const eventTimes = [];
    
    for (let i = 0; i < eventCount; i++) {
      const eventStartTime = Date.now();
      
      await page.getByRole('button', { name: 'Send License Update' }).click();
      await page.waitForSelector('text=✅', { timeout: 5000 });
      
      const eventTime = Date.now() - eventStartTime;
      eventTimes.push(eventTime);
      
      await page.waitForTimeout(100); // 短い間隔
    }
    
    const totalTime = Date.now() - startTime;
    const avgTime = eventTimes.reduce((sum, time) => sum + time, 0) / eventCount;
    
    const stats = {
      eventCount,
      totalTime,
      averageTime: avgTime,
      minTime: Math.min(...eventTimes),
      maxTime: Math.max(...eventTimes),
      throughput: (eventCount / totalTime) * 1000 // events per second
    };
    
    console.log(`⏱️ Burst performance:`, stats);
    return stats;
  }
}
```

## 🔍 DebugHelpers - デバッグ支援関数

### **情報収集**

```javascript
// tests/utils/debug-helpers.js
export class DebugHelpers {
  /**
   * SSEデバッグ情報の収集
   * @param {Page} page - Playwrightページオブジェクト
   * @returns {Promise<Object>} デバッグ情報
   */
  static async collectSSEDebugInfo(page) {
    const info = {
      timestamp: new Date().toISOString(),
      url: page.url(),
      connectionStatus: await StateHelpers.getSSEConnectionStatus(page),
      licenseState: await StateHelpers.getCurrentLicenseState(page),
      hasLicenseWarning: await StateHelpers.hasLicenseWarning(page),
      userAgent: await page.evaluate(() => navigator.userAgent),
      windowSize: await page.evaluate(() => ({
        width: window.innerWidth,
        height: window.innerHeight
      }))
    };
    
    console.log('🔍 SSE Debug Info:', JSON.stringify(info, null, 2));
    return info;
  }
  
  /**
   * エラー発生時のスナップショット取得
   * @param {Page} page - Playwrightページオブジェクト
   * @param {string} testName - テスト名
   * @returns {Promise<string>} スクリーンショットファイルパス
   */
  static async captureErrorSnapshot(page, testName) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `error-${testName}-${timestamp}.png`;
    const screenshotPath = `./tests/screenshots/${filename}`;
    
    await page.screenshot({ 
      path: screenshotPath,
      fullPage: true 
    });
    
    // コンソールログも保存
    const logs = await page.evaluate(() => {
      const logs = [];
      const originalLog = console.log;
      console.log = (...args) => {
        logs.push(args.join(' '));
        originalLog(...args);
      };
      return logs;
    });
    
    const logPath = `./tests/logs/${testName}-${timestamp}.log`;
    await fs.writeFile(logPath, logs.join('\n'));
    
    console.log(`📸 Error snapshot saved: ${screenshotPath}`);
    console.log(`📝 Console logs saved: ${logPath}`);
    
    return screenshotPath;
  }
  
  /**
   * パフォーマンスメトリクスの収集
   * @param {Page} page - Playwrightページオブジェクト
   * @returns {Promise<Object>} パフォーマンスメトリクス
   */
  static async collectPerformanceMetrics(page) {
    const metrics = await page.evaluate(() => {
      const perf = window.performance;
      const navigation = perf.getEntriesByType('navigation')[0];
      
      return {
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        firstPaint: perf.getEntriesByType('paint').find(p => p.name === 'first-paint')?.startTime,
        firstContentfulPaint: perf.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint')?.startTime,
        memoryUsage: (window.performance as any).memory ? {
          usedJSHeapSize: (window.performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (window.performance as any).memory.totalJSHeapSize
        } : null
      };
    });
    
    console.log('📊 Performance metrics:', metrics);
    return metrics;
  }
}
```

## 🎯 使用例

### **基本的な使用パターン**

```javascript
// tests/sse-focused/example-usage.spec.js
import { test, expect } from '@playwright/test';
import { SSEHelpers } from '../utils/sse-helpers.js';
import { StateHelpers } from '../utils/state-helpers.js';
import { NetworkHelpers } from '../utils/network-helpers.js';
import { PerformanceHelpers } from '../utils/performance-helpers.js';

test.describe('SSE Helper Usage Examples', () => {
  test('Complete SSE workflow with helpers', async ({ page }) => {
    // 1. SSE接続確立
    await page.goto('/');
    await SSEHelpers.waitForSSEConnection(page);
    
    // 2. 初期状態確認
    const initialState = await StateHelpers.getCurrentLicenseState(page);
    expect(initialState.used).toBe(5);
    expect(initialState.total).toBe(12);
    
    // 3. イベント送信
    await SSEHelpers.sendLicenseUpdate(page);
    
    // 4. 状態変更確認
    await page.goto('/');
    const updatedState = await StateHelpers.getCurrentLicenseState(page);
    expect(updatedState.used).toBe(11);
    
    // 5. パフォーマンス測定
    const latency = await PerformanceHelpers.measureEventLatency(page);
    expect(latency).toBeLessThan(3000);
  });
  
  test('Network failure recovery with helpers', async ({ page }) => {
    // 1. 正常接続確立
    await page.goto('/');
    await SSEHelpers.waitForSSEConnection(page);
    
    // 2. ネットワーク障害シミュレート
    await NetworkHelpers.simulateNetworkFailure(page);
    
    // 3. エラー状態確認
    await StateHelpers.waitForConnectionStatusChange(page, 'error');
    
    // 4. ネットワーク復旧
    await NetworkHelpers.restoreNetwork(page);
    
    // 5. 自動回復確認
    await StateHelpers.waitForConnectionStatusChange(page, 'connected');
  });
});
```

## 📋 ベストプラクティス

### **1. エラーハンドリング**
```javascript
// エラー発生時のデバッグ情報収集
try {
  await SSEHelpers.waitForSSEConnection(page);
} catch (error) {
  await DebugHelpers.captureErrorSnapshot(page, 'connection-failed');
  await DebugHelpers.collectSSEDebugInfo(page);
  throw error;
}
```

### **2. パフォーマンス意識**
```javascript
// 不要な待機時間を避ける
if (await SSEHelpers.isSSEConnected(page)) {
  // すでに接続済みの場合はスキップ
  console.log('SSE already connected, skipping wait');
} else {
  await SSEHelpers.waitForSSEConnection(page);
}
```

### **3. 再利用性の向上**
```javascript
// 複数のテストで共通する処理をヘルパーに集約
export class TestWorkflows {
  static async setupSSETest(page) {
    await page.goto('/');
    await SSEHelpers.waitForSSEConnection(page);
    return await StateHelpers.getCurrentLicenseState(page);
  }
}
```

---

これらのヘルパー関数により、効率的で保守性の高いSSE特化テストコードを作成できます。