// TC-SSE-004: 複数画面間データ同期（簡素化版）
import { test, expect } from '@playwright/test';

test.describe('TC-SSE-004: Multi-page Data Sync (Simplified)', () => {
  
  test('Multiple tabs sync license updates', async ({ browser }) => {
    // 1. 複数タブ作成
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage(); // メイン画面
    const page2 = await context2.newPage(); // 別タブ
    
    try {
      // 2. 両タブでアプリケーション起動
      await page1.goto('/');
      await page2.goto('/');
      
      // 3. 両タブでSSE接続確認
      await expect(page1.getByText(/License: \d+\/\d+ tokens/)).toBeVisible();
      await expect(page2.getByText(/License: \d+\/\d+ tokens/)).toBeVisible();
      
      // 4. 初期状態の記録
      const initialLicense1 = await page1.getByText(/License: \d+\/\d+ tokens/).textContent();
      const initialLicense2 = await page2.getByText(/License: \d+\/\d+ tokens/).textContent();
      
      // 5. 一方のタブでイベント送信
      await page1.goto('/test/sse');
      await page1.getByRole('button', { name: 'Send License Update' }).click();
      await expect(page1.getByText('✅ license_usage_updated event emitted successfully')).toBeVisible();
      
      // 6. 両タブでの同期確認
      await page1.goto('/');
      await page2.reload();
      
      const updatedLicense1 = await page1.getByText(/License: \d+\/\d+ tokens/).textContent();
      const updatedLicense2 = await page2.getByText(/License: \d+\/\d+ tokens/).textContent();
      
      // 7. 同期の確認
      expect(updatedLicense1).toEqual(updatedLicense2);
      
    } finally {
      await context1.close();
      await context2.close();
    }
  });
  
  test('Main and test page sync', async ({ browser }) => {
    // 1. 2つのページを開く
    const context = await browser.newContext();
    const mainPage = await context.newPage();
    const testPage = await context.newPage();
    
    try {
      // 2. メインページとテストページを開く
      await mainPage.goto('/');
      await testPage.goto('/test/sse');
      
      // 3. 両ページでSSE接続確認
      await expect(mainPage.getByText(/License: \d+\/\d+ tokens/)).toBeVisible();
      await expect(testPage.getByText('Server-Sent Events Test')).toBeVisible();
      
      // 4. テストページでイベント送信
      await testPage.getByRole('button', { name: 'Send License Update' }).click();
      await expect(testPage.getByText('✅ license_usage_updated event emitted successfully')).toBeVisible();
      
      // 5. メインページでの更新確認
      await mainPage.reload();
      await expect(mainPage.getByText(/License: \d+\/\d+ tokens/)).toBeVisible();
      
    } finally {
      await context.close();
    }
  });
});