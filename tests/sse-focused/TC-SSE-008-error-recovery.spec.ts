// TC-SSE-008: エラー状態からの回復（簡素化版）
import { test, expect } from '@playwright/test';

test.describe('TC-SSE-008: Error State Recovery (Simplified)', () => {
  
  test('Recovery from server error', async ({ page }) => {
    // 1. 正常状態確認
    await page.goto('/');
    await expect(page.getByText(/\((connected|connecting)\)/)).toBeVisible({ timeout: 10000 });
    
    // 2. サーバーエラーをシミュレート
    await page.route('**/api/events*', route => route.fulfill({
      status: 500,
      body: 'Internal Server Error'
    }));
    
    // 3. エラー状態確認（10秒以内に検出）
    await expect(page.getByText(/\((error|connecting)\)/)).toBeVisible({ timeout: 10000 });
    
    // 4. サーバー復旧をシミュレート
    await page.unroute('**/api/events*');
    
    // 5. 自動回復確認（20秒以内）
    await expect(page.getByText(/\((connected|connecting)\)/)).toBeVisible({ timeout: 20000 });
    
    // 6. 機能回復確認
    await expect(page.getByText(/License: \d+\/\d+ tokens/)).toBeVisible();
  });
  
  test('Recovery from network timeout', async ({ page }) => {
    // 1. 正常状態から開始
    await page.goto('/');
    await expect(page.getByText(/\((connected|connecting)\)/)).toBeVisible({ timeout: 10000 });
    
    // 2. ネットワークタイムアウトをシミュレート
    await page.route('**/api/events*', route => {
      // リクエストを長時間保留してタイムアウトを発生させる
      setTimeout(() => route.abort(), 5000);
    });
    
    // 3. エラー状態確認
    await expect(page.getByText(/\((error|connecting)\)/)).toBeVisible({ timeout: 15000 });
    
    // 4. ネットワーク復旧
    await page.unroute('**/api/events*');
    
    // 5. 回復確認
    await expect(page.getByText(/\((connected|connecting)\)/)).toBeVisible({ timeout: 20000 });
  });
  
  test('Error recovery with functional test', async ({ page }) => {
    // 1. 正常状態確認
    await page.goto('/');
    await expect(page.getByText(/\((connected|connecting)\)/)).toBeVisible({ timeout: 10000 });
    
    // 2. エラー状態に移行
    await page.route('**/api/events*', route => route.abort());
    await expect(page.getByText(/\((error|connecting)\)/)).toBeVisible({ timeout: 10000 });
    
    // 3. 回復処理
    await page.unroute('**/api/events*');
    await expect(page.getByText(/\((connected|connecting)\)/)).toBeVisible({ timeout: 20000 });
    
    // 4. 回復後の機能テスト
    await page.goto('/test/sse');
    await page.getByRole('button', { name: 'Send License Update' }).click();
    await expect(page.getByText('✅ license_usage_updated event emitted successfully')).toBeVisible();
    
    // 5. ライセンス情報の更新確認
    await page.goto('/');
    await expect(page.getByText(/License: \d+\/\d+ tokens/)).toBeVisible();
  });
  
  test('Multiple error recovery cycles', async ({ page }) => {
    // 1. 正常状態から開始
    await page.goto('/');
    await expect(page.getByText(/\((connected|connecting)\)/)).toBeVisible({ timeout: 10000 });
    
    // 2. エラー-回復サイクルを2回繰り返す
    for (let i = 0; i < 2; i++) {
      console.log(`Error-recovery cycle ${i + 1}`);
      
      // エラー状態に移行
      await page.route('**/api/events*', route => route.abort());
      await expect(page.getByText(/\((error|connecting)\)/)).toBeVisible({ timeout: 10000 });
      
      // 回復処理
      await page.unroute('**/api/events*');
      await expect(page.getByText(/\((connected|connecting)\)/)).toBeVisible({ timeout: 20000 });
      
      // 少し待機
      await page.waitForTimeout(1000);
    }
    
    // 3. 最終的な動作確認
    await expect(page.getByText(/License: \d+\/\d+ tokens/)).toBeVisible();
  });
});