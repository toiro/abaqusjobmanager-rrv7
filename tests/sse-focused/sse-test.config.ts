// SSEテスト用のPlaywright設定
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './',
  testMatch: '**/TC-SSE-*.spec.ts',
  
  // 基本設定
  timeout: 30000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // レポート設定
  reporter: [
    ['html', { outputFolder: 'test-results/sse-report' }],
    ['list']
  ],
  
  use: {
    // 基本設定
    baseURL: 'http://localhost:5173',
    actionTimeout: 10000,
    navigationTimeout: 15000,
    
    // デバッグ設定
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  
  // 開発サーバーの設定
  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
  
  // プロジェクト設定
  projects: [
    {
      name: 'chromium',
      use: { 
        headless: true,
        // 基本的なブラウザ設定のみ
        launchOptions: {
          args: ['--no-sandbox', '--disable-dev-shm-usage']
        }
      },
    },
  ],
});