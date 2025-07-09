# SSE Testing Guide

## test-sse ページでのリアルタイム機能テスト方法

### 🎯 テスト目的
Server-Sent Events (SSE) のリアルタイム機能が正常に動作することを確認する

### 📋 テスト手順

#### 1. **準備**
1. `/test-sse` ページにアクセス
2. ブラウザ開発者ツール（F12）を開く
3. **Network** タブと **Console** タブを準備

#### 2. **SSE接続の確認**
**Network タブ**:
- `api/events?channel=system` のEventStream接続を確認
- Status: 200、Type: eventsource であることを確認

**Console タブ**:
- SSE関連のログメッセージを確認
- エラーがないことを確認

#### 3. **License Update ボタンのテスト**
**操作**: 「Send License Update」ボタンをクリック

**期待される効果**:
- ✅ SystemStatusBar の「License: X/12 tokens」が即座に変更
- ✅ ライセンス使用率に応じた色変化:
  - 0-8個: 緑色 (License available)
  - 9-10個: 黄色 (License usage high)  
  - 11-12個: 赤色 (License limit reached)

**確認方法**:
1. ページ上部のSystemStatusBarを注視
2. ボタンを複数回クリックして数値変化を確認
3. Network タブで license_update イベントの送信を確認

#### 4. **Job Status Update ボタンのテスト**
**操作**: 「Send Job Status Update」ボタンをクリック

**期待される効果**:
- ✅ jobs チャンネルにjob_status_changedイベント送信
- ✅ ランダムなジョブステータス更新

**確認方法**:
1. Network タブでjobs チャンネルへのイベント送信確認
2. Console タブでジョブイベントログ確認
3. 実際のJobTableがある画面（トップページ等）で効果確認

#### 5. **Connection Event ボタンのテスト**
**操作**: 「Send Connection Event」ボタンをクリック

**期待される効果**:
- ✅ system チャンネルにconnectedイベント送信
- ✅ 接続状態インジケーターの一時変化

**確認方法**:
1. SystemStatusBarの接続状態ドット（左側）を注視
2. Network タブでconnectionイベント確認

#### 6. **Ping Event ボタンのテスト**
**操作**: 「Send Ping Event」ボタンをクリック

**期待される効果**:
- ✅ keep-alive pingイベント送信
- ✅ 接続維持の確認

**確認方法**:
1. Network タブでpingイベント送信確認
2. 接続が維持されることを確認

### 📊 Network タブでの詳細確認

#### **EventStream の見方**
1. `/api/events?channel=system` をクリック
2. **Response** タブで受信データを確認:
```
data: {"type":"connected","channel":"system","timestamp":"2025-07-04T09:45:39.123Z","data":{"channel":"system"}}

data: {"type":"license_update","channel":"system","timestamp":"2025-07-04T09:45:42.456Z","data":{"used":7,"total":12}}

data: {"type":"ping","channel":"system","timestamp":"2025-07-04T09:46:09.789Z"}
```

#### **イベントデータの構造**
```json
{
  "type": "イベントタイプ",
  "channel": "チャンネル名", 
  "timestamp": "ISO形式のタイムスタンプ",
  "data": "イベント固有のデータ"
}
```

### 🐛 トラブルシューティング

#### **ライセンス更新が反映されない場合**
- SystemStatusBar が正しくマウントされているか確認
- SSE接続が `connected` 状態か確認
- ブラウザのキャッシュをクリア

#### **接続状態が `disconnected` の場合**
- サーバーが起動しているか確認
- ネットワークタブでSSE接続エラーを確認
- ページをリロードして再接続

#### **イベントが送信されない場合**
- Console タブでJavaScriptエラーを確認
- サーバーログでイベント送信処理を確認

### ✅ 正常動作の確認ポイント

1. **接続確立**: 緑色ドット + "Real-time updates active"
2. **ライセンス更新**: 数値とカラーのリアルタイム変化
3. **イベント送信**: Network タブでのデータ流れ確認
4. **エラーなし**: Console タブにエラーメッセージがない

### 📝 テスト結果記録

- [ ] SSE接続が正常に確立される
- [ ] License Update ボタンでリアルタイム更新
- [ ] Job Status Update ボタンでイベント送信
- [ ] Connection Event ボタンで接続イベント
- [ ] Ping Event ボタンでping送信
- [ ] 全体的なSSE機能が安定動作