// TC-SSE-002: 簡素化されたライセンス更新テスト
import { test, expect } from '@playwright/test';

test.describe('TC-SSE-002: License Update Events (Simplified)', () => {
  
  test('License update event works correctly', async ({ page }) => {
    // 1. テストページに移動
    await page.goto('http://localhost:5173/test/sse');
    
    // 2. ページ基本読み込み完了を待機
    await page.waitForLoadState('load');
    
    // 3. ライセンス更新ボタンが表示されるまで待機
    await expect(page.getByRole('button', { name: 'Send License Update' })).toBeVisible({ timeout: 15000 });
    
    // 3. ライセンス更新ボタンをクリック
    await page.getByRole('button', { name: 'Send License Update' }).click();
    
    // 4. 成功メッセージが表示されることを確認（部分一致で絵文字問題を回避）
    await expect(page.getByText(/license_usage_updated event emitted successfully/)).toBeVisible({ timeout: 10000 });
    
    // 5. メインページでライセンス状態を確認
    await page.goto('http://localhost:5173/');
    
    // 6. ライセンス表示が存在することを確認
    await expect(page.getByText(/License: \d+\/\d+ tokens/)).toBeVisible();
  });
  
  test('SSE connection status is displayed', async ({ page }) => {
    // 1. メインページに移動
    await page.goto('http://localhost:5173/');
    
    // 2. ページ基本読み込み完了を待機
    await page.waitForLoadState('load');
    
    // 3. SSE接続状態が表示されることを確認（より確実なパターン）
    await expect(page.getByText(/\((connected|connecting|error|disconnected)\)/)).toBeVisible({ timeout: 15000 });
  });
  
  test('Multiple license updates work', async ({ page }) => {
    // 1. テストページに移動
    await page.goto('http://localhost:5173/test/sse');
    
    // 2. ページ基本読み込み完了を待機
    await page.waitForLoadState('load');
    await expect(page.getByRole('button', { name: 'Send License Update' })).toBeVisible({ timeout: 15000 });
    
    // 3. 複数回ライセンス更新をテスト
    for (let i = 0; i < 3; i++) {
      // ボタンが利用可能になるまで待機
      await expect(page.getByRole('button', { name: 'Send License Update' })).toBeEnabled({ timeout: 5000 });
      await page.getByRole('button', { name: 'Send License Update' }).click();
      await expect(page.getByText(/license_usage_updated event emitted successfully/)).toBeVisible({ timeout: 10000 });
      
      // 次のテストのために少し待機
      await page.waitForTimeout(500);
    }
  });
});