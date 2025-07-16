# SSE特化テスト環境

このディレクトリには、Server-Sent Events（SSE）機能に特化したPlaywrightテストが含まれています。

## 📋 テスト概要

- **実行時間**: 約15分
- **対象**: SSE接続、リアルタイム更新、エラー回復
- **テストケース**: 8つの基本テストケース + 拡張テスト

## 🚀 テスト実行方法

```bash
# 基本的なSSEテスト実行
bun run test:sse

# UIモードでテスト実行
bun run test:sse:ui

# デバッグモードでテスト実行
bun run test:sse:debug

# ヘッドレスモードでテスト実行
bun run test:sse:headed

# テスト結果レポートの表示
bun run test:sse:report
```

## 📁 ファイル構造

```
tests/sse-focused/
├── playwright.config.ts          # Playwright設定
├── helpers/                      # ヘルパー関数
│   ├── global-setup.ts          # グローバルセットアップ
│   ├── global-teardown.ts       # グローバルクリーンアップ
│   └── sse-helpers.ts           # SSE専用ヘルパー関数
├── sse-connection.spec.ts        # 接続テスト
├── sse-realtime-updates.spec.ts  # リアルタイム更新テスト
├── sse-multi-page-sync.spec.ts   # マルチページ同期テスト
├── sse-admin-integration.spec.ts # Admin画面統合テスト
└── README.md                    # このファイル
```

## 🎯 テストケース

### 基本テストケース

1. **TC-SSE-001**: 基本SSE接続確立
2. **TC-SSE-002**: ライセンス更新イベント反映
3. **TC-SSE-003**: 接続断・再接続処理
4. **TC-SSE-004**: 複数画面間データ同期
5. **TC-SSE-005**: Admin画面リアルタイム更新
6. **TC-SSE-006**: イベント種別ごとの処理
7. **TC-SSE-007**: パフォーマンス・負荷テスト
8. **TC-SSE-008**: エラー状態からの回復

### 拡張テストケース

- **並行ユーザーシミュレーション**
- **タブ間相互作用テスト**
- **Admin画面包括テスト**
- **耐久性テスト**

## 🔧 設定

### 前提条件

- 開発サーバーが `http://localhost:5173` で起動済み
- Admin認証トークン: `fracture`
- SSEエンドポイント: `/api/events`

### 環境変数

```bash
# CI環境での実行
NODE_ENV=test CI=true bun run test:sse

# ログレベル調整
LOG_LEVEL=debug bun run test:sse
```

## 📊 テスト結果

テスト結果は以下に出力されます：

- **HTMLレポート**: `test-results/sse-html-report/`
- **JSONレポート**: `test-results/sse-results.json`
- **スクリーンショット**: `test-results/` (失敗時のみ)
- **ビデオ**: `test-results/` (失敗時のみ)

## 🚨 トラブルシューティング

### よくある問題

1. **タイムアウトエラー**
   - 開発サーバーが起動しているか確認
   - ネットワーク接続を確認

2. **認証エラー**
   - Admin認証トークンが `fracture` であることを確認

3. **SSE接続エラー**
   - `/api/events` エンドポイントが正常に動作するか確認

### デバッグ方法

```bash
# 詳細ログでデバッグ
DEBUG=pw:api,pw:browser bun run test:sse:debug

# 特定のテストのみ実行
bunx playwright test tests/sse-focused/sse-connection.spec.ts --config=tests/sse-focused/playwright.config.ts
```

## 🔍 ヘルパー関数

`helpers/sse-helpers.ts` には以下の便利な関数が含まれています：

- `waitForSSEConnection()`: SSE接続確立待機
- `sendLicenseUpdate()`: ライセンス更新イベント送信
- `simulateNetworkFailure()`: ネットワーク障害シミュレート
- `getCurrentLicenseState()`: ライセンス状態取得
- `measurePerformance()`: パフォーマンス測定

## 📈 パフォーマンス基準

- **平均イベント処理時間**: 3秒以内
- **接続確立時間**: 10秒以内
- **再接続時間**: 20秒以内
- **並行処理**: 5ユーザー同時接続で8秒以内

## 📚 参考資料

- [Playwright公式ドキュメント](https://playwright.dev/)
- [SSE仕様 (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [プロジェクト内のSSE実装](/app/lib/sse.ts)