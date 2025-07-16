// TC-SSE-005: Admin画面リアルタイム更新（簡素化版）
import { test, expect } from '@playwright/test';

test.describe('TC-SSE-005: Admin Real-time Updates (Simplified)', () => {
  
  test('Admin files page SSE connection', async ({ page }) => {
    // 1. Admin認証
    await page.goto('/admin');
    await page.getByLabel('Admin Token').fill('fracture');
    await page.getByRole('button', { name: 'Access Admin Panel' }).click();
    
    // 2. Files画面への移動
    await page.getByRole('link', { name: '📁 Files' }).click();
    await expect(page.getByText('File Management')).toBeVisible();
    
    // 3. SSE接続状態確認
    await expect(page.getByText(/Files: (Connected|Connecting)/)).toBeVisible({ timeout: 10000 });
    
    // 4. 統計情報表示確認
    await expect(page.getByText(/\d+ files/)).toBeVisible();
  });
  
  test('Admin nodes page SSE connection', async ({ page }) => {
    // 1. Admin認証
    await page.goto('/admin');
    await page.getByLabel('Admin Token').fill('fracture');
    await page.getByRole('button', { name: 'Access Admin Panel' }).click();
    
    // 2. Nodes画面への移動
    await page.getByRole('link', { name: '🖥️ Nodes' }).click();
    await expect(page.getByText('Node Management')).toBeVisible();
    
    // 3. SSE接続状態確認
    await expect(page.getByText(/Nodes: (Connected|Connecting)/)).toBeVisible({ timeout: 10000 });
    
    // 4. ノード情報表示確認
    await expect(page.getByText(/\d+ nodes/)).toBeVisible();
  });
  
  test('Admin users page SSE connection', async ({ page }) => {
    // 1. Admin認証
    await page.goto('/admin');
    await page.getByLabel('Admin Token').fill('fracture');
    await page.getByRole('button', { name: 'Access Admin Panel' }).click();
    
    // 2. Users画面への移動
    await page.getByRole('link', { name: '👥 Users' }).click();
    await expect(page.getByText('User Management')).toBeVisible();
    
    // 3. SSE接続状態確認
    await expect(page.getByText(/Users: (Connected|Connecting)/)).toBeVisible({ timeout: 10000 });
    
    // 4. ユーザー情報表示確認
    await expect(page.getByText(/\d+ users/)).toBeVisible();
  });
  
  test('Admin settings page basic functionality', async ({ page }) => {
    // 1. Admin認証
    await page.goto('/admin');
    await page.getByLabel('Admin Token').fill('fracture');
    await page.getByRole('button', { name: 'Access Admin Panel' }).click();
    
    // 2. Settings画面への移動
    await page.getByRole('link', { name: '⚙️ Settings' }).click();
    await expect(page.getByText('System Settings')).toBeVisible();
    
    // 3. 設定情報表示確認
    await expect(page.getByText(/Environment/)).toBeVisible();
  });
});