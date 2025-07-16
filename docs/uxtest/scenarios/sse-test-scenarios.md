# SSE特化テストシナリオ - 8つの重要テストケース

## 📋 概要

Abaqus Job ManagerのSSE（Server-Sent Events）機能に特化した8つのテストケース。手動テストが困難で、デグレ影響が大きいリアルタイム機能の品質保証を効率的に実現します。

## 🎯 テストケース一覧

| ID | テストケース名 | 重要度 | 実行時間 | 対象機能 |
|---|---|---|---|---|
| [TC-SSE-001](#tc-sse-001-基本sse接続確立) | 基本SSE接続確立 | 🔴 Critical | 2分 | 接続確立・状態表示 |
| [TC-SSE-002](#tc-sse-002-ライセンス更新イベント反映) | ライセンス更新イベント反映 | 🔴 Critical | 2分 | リアルタイム更新 |
| [TC-SSE-003](#tc-sse-003-接続断再接続処理) | 接続断・再接続処理 | 🟡 High | 3分 | エラー回復 |
| [TC-SSE-004](#tc-sse-004-複数画面間データ同期) | 複数画面間データ同期 | 🟡 High | 3分 | 多画面同期 |
| [TC-SSE-005](#tc-sse-005-admin画面リアルタイム更新) | Admin画面リアルタイム更新 | 🟡 High | 2分 | Admin統合 |
| [TC-SSE-006](#tc-sse-006-イベント種別ごとの処理) | イベント種別ごとの処理 | 🟢 Medium | 2分 | イベント処理 |
| [TC-SSE-007](#tc-sse-007-パフォーマンス負荷テスト) | パフォーマンス・負荷テスト | 🟢 Medium | 1分 | 性能検証 |
| [TC-SSE-008](#tc-sse-008-エラー状態からの回復) | エラー状態からの回復 | 🟡 High | 3分 | 障害回復 |

**合計実行時間**: 約15分

---

## TC-SSE-001: 基本SSE接続確立

### **テスト目的**
アプリケーション起動時のSSE接続確立とステータス表示の正常動作を検証

### **前提条件**
- アプリケーションが http://localhost:5173 で起動済み
- SSEエンドポイント `/api/events` が利用可能

### **テスト手順**

#### **Step 1: アプリケーション起動とSSE接続**
```javascript
test('TC-SSE-001: 基本SSE接続確立', async ({ page }) => {
  // SSE接続監視設定
  let sseConnectionEstablished = false;
  page.on('response', response => {
    if (response.url().includes('/api/events') && response.status() === 200) {
      sseConnectionEstablished = true;
    }
  });
  
  // アプリケーション起動
  await page.goto('/');
  
  // ページロード完了待機
  await page.waitForLoadState('networkidle');
});
```

#### **Step 2: SSE接続状態の確認**
```javascript
  // SSE接続確立を確認（10秒以内）
  await expect(page.getByText('Real-time updates active')).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('(connected)')).toBeVisible();
  
  // ネットワークレベルでSSE接続確認
  expect(sseConnectionEstablished).toBeTruthy();
```

#### **Step 3: 初期データ表示確認**
```javascript
  // SystemStatusBarでライセンス情報表示確認
  await expect(page.getByText(/License: \d+\/\d+ tokens/)).toBeVisible();
  
  // 接続時間の記録（パフォーマンス確認）
  const connectionTime = Date.now() - startTime;
  expect(connectionTime).toBeLessThan(5000); // 5秒以内に接続
```

### **期待結果**
- ✅ 10秒以内にSSE接続確立
- ✅ 「Real-time updates active (connected)」表示
- ✅ ライセンス情報が正常表示
- ✅ ネットワークレベルでのSSE接続確認

### **失敗時の対応**
- ネットワークログ確認
- SSEエンドポイントの可用性確認
- SystemStatusBarコンポーネントの状態確認

---

## TC-SSE-002: ライセンス更新イベント反映

### **テスト目的**
ライセンス更新SSEイベントによるリアルタイム画面更新の検証

### **前提条件**
- SSE接続が確立済み
- テストSSEイベント送信機能が利用可能

### **テスト手順**

#### **Step 1: 初期状態の記録**
```javascript
test('TC-SSE-002: ライセンス更新イベント反映', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Real-time updates active')).toBeVisible();
  
  // 初期ライセンス状態記録
  const initialLicense = await page.getByText(/License: \d+\/\d+ tokens/).textContent();
  console.log('初期ライセンス状態:', initialLicense);
```

#### **Step 2: ライセンス更新イベント送信**
```javascript
  // Test環境でライセンス更新イベント送信
  await page.goto('/test/sse');
  await expect(page.getByText('Real-time updates active')).toBeVisible();
  
  const startTime = Date.now();
  await page.getByRole('button', { name: 'Send License Update' }).click();
  
  // イベント送信成功確認
  await expect(page.getByText('✅ license_update event emitted successfully')).toBeVisible();
```

#### **Step 3: リアルタイム更新確認**
```javascript
  // メイン画面に戻って更新確認
  await page.goto('/');
  await expect(page.getByText('Real-time updates active')).toBeVisible();
  
  // ライセンス数値の変更確認（3秒以内）
  const updateTime = Date.now();
  const updatedLicense = await page.getByText(/License: \d+\/\d+ tokens/).textContent();
  const updateLatency = updateTime - startTime;
  
  expect(updatedLicense).not.toBe(initialLicense);
  expect(updateLatency).toBeLessThan(3000); // 3秒以内に更新
```

#### **Step 4: 警告状態の確認**
```javascript
  // ライセンス数が上限近い場合の警告表示確認
  if (updatedLicense && updatedLicense.includes('11/12')) {
    await expect(page.getByText('⚠ Limited submission')).toBeVisible();
  }
```

### **期待結果**
- ✅ ライセンス更新イベント送信成功
- ✅ 3秒以内にライセンス数値更新
- ✅ 上限近い場合の警告表示
- ✅ 数値変更の正確性確認

### **テストデータ**
- 初期値: 5/12 tokens
- 更新後: 11/12 tokens
- 警告閾値: 90%以上（11/12以上）

---

## TC-SSE-003: 接続断・再接続処理

### **テスト目的**
ネットワーク障害時のSSE再接続機能と状態表示の検証

### **前提条件**
- 正常なSSE接続が確立済み
- ネットワーク操作権限あり

### **テスト手順**

#### **Step 1: 正常接続状態の確認**
```javascript
test('TC-SSE-003: 接続断・再接続処理', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Real-time updates active')).toBeVisible();
  await expect(page.getByText('(connected)')).toBeVisible();
```

#### **Step 2: 接続断のシミュレート**
```javascript
  // SSEエンドポイントをブロックして接続断をシミュレート
  await page.route('**/api/events*', route => route.abort());
  
  const disconnectTime = Date.now();
  console.log('ネットワーク断を開始:', new Date(disconnectTime));
```

#### **Step 3: 接続断状態の確認**
```javascript
  // 接続断状態の表示確認（5秒以内に検出）
  await expect(page.getByText('(connecting)')).toBeVisible({ timeout: 5000 });
  // または一定時間後にエラー状態
  await expect(page.getByText('(error)')).toBeVisible({ timeout: 10000 });
  
  // Real-time機能の停止確認
  await expect(page.getByText('Real-time updates active')).not.toBeVisible();
```

#### **Step 4: 再接続処理の確認**
```javascript
  // ブロック解除で再接続テスト
  await page.unroute('**/api/events*');
  
  const reconnectStartTime = Date.now();
  console.log('ネットワーク復旧:', new Date(reconnectStartTime));
  
  // 再接続成功確認（15秒以内）
  await expect(page.getByText('Real-time updates active')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('(connected)')).toBeVisible();
  
  const reconnectTime = Date.now() - reconnectStartTime;
  expect(reconnectTime).toBeLessThan(15000);
```

#### **Step 5: 機能回復確認**
```javascript
  // 再接続後の機能確認
  await expect(page.getByText(/License: \d+\/\d+ tokens/)).toBeVisible();
  
  // 実際にイベント受信テスト
  await page.goto('/test/sse');
  await page.getByRole('button', { name: 'Send Ping Event' }).click();
  await expect(page.getByText('✅ ping event emitted successfully')).toBeVisible();
```

### **期待結果**
- ✅ 接続断の迅速な検出（5秒以内）
- ✅ 適切な状態表示（connecting → error → connected）
- ✅ 15秒以内の自動再接続
- ✅ 再接続後の機能正常復旧

---

## TC-SSE-004: 複数画面間データ同期

### **テスト目的**
複数タブ・画面間でのSSEイベント同期動作の検証

### **前提条件**
- 複数ブラウザコンテキスト作成可能
- テストイベント送信機能利用可能

### **テスト手順**

#### **Step 1: 複数画面の起動**
```javascript
test('TC-SSE-004: 複数画面間データ同期', async ({ browser }) => {
  // 複数コンテキスト（タブ）作成
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();
  const page1 = await context1.newPage(); // メイン画面
  const page2 = await context2.newPage(); // Admin画面
  
  // 両画面でアプリケーション起動
  await page1.goto('/');
  await page2.goto('/admin');
  await page2.getByLabel('Admin Token').fill('fracture');
  await page2.getByRole('button', { name: 'Access Admin Panel' }).click();
  await page2.getByRole('link', { name: '📁 Files' }).click();
```

#### **Step 2: SSE接続確認**
```javascript
  // 両画面でSSE接続確認
  await expect(page1.getByText('Real-time updates active')).toBeVisible();
  await expect(page2.getByText('Files: Connected')).toBeVisible();
  
  // 初期状態の記録
  const initialLicense1 = await page1.getByText(/License: \d+\/\d+ tokens/).textContent();
  const initialFileCount = await page2.getByText(/\d+ files/).textContent();
```

#### **Step 3: イベント送信と同期確認**
```javascript
  // Test環境でイベント送信
  const testPage = await context1.newPage();
  await testPage.goto('/test/sse');
  await testPage.getByRole('button', { name: 'Send License Update' }).click();
  await expect(testPage.getByText('✅ license_update event emitted successfully')).toBeVisible();
  
  const eventTime = Date.now();
```

#### **Step 4: 両画面での同期確認**
```javascript
  // Page1（メイン画面）での更新確認
  const updatedLicense1 = await page1.getByText(/License: \d+\/\d+ tokens/).textContent();
  expect(updatedLicense1).not.toBe(initialLicense1);
  
  // Page2（Admin画面）での状態確認
  await expect(page2.getByText('Files: Connected')).toBeVisible();
  
  const syncTime = Date.now() - eventTime;
  expect(syncTime).toBeLessThan(5000); // 5秒以内に同期
  
  await context1.close();
  await context2.close();
```

### **期待結果**
- ✅ 複数画面で同時SSE接続維持
- ✅ イベント発生時の全画面同期更新
- ✅ 5秒以内の同期完了
- ✅ 画面間でのデータ整合性維持

---

## TC-SSE-005: Admin画面リアルタイム更新

### **テスト目的**
Admin Files管理画面でのSSEベース更新機能の検証

### **前提条件**
- Admin認証情報利用可能
- Files管理画面アクセス可能

### **テスト手順**

#### **Step 1: Admin画面アクセス**
```javascript
test('TC-SSE-005: Admin画面リアルタイム更新', async ({ page }) => {
  // Admin認証
  await page.goto('/admin');
  await page.getByLabel('Admin Token').fill('fracture');
  await page.getByRole('button', { name: 'Access Admin Panel' }).click();
  
  // Files画面への移動
  await page.getByRole('link', { name: '📁 Files' }).click();
  await expect(page.getByText('File Management')).toBeVisible();
```

#### **Step 2: SSE接続状態確認**
```javascript
  // Admin画面でのSSE接続確認
  await expect(page.getByText('Files: Connected')).toBeVisible();
  await expect(page.getByText('Jobs: Connected')).toBeVisible();
  
  // 初期統計情報記録
  const initialFileStats = await page.getByText(/\d+ files • \d+ Bytes total/).textContent();
```

#### **Step 3: ファイル操作シミュレート**
```javascript
  // 別タブでファイル関連イベント送信
  const testPage = await page.context().newPage();
  await testPage.goto('/test/sse');
  
  // File関連のテストイベント送信（実装状況に応じて）
  // await testPage.getByRole('button', { name: 'Send File Update' }).click();
  
  // または既存のジョブ関連イベントで代用
  await testPage.getByRole('button', { name: 'Send Job Status Update' }).click();
  await expect(testPage.getByText('✅ job_status_changed event emitted successfully')).toBeVisible();
```

#### **Step 4: リアルタイム更新確認**
```javascript
  // Admin画面でのリアルタイム更新確認
  await expect(page.getByText('Files: Connected')).toBeVisible();
  
  // SSE接続の維持確認
  await expect(page.getByText('Jobs: Connected')).toBeVisible();
  
  // 統計情報の表示確認（変更がなくても表示維持）
  await expect(page.getByText(/\d+ files • \d+ Bytes total/)).toBeVisible();
```

### **期待結果**
- ✅ Admin画面でSSE接続確立
- ✅ Files・Jobs両チャンネルの接続維持
- ✅ リアルタイム接続状態の表示
- ✅ イベント受信時の適切な処理

---

## TC-SSE-006: イベント種別ごとの処理

### **テスト目的**
異なるSSEイベント種別の適切な処理と画面反映の検証

### **前提条件**
- テストSSEイベント送信機能の全種別利用可能
- イベント処理結果の確認方法が明確

### **テスト手順**

#### **Step 1: テスト環境準備**
```javascript
test('TC-SSE-006: イベント種別ごとの処理', async ({ page }) => {
  await page.goto('/test/sse');
  await expect(page.getByText('Real-time updates active')).toBeVisible();
  
  // 初期状態の記録
  const initialLicense = await page.getByText(/License: \d+\/\d+ tokens/).textContent();
```

#### **Step 2: License Updateイベントテスト**
```javascript
  // License Updateイベント
  await page.getByRole('button', { name: 'Send License Update' }).click();
  await expect(page.getByText('✅ license_update event emitted successfully')).toBeVisible();
  
  // ライセンス表示の更新確認
  const updatedLicense = await page.getByText(/License: \d+\/\d+ tokens/).textContent();
  expect(updatedLicense).not.toBe(initialLicense);
```

#### **Step 3: Job Status Updateイベントテスト**
```javascript
  // Job Status Updateイベント
  await page.getByRole('button', { name: 'Send Job Status Update' }).click();
  await expect(page.getByText('✅ job_status_changed event emitted successfully')).toBeVisible();
  
  // ジョブ関連の処理確認（実装状況に応じて）
```

#### **Step 4: Connection Eventテスト**
```javascript
  // Connection Event
  await page.getByRole('button', { name: 'Send Connection Event' }).click();
  await expect(page.getByText('✅ connected event emitted successfully')).toBeVisible();
  
  // 接続状態の確認
  await expect(page.getByText('Real-time updates active')).toBeVisible();
```

#### **Step 5: Ping Eventテスト**
```javascript
  // Ping Event（接続維持）
  await page.getByRole('button', { name: 'Send Ping Event' }).click();
  await expect(page.getByText('✅ ping event emitted successfully')).toBeVisible();
  
  // 接続状態の継続確認
  await expect(page.getByText('(connected)')).toBeVisible();
```

### **期待結果**
- ✅ 全イベント種別の送信成功
- ✅ 各イベントの適切な処理実行
- ✅ イベント別の画面反映確認
- ✅ 接続状態の継続維持

---

## TC-SSE-007: パフォーマンス・負荷テスト

### **テスト目的**
SSE連続イベント処理時のパフォーマンスと安定性の確認

### **前提条件**
- 連続イベント送信が可能
- パフォーマンス測定機能あり

### **テスト手順**

#### **Step 1: パフォーマンステスト準備**
```javascript
test('TC-SSE-007: パフォーマンス・負荷テスト', async ({ page }) => {
  await page.goto('/test/sse');
  await expect(page.getByText('Real-time updates active')).toBeVisible();
  
  // 初期状態確認
  await expect(page.getByText('(connected)')).toBeVisible();
```

#### **Step 2: 連続イベント送信**
```javascript
  // パフォーマンス測定開始
  const startTime = Date.now();
  const eventCount = 5;
  
  // 連続でライセンス更新イベント送信
  for (let i = 0; i < eventCount; i++) {
    const eventStartTime = Date.now();
    
    await page.getByRole('button', { name: 'Send License Update' }).click();
    await expect(page.getByText('✅ license_update event emitted successfully')).toBeVisible();
    
    const eventTime = Date.now() - eventStartTime;
    console.log(`イベント${i+1}: ${eventTime}ms`);
    
    // 短い間隔で送信
    await page.waitForTimeout(200);
  }
```

#### **Step 3: パフォーマンス確認**
```javascript
  const totalTime = Date.now() - startTime;
  const averageTime = totalTime / eventCount;
  
  console.log(`総時間: ${totalTime}ms, 平均: ${averageTime}ms`);
  
  // パフォーマンス確認（10秒以内に完了）
  expect(totalTime).toBeLessThan(10000);
  expect(averageTime).toBeLessThan(2000); // 平均2秒以内
```

#### **Step 4: 安定性確認**
```javascript
  // 最終状態確認
  await expect(page.getByText('Real-time updates active')).toBeVisible();
  await expect(page.getByText('(connected)')).toBeVisible();
  await expect(page.getByText(/License: \d+\/\d+ tokens/)).toBeVisible();
  
  // 追加イベントでの動作確認
  await page.getByRole('button', { name: 'Send Ping Event' }).click();
  await expect(page.getByText('✅ ping event emitted successfully')).toBeVisible();
```

### **期待結果**
- ✅ 連続イベント処理が10秒以内完了
- ✅ 平均イベント処理時間2秒以内
- ✅ イベント処理中も接続維持
- ✅ 負荷後の正常動作確認

---

## TC-SSE-008: エラー状態からの回復

### **テスト目的**
SSEエラー状態からの自動回復機能と状態管理の検証

### **前提条件**
- ネットワーク操作とエラーシミュレート可能
- エラー回復機能が実装済み

### **テスト手順**

#### **Step 1: 正常状態確認**
```javascript
test('TC-SSE-008: エラー状態からの回復', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Real-time updates active')).toBeVisible();
  await expect(page.getByText('(connected)')).toBeVisible();
```

#### **Step 2: サーバーエラーシミュレート**
```javascript
  // サーバーエラーをシミュレート
  await page.route('**/api/events*', route => route.fulfill({
    status: 500,
    body: 'Internal Server Error'
  }));
  
  const errorTime = Date.now();
  console.log('サーバーエラー開始:', new Date(errorTime));
```

#### **Step 3: エラー状態確認**
```javascript
  // エラー状態の表示確認（10秒以内に検出）
  await expect(page.getByText('(error)')).toBeVisible({ timeout: 10000 });
  // または reconnecting状態の表示
  await expect(page.getByText('(connecting)')).toBeVisible({ timeout: 5000 });
  
  // Real-time機能の停止確認
  const errorDisplayTime = Date.now() - errorTime;
  expect(errorDisplayTime).toBeLessThan(10000);
```

#### **Step 4: 自動回復テスト**
```javascript
  // サーバー復旧をシミュレート
  await page.unroute('**/api/events*');
  
  const recoveryStartTime = Date.now();
  console.log('サーバー復旧:', new Date(recoveryStartTime));
  
  // 自動回復確認（20秒以内）
  await expect(page.getByText('Real-time updates active')).toBeVisible({ timeout: 20000 });
  await expect(page.getByText('(connected)')).toBeVisible();
  
  const recoveryTime = Date.now() - recoveryStartTime;
  console.log(`回復時間: ${recoveryTime}ms`);
  expect(recoveryTime).toBeLessThan(20000);
```

#### **Step 5: 機能回復確認**
```javascript
  // 回復後の機能テスト
  await page.goto('/test/sse');
  await page.getByRole('button', { name: 'Send License Update' }).click();
  await expect(page.getByText('✅ license_update event emitted successfully')).toBeVisible();
  
  // ライセンス情報の更新確認
  await page.goto('/');
  await expect(page.getByText(/License: \d+\/\d+ tokens/)).toBeVisible();
```

### **期待結果**
- ✅ エラー状態の適切な検出・表示（10秒以内）
- ✅ 20秒以内の自動回復
- ✅ 回復後の機能正常動作
- ✅ エラー→回復の状態遷移確認

---

## 📊 テスト実行管理

### **実行順序**
1. **Critical Tests**: TC-SSE-001, TC-SSE-002（基本機能）
2. **High Priority**: TC-SSE-003, TC-SSE-004, TC-SSE-005, TC-SSE-008（高度機能）
3. **Medium Priority**: TC-SSE-006, TC-SSE-007（追加検証）

### **実行環境**
- **開発環境**: 全テスト実行
- **CI/CD**: Critical + High Priority
- **定期実行**: 全テスト（6時間ごと）

### **失敗時対応**
1. **ログ収集**: コンソールログ・ネットワークログ
2. **スクリーンショット**: 失敗時の画面状態
3. **リトライ**: 最大2回の自動リトライ
4. **エスカレーション**: 3回連続失敗時の通知

### **成功基準**
- **個別テスト**: 各テストケースのパス
- **全体成功率**: 95%以上
- **実行時間**: 15分以内
- **安定性**: フレーキーテスト5%以下

---

このSSE特化テストシナリオにより、最小限の投資で最大限のリアルタイム機能品質保証を実現します。