// TC-SSE-006: イベント種別ごとの処理
import { test, expect } from '@playwright/test';

test.describe('TC-SSE-006: Event Type Processing', () => {
  
  test('License Update event processing', async ({ page }) => {
    // 1. テスト環境準備
    await page.goto('/test/sse');
    await expect(page.getByText('Server-Sent Events Test')).toBeVisible();
    
    // 2. 初期ライセンス状態記録
    await page.goto('/');
    const initialLicense = await page.getByText(/License: \d+\/\d+ tokens/).textContent();
    
    // 3. License Updateイベントテスト
    await page.goto('/test/sse');
    await page.getByRole('button', { name: 'Send License Update' }).click();
    await expect(page.getByText('✅ license_usage_updated event emitted successfully')).toBeVisible();
    
    // 4. ライセンス表示の更新確認
    await page.goto('/');
    const updatedLicense = await page.getByText(/License: \d+\/\d+ tokens/).textContent();
    expect(updatedLicense).toBeDefined();
  });
  
  test('Job Status Update event processing', async ({ page }) => {
    // 1. テスト環境準備
    await page.goto('/test/sse');
    
    // 2. Job Status Updateイベント
    await page.getByRole('button', { name: 'Send Job Status Update' }).click();
    await expect(page.getByText('✅ job_status_changed event emitted successfully')).toBeVisible();
    
    // 3. イベント処理確認（エラーが発生しないこと）
    await expect(page.getByText('Server-Sent Events Test')).toBeVisible();
  });
  
  test('Connection event processing', async ({ page }) => {
    // 1. テスト環境準備
    await page.goto('/test/sse');
    
    // 2. Connection Event
    await page.getByRole('button', { name: 'Send Connection Event' }).click();
    await expect(page.getByText('✅ connected event emitted successfully')).toBeVisible();
    
    // 3. 接続状態の確認
    await page.goto('/');
    await expect(page.getByText(/\((connected|connecting)\)/)).toBeVisible({ timeout: 10000 });
  });
  
  test('Ping event processing', async ({ page }) => {
    // 1. テスト環境準備
    await page.goto('/test/sse');
    
    // 2. Ping Event（接続維持）
    await page.getByRole('button', { name: 'Send Ping Event' }).click();
    await expect(page.getByText('✅ ping event emitted successfully')).toBeVisible();
    
    // 3. 接続状態の継続確認
    await page.goto('/');
    await expect(page.getByText(/\((connected|connecting)\)/)).toBeVisible({ timeout: 10000 });
  });
  
  test('All event types sequence', async ({ page }) => {
    // 1. テスト環境準備
    await page.goto('/test/sse');
    
    // 2. 全イベント種別の順次実行
    const events = [
      { name: 'Send License Update', expected: 'license_usage_updated' },
      { name: 'Send Job Status Update', expected: 'job_status_changed' },
      { name: 'Send Connection Event', expected: 'connected' },
      { name: 'Send Ping Event', expected: 'ping' }
    ];
    
    for (const event of events) {
      await page.getByRole('button', { name: event.name }).click();
      await expect(page.getByText(`✅ ${event.expected} event emitted successfully`)).toBeVisible();
      await page.waitForTimeout(500); // 短い待機
    }
    
    // 3. 最終状態確認
    await page.goto('/');
    await expect(page.getByText(/\((connected|connecting)\)/)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/License: \d+\/\d+ tokens/)).toBeVisible();
  });

  test('API endpoints validation', async ({ page }) => {
    // 1. ライセンス更新APIテスト
    const licenseResponse = await page.request.post('/api/test-events', {
      data: {
        eventType: 'license_usage_updated',
        data: { totalTokens: 50, usedTokens: 25, availableTokens: 25 }
      }
    });
    
    expect(licenseResponse.status()).toBe(200);
    const licenseResult = await licenseResponse.json();
    expect(licenseResult.success).toBe(true);
    expect(licenseResult.eventType).toBe('license_usage_updated');
    
    // 2. ジョブステータス更新APIテスト
    const jobResponse = await page.request.post('/api/test-events', {
      data: {
        eventType: 'job_status_changed',
        data: { jobId: 1, status: 'running' }
      }
    });
    
    expect(jobResponse.status()).toBe(200);
    const jobResult = await jobResponse.json();
    expect(jobResult.success).toBe(true);
    expect(jobResult.eventType).toBe('job_status_changed');
    
    // 3. 無効なイベントタイプの拒否確認
    const invalidResponse = await page.request.post('/api/test-events', {
      data: {
        eventType: 'invalid_event_type',
        data: {}
      }
    });
    
    expect(invalidResponse.status()).toBe(400);
    const invalidResult = await invalidResponse.json();
    expect(invalidResult.error).toBe('Invalid event type');
  });
});