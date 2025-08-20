// TC-SSE-007: パフォーマンス・負荷テスト（簡素化版）
import { test, expect } from '@playwright/test';

test.describe('TC-SSE-007: Performance Load Test (Simplified)', () => {
  
  test('Multiple sequential license updates', async ({ page }) => {
    // 1. テストページに移動
    await page.goto('/test/sse');
    await expect(page.getByRole('button', { name: 'Send License Update' })).toBeVisible();
    
    // 2. パフォーマンス測定開始
    const startTime = Date.now();
    const eventCount = 5;
    
    // 3. 連続でライセンス更新イベント送信
    for (let i = 0; i < eventCount; i++) {
      const eventStartTime = Date.now();
      
      await page.getByRole('button', { name: 'Send License Update' }).click();
      await expect(page.getByText(/license_usage_updated event emitted successfully/)).toBeVisible();
      
      const eventTime = Date.now() - eventStartTime;
      console.log(`Event ${i + 1}: ${eventTime}ms`);
      
      // 短い間隔で送信
      await page.waitForTimeout(200);
    }
    
    // 4. パフォーマンス確認
    const totalTime = Date.now() - startTime;
    const averageTime = totalTime / eventCount;
    
    console.log(`Total time: ${totalTime}ms, Average: ${averageTime}ms`);
    
    // 5. パフォーマンス基準確認（15秒以内に完了）
    expect(totalTime).toBeLessThan(15000);
    expect(averageTime).toBeLessThan(3000); // 平均3秒以内
  });
  
  test('Mixed event types performance', async ({ page }) => {
    // 1. テストページに移動
    await page.goto('/test/sse');
    
    // 2. 異なるイベントタイプの連続送信
    const events = [
      { name: 'Send License Update', expected: 'license_usage_updated' },
      { name: 'Send Job Status Update', expected: 'job_status_changed' },
      { name: 'Send Connection Event', expected: 'connected' },
      { name: 'Send Ping Event', expected: 'ping' }
    ];
    
    const startTime = Date.now();
    
    for (const event of events) {
      await page.getByRole('button', { name: event.name }).click();
      await expect(page.getByText(new RegExp(`${event.expected} event emitted successfully`))).toBeVisible();
      await page.waitForTimeout(200);
    }
    
    const totalTime = Date.now() - startTime;
    console.log(`Mixed events total time: ${totalTime}ms`);
    
    // 3. 10秒以内に完了
    expect(totalTime).toBeLessThan(10000);
  });
  
  test('SSE connection stability under load', async ({ page }) => {
    // 1. メインページでSSE接続確認
    await page.goto('/');
    await expect(page.getByText(/\((connected|connecting)\)/)).toBeVisible({ timeout: 10000 });
    
    // 2. 負荷をかけながら接続状態確認
    await page.goto('/test/sse');
    
    // 3. 複数イベントを短時間で送信
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: 'Send License Update' }).click();
      await expect(page.getByText(/license_usage_updated event emitted successfully/)).toBeVisible();
    }
    
    // 4. メインページに戻って接続状態確認
    await page.goto('/');
    await expect(page.getByText(/\((connected|connecting)\)/)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/License: \d+\/\d+ tokens/)).toBeVisible();
  });
});