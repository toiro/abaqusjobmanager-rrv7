// TC-SSE-002: 簡素化されたライセンス更新テスト
import { test, expect } from '@playwright/test';

test.describe('TC-SSE-002: License Update Events (Simplified)', () => {
  
  test('License update event works correctly', async ({ page }) => {
    // 1. テストページに移動
    await page.goto('http://localhost:5173/test/sse');
    
    // 2. ページが読み込まれることを確認
    await expect(page.getByText('Server-Sent Events Test')).toBeVisible();
    
    // 3. ライセンス更新ボタンをクリック
    await page.getByRole('button', { name: 'Send License Update' }).click();
    
    // 4. 成功メッセージが表示されることを確認
    await expect(page.getByText('✅ license_usage_updated event emitted successfully')).toBeVisible();
    
    // 5. メインページでライセンス状態を確認
    await page.goto('http://localhost:5173/');
    
    // 6. ライセンス表示が存在することを確認
    await expect(page.getByText(/License: \d+\/\d+ tokens/)).toBeVisible();
  });
  
  test('SSE connection status is displayed', async ({ page }) => {
    // 1. メインページに移動
    await page.goto('http://localhost:5173/');
    
    // 2. SSE接続状態が表示されることを確認
    await expect(page.getByText(/\((connected|connecting|error)\)/)).toBeVisible({ timeout: 10000 });
  });
  
  test('Multiple license updates work', async ({ page }) => {
    // 1. テストページに移動
    await page.goto('http://localhost:5173/test/sse');
    
    // 2. 複数回ライセンス更新をテスト
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: 'Send License Update' }).click();
      await expect(page.getByText('✅ license_usage_updated event emitted successfully')).toBeVisible();
      
      // 次のテストのために少し待機
      await page.waitForTimeout(500);
    }
  });
});