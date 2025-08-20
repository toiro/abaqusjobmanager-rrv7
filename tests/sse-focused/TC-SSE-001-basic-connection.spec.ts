// TC-SSE-001: 基本的なSSE接続テスト（簡素化版）
import { test, expect } from '@playwright/test';

test.describe('TC-SSE-001: Basic SSE Connection (Simplified)', () => {
  
  test('SSE connection establishes successfully', async ({ page }) => {
    // 1. メインページに移動
    await page.goto('/');
    
    // 2. ページが読み込まれることを確認
    await expect(page.getByText('Abaqus Job Manager')).toBeVisible();
    
    // 3. SSE接続状態が表示されることを確認（接続中または接続済み）
    await expect(page.getByText(/\((connected|connecting)\)/)).toBeVisible({ timeout: 10000 });
  });
  
  test('License information is displayed', async ({ page }) => {
    // 1. メインページに移動
    await page.goto('/');
    
    // 2. ライセンス情報が表示されることを確認
    await expect(page.getByText(/License: \d+\/\d+ tokens/)).toBeVisible();
  });
  
  test('SSE events endpoint responds correctly', async ({ page }) => {
    // 1. SSEエンドポイントに短時間接続してヘッダーを確認
    await page.goto('/test.sse');
    
    // 2. JavaScriptでSSE接続をテスト
    const sseResult = await page.evaluate(() => {
      return new Promise<{ success: boolean; readyState: number }>((resolve) => {
        const eventSource = new EventSource('/api/events?channel=system');
        
        eventSource.onopen = () => {
          eventSource.close();
          resolve({ success: true, readyState: eventSource.readyState });
        };
        
        eventSource.onerror = () => {
          eventSource.close();
          resolve({ success: false, readyState: eventSource.readyState });
        };
        
        // 5秒でタイムアウト
        setTimeout(() => {
          eventSource.close();
          resolve({ success: false, readyState: eventSource.readyState });
        }, 5000);
      });
    });
    
    // 3. 接続が成功したことを確認
    expect(sseResult.success).toBe(true);
  });
});