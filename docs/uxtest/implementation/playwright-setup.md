# SSE特化型Playwright環境構築ガイド

## 📋 概要

Abaqus Job ManagerのSSE（Server-Sent Events）機能に特化したPlaywright環境の構築手順です。最小限の設定で効率的なSSEテスト環境を構築します。

## 🚀 インストールと基本設定

### **1. Playwrightインストール**

```bash
# Bun環境でのインストール
bun add -D @playwright/test

# ブラウザのインストール
bunx playwright install

# または npm環境
npm install -D @playwright/test
npx playwright install
```

### **2. プロジェクト構造**

```
/app/
├── tests/
│   ├── sse-focused/                 # SSE特化テストファイル
│   │   ├── sse-connection.spec.js
│   │   ├── sse-realtime-updates.spec.js
│   │   ├── sse-error-recovery.spec.js
│   │   └── sse-performance.spec.js
│   ├── fixtures/                    # テストデータ
│   │   ├── license-states.json
│   │   └── sse-events.json
│   ├── utils/                       # テストユーティリティ
│   │   ├── sse-helpers.js
│   │   ├── state-helpers.js
│   │   └── network-helpers.js
│   └── setup/                       # セットアップファイル
│       ├── global-setup.js
│       └── global-teardown.js
├── playwright.config.js             # Playwright設定
└── package.json
```

## ⚙️ Playwright設定

### **playwright.config.js**

```javascript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // テストディレクトリをSSE特化に限定
  testDir: './tests/sse-focused',
  
  // 並列実行（SSEテストは軽量なので並列化可能）
  fullyParallel: true,
  
  // CI環境での設定
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 4,
  
  // レポート設定（シンプルに）
  reporter: [
    ['html', { outputFolder: 'test-results/html-report' }],
    ['json', { outputFile: 'test-results/sse-results.json' }]
  ],
  
  // 共通設定
  use: {
    // ベースURL
    baseURL: 'http://localhost:5173',
    
    // SSEテスト用の設定
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // タイムアウト設定（SSE接続時間を考慮）
    actionTimeout: 10000,
    navigationTimeout: 15000,
    
    // ネットワーク設定
    ignoreHTTPSErrors: true,
  },
  
  // ブラウザ設定（Chrome中心、必要に応じて拡張）
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // SSEテストは基本的にChrome中心で十分
    // 必要に応じて他ブラウザも追加
  ],
  
  // 開発サーバー設定
  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
  
  // グローバルセットアップ
  globalSetup: './tests/setup/global-setup.js',
  globalTeardown: './tests/setup/global-teardown.js',
  
  // テストタイムアウト（SSE接続・再接続時間を考慮）
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
});
```

## 🛠 環境設定

### **1. 環境変数設定**

```bash
# .env.test
NODE_ENV=test
DATABASE_URL=sqlite:./tests/test-database.db
ADMIN_TOKEN=test_admin_token
SSE_ENABLED=true
LOG_LEVEL=debug

# テスト用ディレクトリ
TEST_UPLOAD_DIR=./tests/uploads
TEST_SCREENSHOT_DIR=./tests/screenshots
```

### **2. パッケージ設定**

```json
{
  "scripts": {
    "test:sse": "playwright test tests/sse-focused/",
    "test:sse:ui": "playwright test tests/sse-focused/ --ui",
    "test:sse:headed": "playwright test tests/sse-focused/ --headed",
    "test:sse:debug": "playwright test tests/sse-focused/ --debug",
    "test:sse:report": "playwright show-report test-results/html-report"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0"
  }
}
```

## 🎭 SSE特化テストユーティリティ

### **1. SSE接続ヘルパー**

```javascript
// tests/utils/sse-helpers.js
import { expect } from '@playwright/test';

export class SSEHelpers {
  static async waitForSSEConnection(page, timeout = 10000) {
    await expect(page.getByText('Real-time updates active')).toBeVisible({ timeout });
    await expect(page.getByText('(connected)')).toBeVisible();
  }
  
  static async sendLicenseUpdate(page) {
    await page.goto('/test/sse');
    await page.getByRole('button', { name: 'Send License Update' }).click();
    await expect(page.getByText('✅ license_update event emitted successfully')).toBeVisible();
  }
  
  static async sendJobStatusUpdate(page) {
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
  static async getCurrentLicenseState(page) {
    const licenseText = await page.getByText(/License: \d+\/\d+ tokens/).textContent();
    const match = licenseText.match(/License: (\d+)\/(\d+) tokens/);
    
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
    const connectedVisible = await page.getByText('(connected)').isVisible();
    const connectingVisible = await page.getByText('(connecting)').isVisible();
    const errorVisible = await page.getByText('(error)').isVisible();
    
    if (connectedVisible) return 'connected';
    if (connectingVisible) return 'connecting';
    if (errorVisible) return 'error';
    return 'unknown';
  }
}
```

### **3. ネットワーク操作ヘルパー**

```javascript
// tests/utils/network-helpers.js
export class NetworkHelpers {
  static async simulateNetworkFailure(page) {
    await page.route('**/api/events*', route => route.abort());
  }
  
  static async simulateServerError(page, statusCode = 500) {
    await page.route('**/api/events*', route => route.fulfill({
      status: statusCode,
      body: JSON.stringify({ error: 'Server Error' })
    }));
  }
  
  static async restoreNetwork(page) {
    await page.unroute('**/api/events*');
  }
  
  static async monitorSSERequests(page) {
    const sseRequests = [];
    
    page.on('response', response => {
      if (response.url().includes('/api/events')) {
        sseRequests.push({
          url: response.url(),
          status: response.status(),
          timestamp: new Date().toISOString()
        });
      }
    });
    
    return sseRequests;
  }
}
```

## 🎯 テストベースクラス

### **SSE特化テストベース**

```javascript
// tests/utils/sse-test-base.js
import { test as base, expect } from '@playwright/test';
import { SSEHelpers } from './sse-helpers.js';
import { StateHelpers } from './state-helpers.js';
import { NetworkHelpers } from './network-helpers.js';

export const test = base.extend({
  sseHelpers: async ({ page }, use) => {
    const helpers = new SSEHelpers(page);
    await use(helpers);
  },
  
  stateHelpers: async ({ page }, use) => {
    const helpers = new StateHelpers(page);
    await use(helpers);
  },
  
  networkHelpers: async ({ page }, use) => {
    const helpers = new NetworkHelpers(page);
    await use(helpers);
  },
  
  // SSE接続確立済みのページ
  sseConnectedPage: async ({ page }, use) => {
    await page.goto('/');
    await SSEHelpers.waitForSSEConnection(page);
    await use(page);
  }
});

export { expect };
```

## 🔧 グローバルセットアップ

### **1. グローバルセットアップ**

```javascript
// tests/setup/global-setup.js
import { chromium } from '@playwright/test';
import fs from 'fs';

async function globalSetup() {
  console.log('🔧 Setting up SSE test environment...');
  
  // テスト用ディレクトリ作成
  const testDirs = [
    './tests/screenshots',
    './tests/uploads',
    './tests/logs'
  ];
  
  testDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
  
  // 開発サーバーの起動確認
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:5173', { timeout: 30000 });
    await page.waitForSelector('text=Abaqus Job Manager', { timeout: 10000 });
    console.log('✅ Development server is running');
  } catch (error) {
    console.error('❌ Development server is not accessible:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
  
  console.log('✅ SSE test environment ready');
}

export default globalSetup;
```

### **2. グローバルクリーンアップ**

```javascript
// tests/setup/global-teardown.js
import fs from 'fs';

async function globalTeardown() {
  console.log('🧹 Cleaning up SSE test environment...');
  
  // テスト成果物の整理
  const cleanupDirs = [
    './tests/screenshots',
    './tests/logs'
  ];
  
  cleanupDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      // 古いファイルのみ削除（最新のテスト結果は保持）
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = `${dir}/${file}`;
        const stats = fs.statSync(filePath);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        if (stats.mtime < oneDayAgo) {
          fs.unlinkSync(filePath);
        }
      });
    }
  });
  
  console.log('✅ SSE test environment cleaned');
}

export default globalTeardown;
```

## 🎬 実行例

### **1. 基本的な実行**

```bash
# 全SSEテスト実行
bun run test:sse

# 特定のテストファイル実行
bunx playwright test tests/sse-focused/sse-connection.spec.js

# ヘッドレスモードで実行
bun run test:sse:headed
```

### **2. デバッグモード**

```bash
# デバッグモード（ブラウザ表示）
bun run test:sse:debug

# UIモード（対話的実行）
bun run test:sse:ui
```

### **3. レポート確認**

```bash
# HTMLレポート表示
bun run test:sse:report

# JSONレポート確認
cat test-results/sse-results.json | jq '.suites[0].tests[0].results[0].status'
```

## 📊 CI/CD統合

### **GitHub Actions設定**

```yaml
# .github/workflows/sse-tests.yml
name: SSE Tests
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 */6 * * *'  # 6時間ごと

jobs:
  sse-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      
      - name: Install dependencies
        run: bun install
      
      - name: Install Playwright
        run: bunx playwright install --with-deps chromium
      
      - name: Start development server
        run: |
          bun run dev &
          sleep 10
        
      - name: Run SSE tests
        run: bun run test:sse
        
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: sse-test-results
          path: |
            test-results/
            tests/screenshots/
          retention-days: 7
```

## 🎯 パフォーマンス最適化

### **1. テスト実行最適化**

```javascript
// playwright.config.js での最適化設定
export default defineConfig({
  // SSEテストは軽量なので並列度を上げる
  workers: process.env.CI ? 2 : 4,
  
  // リトライ設定（SSE接続の不安定性を考慮）
  retries: process.env.CI ? 2 : 1,
  
  // 不要な機能を無効化
  use: {
    // 動画録画は失敗時のみ
    video: 'retain-on-failure',
    
    // スクリーンショットは失敗時のみ
    screenshot: 'only-on-failure',
    
    // トレースは初回リトライ時のみ
    trace: 'on-first-retry',
  },
});
```

### **2. ネットワーク最適化**

```javascript
// tests/utils/performance-helpers.js
export class PerformanceHelpers {
  static async measureSSEConnectionTime(page) {
    const startTime = Date.now();
    await page.goto('/');
    
    await page.waitForSelector('text=Real-time updates active', { timeout: 10000 });
    
    const connectionTime = Date.now() - startTime;
    console.log(`SSE connection time: ${connectionTime}ms`);
    
    return connectionTime;
  }
  
  static async measureEventLatency(page) {
    await page.goto('/test/sse');
    
    const startTime = Date.now();
    await page.getByRole('button', { name: 'Send License Update' }).click();
    await page.waitForSelector('text=✅ license_update event emitted successfully');
    
    const latency = Date.now() - startTime;
    console.log(`Event processing latency: ${latency}ms`);
    
    return latency;
  }
}
```

## 🔍 トラブルシューティング

### **よくある問題と解決策**

#### **1. SSE接続タイムアウト**
```javascript
// タイムアウト値を調整
await expect(page.getByText('Real-time updates active')).toBeVisible({ timeout: 15000 });
```

#### **2. ネットワークルート設定の競合**
```javascript
// テスト前にルート設定をクリア
await page.unroute('**/api/events*');
```

#### **3. 並列実行でのSSE接続競合**
```javascript
// playwright.config.js
export default defineConfig({
  // 必要に応じて並列度を下げる
  workers: process.env.CI ? 1 : 2,
});
```

### **デバッグ情報の収集**

```javascript
// tests/utils/debug-helpers.js
export class DebugHelpers {
  static async collectSSEDebugInfo(page) {
    const info = {
      url: page.url(),
      timestamp: new Date().toISOString(),
      connectionStatus: await StateHelpers.getSSEConnectionStatus(page),
      licenseState: await StateHelpers.getCurrentLicenseState(page),
      hasWarning: await StateHelpers.hasLicenseWarning(page)
    };
    
    console.log('SSE Debug Info:', JSON.stringify(info, null, 2));
    return info;
  }
}
```

## 📈 メンテナンス・運用

### **定期メンテナンス**

```bash
# 週次メンテナンス
bun run test:sse                    # 全テスト実行
bunx playwright test --reporter=list # 詳細レポート
```

### **テスト結果の分析**

```javascript
// scripts/analyze-test-results.js
import fs from 'fs';

const results = JSON.parse(fs.readFileSync('test-results/sse-results.json', 'utf8'));

const stats = {
  total: results.suites[0].tests.length,
  passed: results.suites[0].tests.filter(t => t.results[0].status === 'passed').length,
  failed: results.suites[0].tests.filter(t => t.results[0].status === 'failed').length,
  avgDuration: results.suites[0].tests.reduce((sum, t) => sum + t.results[0].duration, 0) / results.suites[0].tests.length
};

console.log('SSE Test Statistics:', stats);
```

---

このSSE特化Playwright環境により、効率的でメンテナンスしやすいリアルタイム機能テストを実現できます。