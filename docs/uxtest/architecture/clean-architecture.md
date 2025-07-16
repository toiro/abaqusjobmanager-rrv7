# Clean Architecture設計 - SSE特化型UXテスト

## 概要

本プロジェクトでは、Kent Beck の Tidying 原則に従って Clean Architecture を適用し、SSE（Server-Sent Events）テストコードの品質向上を実現しています。

## アーキテクチャ原則

### 1. 責任の分離（Separation of Concerns）

#### Before: 巨大な単一クラス
```javascript
// 問題のあるコード：253行の巨大クラス
class SSEHelpers {
  // 接続管理
  static async waitForSSEConnection(page, timeout = 10000) { ... }
  
  // イベント送信
  static async sendLicenseUpdate(page) { ... }
  
  // Admin操作
  static async authenticateAdmin(page) { ... }
  
  // ネットワーク障害シミュレーション
  static async simulateNetworkFailure(page) { ... }
  
  // 状態管理
  static async getCurrentLicenseState(page) { ... }
  
  // 設定値（ハードコード）
  static DEFAULT_TIMEOUT = 10000;
  static ADMIN_TOKEN = 'fracture';
  // ... 他多数
}
```

#### After: 責任別の専門クラス
```typescript
// 設定管理（単一責任）
export class SSETestConfig {
  static readonly timeouts = {
    connection: 10000,
    reconnection: 20000,
    errorState: 15000
  };
}

// 接続管理（単一責任）
export class SSEConnectionHelpers {
  static async waitForSSEConnection(page: Page, timeout?: number): Promise<void> {
    const timeoutMs = timeout || SSETestConfig.timeouts.connection;
    await expect(page.getByText('Real-time updates active')).toBeVisible({ timeout: timeoutMs });
  }
}

// イベント送信（単一責任）
export class SSEEventHelpers {
  static async sendLicenseUpdate(page: Page): Promise<EventTimings> {
    // 専門的なイベント送信処理
  }
}
```

### 2. 依存関係の逆転（Dependency Inversion）

#### Before: 直接的な依存関係
```javascript
// 硬直化された依存関係
class SSEHelpers {
  static async sendEvent(page) {
    // 具体的な実装に直接依存
    await page.goto('/test/sse');
    await page.getByRole('button', { name: 'Send License Update' }).click();
  }
}
```

#### After: 抽象化された依存関係
```typescript
// Page Object Pattern による抽象化
export class TestPage extends BasePage {
  async sendLicenseUpdate(): Promise<void> {
    await this.navigateToTestPage();
    await this.clickSendLicenseUpdateButton();
    await this.waitForSuccessMessage();
  }
}

// 統一された共通パターン
export class SSETestPatterns {
  static async withErrorRecovery<T>(
    page: Page,
    operation: () => Promise<T>,
    context: TestContext
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      // 統一されたエラー回復処理
      return await this.handleErrorAndRetry(page, operation, error, context);
    }
  }
}
```

### 3. 抽象化レベルの統一

#### Before: 混在した抽象化レベル
```javascript
// 低レベル・高レベル処理の混在
test('SSE test', async ({ page }) => {
  // 高レベル
  await page.goto('/');
  
  // 低レベル（DOM操作の詳細）
  await expect(page.getByText('Real-time updates active')).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('(connected)')).toBeVisible({ timeout: 5000 });
  
  // 中レベル（ビジネスロジック）
  const licenseText = await page.getByText(/License: \d+\/\d+ tokens/).textContent();
  const match = licenseText.match(/License: (\d+)\/(\d+) tokens/);
  
  // 高レベル
  expect(parseInt(match[1])).toBeGreaterThanOrEqual(0);
});
```

#### After: 統一された抽象化レベル
```typescript
// 一貫した高レベル抽象化
test('TC-SSE-001: Basic SSE connection establishment (Clean Architecture)', async ({ page }) => {
  const context: TestContext = { testName: 'TC-SSE-001', stepName: 'connection-establishment' };

  await SSETestPatterns.withErrorRecovery(page, async () => {
    await mainPage.verifyInitialState();
    await mainPage.expectValidLicenseState();
    await mainPage.expectSSEConnected();
  }, context);
});
```

## レイヤー構造

### 1. Configuration Layer（設定レイヤー）
```typescript
// /tests/sse-focused/helpers/sse-test-config.ts
export const SSE_TEST_CONFIG: SSETestConfig = {
  timeouts: { connection: 10000, reconnection: 20000 },
  performance: { maxEventTime: 3000, maxTotalTime: 15000 },
  admin: { token: 'fracture', loginTimeout: 5000 }
};
```

### 2. Domain Layer（ドメインレイヤー）
```typescript
// /tests/sse-focused/helpers/sse-*-helpers.ts
export class SSEConnectionHelpers {
  static async waitForSSEConnection(page: Page): Promise<void> {
    // ドメイン固有のSSE接続ロジック
  }
}
```

### 3. Application Layer（アプリケーションレイヤー）
```typescript
// /tests/sse-focused/helpers/sse-test-patterns.ts
export class SSETestPatterns {
  static async withErrorRecovery<T>(
    page: Page,
    operation: () => Promise<T>,
    context: TestContext
  ): Promise<T> {
    // アプリケーション固有の処理パターン
  }
}
```

### 4. Infrastructure Layer（インフラストラクチャレイヤー）
```typescript
// /tests/sse-focused/pages/base-page.ts
export class BasePage {
  protected page: Page;
  protected config: SSETestConfig;
  
  constructor(page: Page) {
    this.page = page;
    this.config = getTestConfig();
  }
}
```

### 5. Presentation Layer（プレゼンテーションレイヤー）
```typescript
// /tests/sse-focused/pages/main-page.ts
export class MainPage extends BasePage {
  async verifyInitialState(): Promise<void> {
    // 画面固有の検証ロジック
  }
}
```

## 設計パターンの適用

### 1. Factory Pattern（設定生成）
```typescript
export function getTestConfig(): SSETestConfig {
  const environment = process.env.NODE_ENV || 'development';
  const baseConfig = SSE_TEST_CONFIG;
  
  return {
    ...baseConfig,
    timeouts: {
      ...baseConfig.timeouts,
      connection: environment === 'ci' ? 15000 : baseConfig.timeouts.connection
    }
  };
}
```

### 2. Strategy Pattern（エラー処理）
```typescript
export interface ErrorRecoveryStrategy {
  canHandle(error: Error): boolean;
  recover(page: Page, error: Error, context: TestContext): Promise<boolean>;
}

export class NetworkErrorRecoveryStrategy implements ErrorRecoveryStrategy {
  canHandle(error: Error): boolean {
    return error.message.includes('net::') || error.message.includes('timeout');
  }
  
  async recover(page: Page, error: Error, context: TestContext): Promise<boolean> {
    await page.reload();
    return true;
  }
}
```

### 3. Observer Pattern（ログ・監視）
```typescript
export class SSEErrorHandler {
  private static logs: LogEntry[] = [];
  
  static logInfo(message: string, data?: any, context?: TestContext): void {
    const logEntry = this.createLogEntry(LogLevel.INFO, message, data, context);
    this.logs.push(logEntry);
    this.notifyObservers(logEntry);
  }
  
  private static notifyObservers(logEntry: LogEntry): void {
    console.log(this.formatLogEntry(logEntry));
  }
}
```

## 品質向上の効果

### 1. 保守性の向上
- **変更影響範囲の限定**: 責任分離により変更の影響を最小化
- **テストの独立性**: 各クラスが独立してテスト可能
- **設定の一元化**: 環境依存値の統一管理

### 2. 再利用性の向上
- **共通パターンの抽出**: `SSETestPatterns`クラスでパターンを共有
- **Page Object Pattern**: UI操作の再利用可能な抽象化
- **ヘルパー関数**: 機能別の再利用可能なユーティリティ

### 3. 可読性の向上
- **意図の明確化**: 関数名とクラス名からの意図理解
- **抽象化レベルの統一**: 一貫した抽象化によるコード理解の容易化
- **コンテキストの分離**: 関心事の明確な分離

### 4. 拡張性の向上
- **新機能の追加**: 既存構造を破壊しない機能追加
- **異なるブラウザ対応**: Page Object Pattern による抽象化
- **新しいテストパターン**: 既存パターンの拡張

## 実装ベストプラクティス

### 1. 型安全性の確保
```typescript
// 強い型制約による実行時エラーの防止
export interface TestContext {
  testName: string;
  stepName: string;
}

export interface RetryOptions {
  maxRetries: number;
  retryDelay: number;
  shouldRetry?: (error: Error) => boolean;
}
```

### 2. エラーハンドリングの統一
```typescript
// 統一されたエラー処理パターン
export class SSEErrorHandler {
  static async captureError(page: Page, error: Error, context: TestContext): Promise<TestError> {
    const testError = await this.enrichErrorWithContext(page, error, context);
    await this.captureScreenshot(page, context);
    return testError;
  }
}
```

### 3. 設定管理の外部化
```typescript
// 環境別設定の管理
export const SSE_TEST_CONFIG: SSETestConfig = {
  timeouts: {
    connection: parseInt(process.env.SSE_CONNECTION_TIMEOUT || '10000'),
    reconnection: parseInt(process.env.SSE_RECONNECTION_TIMEOUT || '20000')
  }
};
```

## まとめ

Clean Architecture の適用により、以下の成果を達成しました：

1. **コード品質の向上**: 253行の巨大クラスを6つの専門クラスに分割
2. **保守性の向上**: 責任分離による変更影響の最小化
3. **再利用性の向上**: 共通パターンとPage Object Patternの活用
4. **拡張性の向上**: 新機能追加時の既存コードへの影響最小化
5. **可読性の向上**: 抽象化レベルの統一による理解の容易化

この設計により、SSE特化型UXテストは持続可能で高品質なテストコードベースを実現しています。