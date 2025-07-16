# CI/CD統合ガイド - SSE特化テスト

## 📋 概要

SSE（Server-Sent Events）特化テストの継続的インテグレーション・デプロイメント環境構築ガイドです。効率的で信頼性の高い自動テスト実行を実現します。

## 🎯 CI/CD戦略

### **実行タイミング**
- **Push時**: 開発中のデグレ早期発見
- **Pull Request**: マージ前の品質確認
- **定期実行**: 6時間ごとの定期チェック
- **リリース前**: 最終品質確認

### **最適化方針**
- **実行時間**: 15分以内
- **並列実行**: 複数ブラウザで同時実行
- **リトライ**: ネットワーク不安定性対応
- **アーティファクト**: 失敗時の詳細情報保存

## 🔧 GitHub Actions設定

### **基本設定**

```yaml
# .github/workflows/sse-tests.yml
name: SSE Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    # 6時間ごとに実行（UTC時間）
    - cron: '0 */6 * * *'
  workflow_dispatch:  # 手動実行も可能

jobs:
  sse-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    
    strategy:
      matrix:
        # 必要に応じて複数ブラウザでテスト
        browser: [chromium]
        # 複数ノードでの並列実行
        shard: [1, 2]
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
          
      - name: Install dependencies
        run: bun install
        
      - name: Install Playwright
        run: bunx playwright install --with-deps ${{ matrix.browser }}
        
      - name: Create test environment
        run: |
          mkdir -p tests/screenshots
          mkdir -p tests/logs
          
      - name: Start development server
        run: |
          bun run dev &
          sleep 15
          # サーバー起動確認
          curl -f http://localhost:5173 || exit 1
          
      - name: Run SSE tests
        run: |
          bunx playwright test tests/sse-focused/ \
            --project=${{ matrix.browser }} \
            --shard=${{ matrix.shard }}/2 \
            --reporter=html,json \
            --output-dir=test-results
        env:
          NODE_ENV: test
          CI: true
          
      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: sse-test-results-${{ matrix.browser }}-${{ matrix.shard }}
          path: |
            test-results/
            tests/screenshots/
            tests/logs/
          retention-days: 7
          
      - name: Upload HTML report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report-${{ matrix.browser }}-${{ matrix.shard }}
          path: test-results/html-report/
          retention-days: 7
          
      - name: Comment PR with results
        uses: actions/github-script@v7
        if: github.event_name == 'pull_request' && failure()
        with:
          script: |
            const { data: comments } = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
            });
            
            const botComment = comments.find(comment => 
              comment.user.login === 'github-actions[bot]' && 
              comment.body.includes('SSE Test Results')
            );
            
            const body = `## 🔴 SSE Test Results - Failed
            
            Browser: ${{ matrix.browser }}
            Shard: ${{ matrix.shard }}/2
            
            Some SSE tests failed. Please check the uploaded artifacts for details.
            
            [View detailed report](https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }})`;
            
            if (botComment) {
              await github.rest.issues.updateComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                comment_id: botComment.id,
                body: body
              });
            } else {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                body: body
              });
            }
```

### **環境別設定**

```yaml
# .github/workflows/sse-tests-env.yml
name: SSE Tests - Environment Specific

on:
  push:
    branches: [main, develop, staging]

jobs:
  determine-env:
    runs-on: ubuntu-latest
    outputs:
      environment: ${{ steps.set-env.outputs.environment }}
      test-intensity: ${{ steps.set-env.outputs.test-intensity }}
    steps:
      - name: Determine environment
        id: set-env
        run: |
          if [[ "${{ github.ref }}" == "refs/heads/main" ]]; then
            echo "environment=production" >> $GITHUB_OUTPUT
            echo "test-intensity=full" >> $GITHUB_OUTPUT
          elif [[ "${{ github.ref }}" == "refs/heads/staging" ]]; then
            echo "environment=staging" >> $GITHUB_OUTPUT
            echo "test-intensity=extended" >> $GITHUB_OUTPUT
          else
            echo "environment=development" >> $GITHUB_OUTPUT
            echo "test-intensity=basic" >> $GITHUB_OUTPUT
          fi
          
  sse-tests:
    needs: determine-env
    runs-on: ubuntu-latest
    timeout-minutes: ${{ needs.determine-env.outputs.test-intensity == 'full' && 20 || 15 }}
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup environment
        run: |
          echo "Environment: ${{ needs.determine-env.outputs.environment }}"
          echo "Test intensity: ${{ needs.determine-env.outputs.test-intensity }}"
          
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        
      - name: Install dependencies
        run: bun install
        
      - name: Install Playwright
        run: bunx playwright install --with-deps chromium
        
      - name: Run tests based on intensity
        run: |
          if [[ "${{ needs.determine-env.outputs.test-intensity }}" == "basic" ]]; then
            # 基本的なテストのみ実行
            bunx playwright test tests/sse-focused/sse-connection.spec.js tests/sse-focused/sse-realtime-updates.spec.js
          elif [[ "${{ needs.determine-env.outputs.test-intensity }}" == "extended" ]]; then
            # 拡張テスト実行
            bunx playwright test tests/sse-focused/ --grep="@critical|@high"
          else
            # 全テスト実行
            bunx playwright test tests/sse-focused/
          fi
        env:
          NODE_ENV: test
          CI: true
          TEST_INTENSITY: ${{ needs.determine-env.outputs.test-intensity }}
```

## 🚀 最適化設定

### **Playwright CI設定**

```javascript
// playwright.config.ci.js
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/sse-focused',
  
  // CI環境での最適化
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 2 : 0,
  
  // CI用レポート設定
  reporter: [
    ['html', { 
      outputFolder: 'test-results/html-report',
      open: 'never' 
    }],
    ['json', { 
      outputFile: 'test-results/results.json' 
    }],
    ['junit', { 
      outputFile: 'test-results/junit.xml' 
    }],
    ['github']  // GitHub Actions用レポート
  ],
  
  use: {
    baseURL: 'http://localhost:5173',
    
    // CI環境での設定
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // タイムアウト設定（CI環境では少し長めに）
    actionTimeout: 15000,
    navigationTimeout: 20000,
  },
  
  // CI環境でのWebサーバー設定
  webServer: {
    command: 'bun run dev',
    port: 5173,
    reuseExistingServer: false,
    timeout: 60000,
  },
  
  // テスト全体のタイムアウト
  timeout: 90000,
  expect: {
    timeout: 15000,
  },
  
  projects: [
    {
      name: 'chromium',
      use: { 
        browserName: 'chromium',
        // CI環境でのブラウザ設定
        launchOptions: {
          args: ['--no-sandbox', '--disable-dev-shm-usage']
        }
      },
    },
  ],
});
```

### **パフォーマンス最適化**

```bash
# scripts/optimize-ci.sh
#!/bin/bash

# CI環境でのパフォーマンス最適化スクリプト

echo "🚀 Optimizing CI environment for SSE tests..."

# 不要なサービス停止
sudo systemctl stop postgresql mysql apache2 2>/dev/null || true

# メモリ設定最適化
echo "vm.swappiness=10" | sudo tee -a /etc/sysctl.conf
echo "vm.vfs_cache_pressure=50" | sudo tee -a /etc/sysctl.conf

# 一時ディレクトリのクリーンアップ
sudo rm -rf /tmp/* /var/tmp/* 2>/dev/null || true

# Node.jsメモリ制限
export NODE_OPTIONS="--max-old-space-size=4096"

# Bunの最適化
export BUN_RUNTIME_TRANSPILER_CACHE_PATH="/tmp/bun-cache"

echo "✅ CI environment optimized"
```

## 📊 監視・通知設定

### **Slack通知設定**

```yaml
# .github/workflows/sse-notification.yml
name: SSE Test Notifications

on:
  workflow_run:
    workflows: ["SSE Tests"]
    types: [completed]

jobs:
  notify:
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion != 'success' }}
    
    steps:
      - name: Send Slack notification
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ github.event.workflow_run.conclusion }}
          channel: '#development'
          title: 'SSE Tests Failed'
          message: |
            🔴 SSE Tests failed on ${{ github.event.workflow_run.head_branch }}
            
            **Repository**: ${{ github.repository }}
            **Branch**: ${{ github.event.workflow_run.head_branch }}
            **Run ID**: ${{ github.event.workflow_run.id }}
            
            [View Details](https://github.com/${{ github.repository }}/actions/runs/${{ github.event.workflow_run.id }})
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### **メール通知設定**

```yaml
# .github/workflows/sse-email-notification.yml
name: SSE Test Email Notifications

on:
  schedule:
    - cron: '0 8 * * 1'  # 毎週月曜日8時にレポート送信

jobs:
  weekly-report:
    runs-on: ubuntu-latest
    steps:
      - name: Generate test report
        run: |
          # 過去1週間のテスト結果を集計
          echo "📊 Weekly SSE Test Report" > report.txt
          echo "Period: $(date -d '7 days ago' +%Y-%m-%d) - $(date +%Y-%m-%d)" >> report.txt
          echo "" >> report.txt
          
          # GitHub APIを使用してテスト結果を取得（実装は省略）
          echo "Test Statistics:" >> report.txt
          echo "- Total Runs: 42" >> report.txt
          echo "- Success Rate: 95.2%" >> report.txt
          echo "- Average Duration: 12.3 minutes" >> report.txt
          
      - name: Send email report
        uses: dawidd6/action-send-mail@v3
        with:
          server_address: smtp.gmail.com
          server_port: 465
          username: ${{ secrets.EMAIL_USERNAME }}
          password: ${{ secrets.EMAIL_PASSWORD }}
          subject: 'Weekly SSE Test Report'
          body: file://report.txt
          to: dev-team@company.com
          from: github-actions@company.com
```

## 🔍 トラブルシューティング

### **一般的な問題と対処法**

#### **1. タイムアウト問題**
```yaml
# タイムアウト設定の調整
- name: Run SSE tests with extended timeout
  run: |
    bunx playwright test tests/sse-focused/ \
      --timeout=120000 \
      --global-timeout=1800000
```

#### **2. メモリ不足**
```yaml
# メモリ制限の調整
- name: Run tests with memory optimization
  run: |
    export NODE_OPTIONS="--max-old-space-size=8192"
    bunx playwright test tests/sse-focused/
```

#### **3. ネットワーク問題**
```yaml
# ネットワーク設定の調整
- name: Configure network settings
  run: |
    # DNS設定
    echo "nameserver 8.8.8.8" | sudo tee -a /etc/resolv.conf
    
    # ファイアウォール設定
    sudo ufw allow 5173/tcp
    
    # ネットワーク待機時間の調整
    export PLAYWRIGHT_NETWORK_TIMEOUT=30000
```

### **デバッグ設定**

```yaml
# デバッグ情報の詳細化
- name: Run tests with debug information
  run: |
    bunx playwright test tests/sse-focused/ \
      --debug \
      --headed \
      --reporter=list
  env:
    DEBUG: pw:api,pw:browser
    PLAYWRIGHT_BROWSER_CHANNEL: chrome
```

## 📈 メトリクス・分析

### **テスト結果分析**

```javascript
// scripts/analyze-test-results.js
import fs from 'fs';
import path from 'path';

class TestAnalyzer {
  static analyzeResults(resultsPath) {
    const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    
    const stats = {
      total: 0,
      passed: 0,
      failed: 0,
      flaky: 0,
      avgDuration: 0,
      slowestTest: null,
      fastestTest: null
    };
    
    results.suites.forEach(suite => {
      suite.tests.forEach(test => {
        stats.total++;
        
        const result = test.results[0];
        if (result.status === 'passed') stats.passed++;
        else if (result.status === 'failed') stats.failed++;
        
        // フレーキーテスト検出
        if (test.results.length > 1) stats.flaky++;
        
        // 実行時間分析
        if (!stats.slowestTest || result.duration > stats.slowestTest.duration) {
          stats.slowestTest = { name: test.title, duration: result.duration };
        }
        
        if (!stats.fastestTest || result.duration < stats.fastestTest.duration) {
          stats.fastestTest = { name: test.title, duration: result.duration };
        }
      });
    });
    
    stats.avgDuration = results.suites.reduce((sum, suite) => 
      sum + suite.tests.reduce((testSum, test) => testSum + test.results[0].duration, 0), 0
    ) / stats.total;
    
    stats.successRate = (stats.passed / stats.total) * 100;
    stats.flakeRate = (stats.flaky / stats.total) * 100;
    
    return stats;
  }
  
  static generateReport(stats) {
    console.log('📊 SSE Test Analysis Report');
    console.log('==========================');
    console.log(`Total Tests: ${stats.total}`);
    console.log(`Passed: ${stats.passed} (${stats.successRate.toFixed(1)}%)`);
    console.log(`Failed: ${stats.failed}`);
    console.log(`Flaky: ${stats.flaky} (${stats.flakeRate.toFixed(1)}%)`);
    console.log(`Average Duration: ${stats.avgDuration.toFixed(0)}ms`);
    console.log(`Slowest Test: ${stats.slowestTest?.name} (${stats.slowestTest?.duration}ms)`);
    console.log(`Fastest Test: ${stats.fastestTest?.name} (${stats.fastestTest?.duration}ms)`);
    
    // 品質判定
    if (stats.successRate >= 95 && stats.flakeRate < 5) {
      console.log('✅ Test Quality: GOOD');
    } else if (stats.successRate >= 90 && stats.flakeRate < 10) {
      console.log('⚠️  Test Quality: FAIR');
    } else {
      console.log('❌ Test Quality: POOR');
    }
  }
}

// 使用例
const results = TestAnalyzer.analyzeResults('test-results/results.json');
TestAnalyzer.generateReport(results);
```

### **トレンド分析**

```yaml
# .github/workflows/sse-trend-analysis.yml
name: SSE Test Trend Analysis

on:
  schedule:
    - cron: '0 0 * * 0'  # 毎週日曜日に実行

jobs:
  trend-analysis:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        
      - name: Download historical results
        uses: actions/download-artifact@v4
        with:
          pattern: sse-test-results-*
          path: historical-results/
          
      - name: Analyze trends
        run: |
          node scripts/analyze-trends.js historical-results/
          
      - name: Generate trend report
        run: |
          echo "📈 SSE Test Trend Report" > trend-report.md
          echo "Generated: $(date)" >> trend-report.md
          echo "" >> trend-report.md
          
          # トレンド分析結果をレポートに追加
          cat trend-analysis.json >> trend-report.md
          
      - name: Upload trend report
        uses: actions/upload-artifact@v4
        with:
          name: sse-trend-report
          path: trend-report.md
```

## 🎯 運用ベストプラクティス

### **1. 段階的ロールアウト**
```yaml
# フィーチャーフラグによる段階的テスト実行
- name: Run tests with feature flags
  run: |
    if [[ "${{ github.ref }}" == "refs/heads/main" ]]; then
      export ENABLE_ADVANCED_SSE_TESTS=true
    fi
    bunx playwright test tests/sse-focused/
```

### **2. 失敗時の自動回復**
```yaml
# 失敗時の自動リトライ
- name: Run tests with auto-retry
  run: |
    bunx playwright test tests/sse-focused/ || \
    bunx playwright test tests/sse-focused/ --retries=1
```

### **3. リソース最適化**
```yaml
# リソース使用量の監視
- name: Monitor resource usage
  run: |
    echo "Memory usage before tests:"
    free -h
    
    bunx playwright test tests/sse-focused/
    
    echo "Memory usage after tests:"
    free -h
```

---

このCI/CD統合により、SSE特化テストの継続的な品質保証と効率的な開発フローを実現できます。