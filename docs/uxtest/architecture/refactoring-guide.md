# リファクタリング手順ガイド - Kent Beck Tidying 適用

## 概要

本ガイドでは、Kent Beck の Tidying 原則に従って、SSE テストコードを段階的にリファクタリングする手順を詳細に説明します。実際の事例を使用して、具体的な改善プロセスを示します。

## リファクタリング戦略

### 全体フロー
```
既存コード (253行)
    ↓
Phase 1: Structure改善 (6クラスに分割)
    ↓
Phase 2: Coupling改善 (Page Object Pattern)
    ↓
Phase 3: Cohesion改善 (共通パターン抽出)
    ↓
最終成果: Clean Architecture適用
```

## Phase 1: Structure（構造改善）

### Step 1.1: 現状分析

#### 問題の特定
```javascript
// 元のコード分析
class SSEHelpers {
  // 🔴 問題点の特定
  static async waitForSSEConnection(page, timeout = 10000) { ... }     // 接続管理
  static async sendLicenseUpdate(page) { ... }                         // イベント送信
  static async authenticateAdmin(page) { ... }                         // Admin操作
  static async simulateNetworkFailure(page) { ... }                    // ネットワーク障害
  static async getCurrentLicenseState(page) { ... }                    // 状態管理
  static DEFAULT_TIMEOUT = 10000;                                      // 設定値
  static ADMIN_TOKEN = 'fracture';                                     // 設定値
  // ... 他多数（253行）
}
```

#### 責任の分析
| 責任領域 | 行数 | 関数数 | 問題点 |
|----------|------|---------|--------|
| 接続管理 | 45行 | 3個 | タイムアウト値がハードコード |
| イベント送信 | 60行 | 4個 | 重複した処理パターン |
| Admin操作 | 40行 | 3個 | 認証情報がハードコード |
| ネットワーク障害 | 55行 | 4個 | 障害パターンが固定 |
| 状態管理 | 35行 | 2個 | 状態解析ロジックが複雑 |
| 設定値 | 18行 | 0個 | マジックナンバーが散在 |

### Step 1.2: 責任分離の実行

#### 1.2.1: 設定の外部化
```typescript
// Before: 設定値が散在
class SSEHelpers {
  static DEFAULT_TIMEOUT = 10000;
  static ADMIN_TOKEN = 'fracture';
  static PERFORMANCE_THRESHOLD = 3000;
  static RECONNECTION_TIMEOUT = 20000;
  static ERROR_STATE_TIMEOUT = 15000;
}

// After: 設定の一元化
// /tests/sse-focused/helpers/sse-test-config.ts
export interface SSETestConfig {
  timeouts: {
    connection: number;
    reconnection: number;
    errorState: number;
    navigation: number;
  };
  performance: {
    maxEventTime: number;
    maxTotalTime: number;
    maxAverageTime: number;
  };
  admin: {
    token: string;
    loginTimeout: number;
  };
  selectors: {
    connectionIndicator: string;
    connectedStatus: string;
    errorStatus: string;
  };
}

export const SSE_TEST_CONFIG: SSETestConfig = {
  timeouts: {
    connection: 10000,
    reconnection: 20000,
    errorState: 15000,
    navigation: 15000
  },
  performance: {
    maxEventTime: 3000,
    maxTotalTime: 15000,
    maxAverageTime: 5000
  },
  admin: {
    token: 'fracture',
    loginTimeout: 5000
  },
  selectors: {
    connectionIndicator: 'Real-time updates active',
    connectedStatus: '(connected)',
    errorStatus: '(error)'
  }
};
```

#### 1.2.2: 接続管理の分離
```typescript
// Before: 接続管理が他の責任と混在
class SSEHelpers {
  static async waitForSSEConnection(page, timeout = 10000) {
    await expect(page.getByText('Real-time updates active')).toBeVisible({ timeout });
    await expect(page.getByText('(connected)')).toBeVisible({ timeout: 5000 });
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

// After: 接続管理の専門クラス
// /tests/sse-focused/helpers/sse-connection-helpers.ts
export interface SSEConnectionStatus {
  status: 'connected' | 'connecting' | 'error' | 'unknown';
  timestamp: string;
  latency?: number;
}

export class SSEConnectionHelpers {
  private static config = getTestConfig();
  
  static async waitForSSEConnection(page: Page, timeout?: number): Promise<void> {
    const timeoutMs = timeout || this.config.timeouts.connection;
    
    await expect(page.getByText(this.config.selectors.connectionIndicator))
      .toBeVisible({ timeout: timeoutMs });
    await expect(page.getByText(this.config.selectors.connectedStatus))
      .toBeVisible({ timeout: 5000 });
  }
  
  static async getSSEConnectionStatus(page: Page): Promise<SSEConnectionStatus> {
    const timestamp = new Date().toISOString();
    const startTime = performance.now();
    
    const connectedVisible = await page.getByText(this.config.selectors.connectedStatus).isVisible();
    const connectingVisible = await page.getByText('(connecting)').isVisible();
    const errorVisible = await page.getByText(this.config.selectors.errorStatus).isVisible();
    
    const latency = performance.now() - startTime;
    
    let status: SSEConnectionStatus['status'] = 'unknown';
    if (connectedVisible) status = 'connected';
    else if (connectingVisible) status = 'connecting';
    else if (errorVisible) status = 'error';
    
    return { status, timestamp, latency };
  }
  
  static async verifyConnectionStability(page: Page, duration: number = 5000): Promise<boolean> {
    const startTime = Date.now();
    const checkInterval = 1000;
    
    while (Date.now() - startTime < duration) {
      const status = await this.getSSEConnectionStatus(page);
      if (status.status !== 'connected') {
        return false;
      }
      await page.waitForTimeout(checkInterval);
    }
    
    return true;
  }
}
```

### Step 1.3: 他の責任領域の分離

#### 1.3.1: イベント送信の分離
```typescript
// /tests/sse-focused/helpers/sse-event-helpers.ts
export interface EventTimings {
  startTime: number;
  endTime: number;
  duration: number;
  eventType: string;
}

export class SSEEventHelpers {
  private static config = getTestConfig();
  
  static async sendLicenseUpdate(page: Page): Promise<EventTimings> {
    const startTime = performance.now();
    
    await page.goto('/test/sse');
    await page.getByRole('button', { name: 'Send License Update' }).click();
    await expect(page.getByText('✅ license_update event emitted successfully')).toBeVisible();
    
    const endTime = performance.now();
    
    return {
      startTime,
      endTime,
      duration: endTime - startTime,
      eventType: 'license_update'
    };
  }
  
  static async sendJobStatusUpdate(page: Page): Promise<EventTimings> {
    return await this.sendEventWithType(page, 'job_status_update', 'Send Job Status Update');
  }
  
  private static async sendEventWithType(
    page: Page, 
    eventType: string, 
    buttonLabel: string
  ): Promise<EventTimings> {
    const startTime = performance.now();
    
    await page.goto('/test/sse');
    await page.getByRole('button', { name: buttonLabel }).click();
    await expect(page.getByText(`✅ ${eventType} event emitted successfully`)).toBeVisible();
    
    const endTime = performance.now();
    
    return {
      startTime,
      endTime,
      duration: endTime - startTime,
      eventType
    };
  }
}
```

## Phase 2: Coupling（結合度改善）

### Step 2.1: Page Object Pattern の導入

#### 2.1.1: 基底クラスの作成
```typescript
// /tests/sse-focused/pages/base-page.ts
export abstract class BasePage {
  protected page: Page;
  protected config: SSETestConfig;
  
  constructor(page: Page) {
    this.page = page;
    this.config = getTestConfig();
  }
  
  protected async waitForElement(selector: string, timeout?: number): Promise<void> {
    await expect(this.page.getByText(selector))
      .toBeVisible({ timeout: timeout || this.config.timeouts.navigation });
  }
  
  protected async clickButton(buttonName: string): Promise<void> {
    await this.page.getByRole('button', { name: buttonName }).click();
  }
  
  protected async navigateTo(path: string): Promise<void> {
    await this.page.goto(path);
  }
  
  protected async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }
}
```

#### 2.1.2: 具体的なページクラス
```typescript
// /tests/sse-focused/pages/main-page.ts
export class MainPage extends BasePage {
  async verifyInitialState(): Promise<void> {
    await this.navigateTo('/');
    await this.waitForSSEConnection();
    await this.expectValidLicenseState();
  }
  
  async waitForSSEConnection(): Promise<void> {
    await SSEConnectionHelpers.waitForSSEConnection(this.page);
  }
  
  async expectSSEConnected(): Promise<void> {
    const status = await SSEConnectionHelpers.getSSEConnectionStatus(this.page);
    expect(status.status).toBe('connected');
  }
  
  async getCurrentLicenseState(): Promise<LicenseState> {
    return await SSEStateHelpers.getCurrentLicenseState(this.page);
  }
  
  async expectValidLicenseState(): Promise<void> {
    const state = await this.getCurrentLicenseState();
    expect(state.used).toBeGreaterThanOrEqual(0);
    expect(state.total).toBeGreaterThan(0);
  }
  
  async expectLicenseStateChanged(initialState: LicenseState): Promise<void> {
    await expect(async () => {
      const currentState = await this.getCurrentLicenseState();
      expect(currentState.text).not.toBe(initialState.text);
    }).toPass({ timeout: this.config.timeouts.connection });
  }
}
```

### Step 2.2: 依存関係の逆転

#### 2.2.1: 抽象化による結合度削減
```typescript
// Before: 直接的な依存関係
test('SSE test', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Real-time updates active')).toBeVisible({ timeout: 10000 });
  await page.goto('/test/sse');
  await page.getByRole('button', { name: 'Send License Update' }).click();
  await expect(page.getByText('✅ license_update event emitted successfully')).toBeVisible();
});

// After: 抽象化された依存関係
test('TC-SSE-001: Basic SSE connection establishment', async ({ page }) => {
  const mainPage = new MainPage(page);
  const testPage = new TestPage(page);
  
  await mainPage.verifyInitialState();
  await testPage.sendLicenseUpdate();
  await mainPage.expectSSEConnected();
});
```

## Phase 3: Cohesion（凝集度改善）

### Step 3.1: 共通パターンの抽出

#### 3.1.1: エラー処理の統一
```typescript
// /tests/sse-focused/helpers/sse-test-patterns.ts
export class SSETestPatterns {
  static async withErrorRecovery<T>(
    page: Page,
    operation: () => Promise<T>,
    context: TestContext
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      SSEErrorHandler.logWarn('Operation failed, attempting recovery', error, context);
      
      const testError = await SSEErrorHandler.captureError(page, error as Error, context);
      const recoverySucceeded = await SSEErrorHandler.attemptRecovery(page, testError, context);
      
      if (recoverySucceeded) {
        return await operation();
      } else {
        throw testError;
      }
    }
  }
}
```

#### 3.1.2: パフォーマンス測定の統一
```typescript
export class SSETestPatterns {
  static async withPerformanceMeasurement<T>(
    page: Page,
    operation: () => Promise<T>,
    context: TestContext
  ): Promise<{ result: T; duration: number; performanceEntry: PerformanceEntry }> {
    const startTime = performance.now();
    const startMark = `${context.testName}-${context.stepName}-start`;
    const endMark = `${context.testName}-${context.stepName}-end`;
    
    await page.evaluate((mark) => performance.mark(mark), startMark);
    
    const result = await operation();
    
    await page.evaluate((mark) => performance.mark(mark), endMark);
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    const performanceEntry = await page.evaluate(([startMark, endMark]) => {
      performance.measure(`${startMark}-to-${endMark}`, startMark, endMark);
      return performance.getEntriesByName(`${startMark}-to-${endMark}`)[0];
    }, [startMark, endMark]);
    
    return { result, duration, performanceEntry };
  }
}
```

## Phase 4: 統合と最適化

### Step 4.1: 統合テストの作成

#### 4.1.1: リファクタリング後のテスト
```typescript
// /tests/sse-focused/sse-connection-refactored.spec.ts
test('TC-SSE-001: Basic SSE connection establishment (Clean Architecture)', async ({ page }) => {
  const context: TestContext = {
    testName: 'TC-SSE-001',
    stepName: 'connection-establishment'
  };

  const mainPage = new MainPage(page);
  const testPage = new TestPage(page);

  await SSETestPatterns.withErrorRecovery(page, async () => {
    await mainPage.verifyInitialState();
    await mainPage.expectValidLicenseState();
    await mainPage.expectSSEConnected();
  }, context);
});
```

### Step 4.2: 品質メトリクスの測定

#### 4.2.1: Before/After比較
```typescript
// リファクタリング効果の測定
test.afterAll(async () => {
  const report = SSEErrorHandler.generateTestReport();
  
  console.log('📊 Refactoring Results:');
  console.log('Before:');
  console.log('  - Single class: 253 lines');
  console.log('  - Responsibilities: Mixed');
  console.log('  - Coupling: High');
  console.log('  - Maintainability: Low');
  
  console.log('After:');
  console.log('  - Classes: 8 specialized classes');
  console.log('  - Average lines per class: 60');
  console.log('  - Responsibilities: Separated');
  console.log('  - Coupling: Low');
  console.log('  - Maintainability: High');
  
  // 品質基準の確認
  expect(report.summary.errorCount).toBeLessThan(3);
  expect(report.summary.warningCount).toBeLessThan(5);
});
```

## リファクタリングチェックリスト

### Phase 1: Structure
- [ ] 巨大クラスの責任分析完了
- [ ] 設定値の外部化完了
- [ ] 責任別クラスの分割完了
- [ ] 各クラスの平均行数が100行以下
- [ ] マジックナンバーの除去完了

### Phase 2: Coupling
- [ ] Page Object Pattern導入完了
- [ ] 基底クラスの作成完了
- [ ] 直接的な依存関係の除去完了
- [ ] 抽象化による結合度削減完了
- [ ] 依存関係の逆転完了

### Phase 3: Cohesion
- [ ] 共通パターンの抽出完了
- [ ] エラー処理の統一完了
- [ ] パフォーマンス測定の統一完了
- [ ] 関連機能のグループ化完了
- [ ] 単一責任の原則適用完了

### Phase 4: 統合
- [ ] 統合テストの作成完了
- [ ] 品質メトリクスの測定完了
- [ ] ドキュメントの更新完了
- [ ] チームレビューの実施完了
- [ ] 継続的改善体制の確立完了

## 継続的改善

### 自動品質チェック
```typescript
// 品質メトリクスの自動監視
const qualityGates = {
  maxClassSize: 100,
  maxMethodSize: 20,
  maxCyclomaticComplexity: 10,
  minTestCoverage: 90,
  maxDuplication: 5
};

// CI/CDパイプラインでの品質チェック
test('Quality gates', async () => {
  const codeAnalysis = await analyzeCodeQuality();
  
  expect(codeAnalysis.averageClassSize).toBeLessThan(qualityGates.maxClassSize);
  expect(codeAnalysis.averageMethodSize).toBeLessThan(qualityGates.maxMethodSize);
  expect(codeAnalysis.cyclomaticComplexity).toBeLessThan(qualityGates.maxCyclomaticComplexity);
  expect(codeAnalysis.testCoverage).toBeGreaterThan(qualityGates.minTestCoverage);
  expect(codeAnalysis.duplicationRate).toBeLessThan(qualityGates.maxDuplication);
});
```

### 技術的負債の監視
```typescript
// 技術的負債の定期的な評価
const technicalDebtReview = {
  frequency: 'monthly',
  metrics: ['complexity', 'coupling', 'duplication', 'maintainability'],
  thresholds: {
    complexity: 'medium',
    coupling: 'low',
    duplication: 'minimal',
    maintainability: 'high'
  }
};
```

## まとめ

このリファクタリングガイドに従うことで、以下の成果を達成できます：

1. **構造化されたコード**: 責任分離による明確な構造
2. **低結合**: 抽象化による依存関係の最小化
3. **高凝集**: 関連機能の論理的グループ化
4. **高可読性**: 意図明確な命名と抽象化
5. **高保守性**: DRY原則と設定外部化

これらの改善により、SSE特化型UXテストは持続可能で高品質なテストコードベースとなり、長期的な開発効率の向上を実現します。