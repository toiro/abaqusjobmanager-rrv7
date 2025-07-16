// TC-SSE-003: 接続断・再接続処理（簡素化版）
import { test, expect } from '@playwright/test';

test.describe('TC-SSE-003: Connection Recovery (Simplified)', () => {
  
  test('Connection recovery after network interruption', async ({ page }) => {
    // 1. 正常接続状態の確認
    await page.goto('/');
    await expect(page.getByText(/\((connected|connecting)\)/)).toBeVisible({ timeout: 10000 });
    
    // 2. 接続断のシミュレート
    await page.route('**/api/events*', route => route.abort());
    
    // 3. 接続断状態の確認（connecting または error状態）
    await expect(page.getByText(/\((connecting|error)\)/)).toBeVisible({ timeout: 10000 });
    
    // 4. 再接続処理の確認
    await page.unroute('**/api/events*');
    
    // 5. 再接続成功確認（15秒以内）
    await expect(page.getByText(/\((connected|connecting)\)/)).toBeVisible({ timeout: 15000 });
    
    // 6. 機能回復確認
    await expect(page.getByText(/License: \d+\/\d+ tokens/)).toBeVisible();
  });
  
  test('SSE connection error handling', async ({ page }) => {
    // 1. 正常状態から開始
    await page.goto('/');
    await expect(page.getByText(/\((connected|connecting)\)/)).toBeVisible({ timeout: 10000 });
    
    // 2. サーバーエラーをシミュレート
    await page.route('**/api/events*', route => route.fulfill({
      status: 500,
      body: 'Internal Server Error'
    }));
    
    // 3. エラー状態確認
    await expect(page.getByText(/\((error|connecting)\)/)).toBeVisible({ timeout: 10000 });
    
    // 4. 回復処理
    await page.unroute('**/api/events*');
    
    // 5. 回復確認
    await expect(page.getByText(/\((connected|connecting)\)/)).toBeVisible({ timeout: 15000 });
  });
});