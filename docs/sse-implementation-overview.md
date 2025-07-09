# SSE (Server-Sent Events) 実装概要

## 📋 目次

1. [システム構成](#システム構成)
2. [ファイル構成と役割](#ファイル構成と役割)
3. [アーキテクチャ](#アーキテクチャ)
4. [データフロー](#データフロー)
5. [Hydration安全性の実装](#hydration安全性の実装)
6. [エラーハンドリング](#エラーハンドリング)
7. [設定とカスタマイズ](#設定とカスタマイズ)
8. [デバッグとモニタリング](#デバッグとモニタリング)

---

## システム構成

### 概要
Abaqus Job ManagerのSSE実装は、**Hydration-Safe**な設計でリアルタイムデータ更新を提供します。React Router v7のSSR/CSR環境で、サーバーとクライアント間の状態不整合を防ぎながら、リアルタイム機能を実現しています。

### 主要特徴
- ✅ **Hydration-Safe**: サーバーサイドレンダリングとの完全な互換性
- ✅ **型安全性**: TypeScriptによる完全な型定義
- ✅ **自動再接続**: 接続エラー時の指数バックオフ再接続
- ✅ **リソース管理**: デッドリスナーの自動削除とメモリリーク防止
- ✅ **チャンネル分離**: 機能別のイベントチャンネル管理

---

## ファイル構成と役割

### 🏗️ Core Implementation

#### **`/app/app/lib/sse-event-emitter.ts`**
**役割**: グローバルイベントエミッター（システムの中核）
```typescript
class SSEEventEmitter {
  private listeners: Map<string, Set<(data: unknown) => void>>
  emit(event: string, data: unknown)    // イベント送信
  on(event: string, callback: Function) // リスナー登録
  off(event: string, callback: Function)// リスナー削除
  cleanup()                             // デッドリスナー削除
}
```

**重要機能**:
- チャンネル別リスナー管理
- デッドリスナーの自動検出・削除
- 統計情報とデバッグ支援

#### **`/app/app/lib/sse.ts`**
**役割**: SSEイベント送信API（サーバーサイド）
```typescript
// 汎用イベント送信
emitSSE<T>(channel: string, type: string, data?: T): void

// 特化されたイベント送信関数
emitJobEvent(type: string, data?: JobEventData): void
emitSystemEvent(type: string, data?: SystemEventData): void
emitFileEvent(type: string, data?: FileEventData): void
```

**使用例**:
```typescript
// ライセンス更新イベント
emitSystemEvent('license_update', { used: 8, total: 12 });

// ジョブステータス変更
emitJobEvent('job_status_changed', { 
  jobId: 123, 
  status: 'completed' 
});
```

#### **`/app/app/lib/sse-schemas.ts`**
**役割**: 型定義とバリデーション
```typescript
// SSEイベントの基本構造
interface SSEEvent<T = any> {
  type: string;
  channel: string;
  timestamp: string;
  data?: T;
}

// チャンネル定義
export const SSE_CHANNELS = {
  JOBS: 'jobs',
  FILES: 'files', 
  NODES: 'nodes',
  USERS: 'users',
  SYSTEM: 'system'
} as const;

// イベントタイプ定義
export const EVENT_TYPES = {
  JOB_CREATED: 'job_created',
  JOB_UPDATED: 'job_updated',
  LICENSE_UPDATE: 'license_update',
  // ...
} as const;
```

### 🌐 Server-Side Components

#### **`/app/app/routes/api.events.ts`**
**役割**: SSEエンドポイント（クライアント接続受付）
```typescript
// URL: GET /api/events?channel=system
export async function loader({ request }: Route.LoaderArgs) {
  const stream = new ReadableStream({
    start(controller) {
      // 1. 初期接続イベント送信
      // 2. リスナー登録
      // 3. Keep-alive ping設定
      // 4. クリーンアップ処理設定
    }
  });
}
```

**処理フロー**:
1. チャンネルバリデーション
2. ReadableStream作成
3. EventEmitterリスナー登録
4. 30秒間隔のKeep-alive ping
5. 接続終了時のクリーンアップ

#### **`/app/app/routes/api.test-events.ts`**
**役割**: テスト用イベント送信API
```typescript
// テスト用イベント送信
export async function action({ request }: Route.ActionArgs) {
  const { eventType, data } = await request.json();
  // eventTypeに応じて適切なemit関数を呼び出し
}
```

### 💻 Client-Side Components

#### **`/app/app/hooks/useSSE.ts`**
**役割**: Hydration-Safe SSEクライアントフック
```typescript
export function useSSE<T>(
  channel: string,
  onEvent: (event: SSEEvent<T>) => void,
  options?: UseSSEOptions<T>
): UseSSEResult<T> {
  // 1. クライアントサイド検出
  // 2. EventSource作成（クライアントのみ）
  // 3. 自動再接続ロジック
  // 4. 状態管理
}
```

**Hydration安全性の仕組み**:
```typescript
const [isMounted, setIsMounted] = useState(false);

// クライアントサイド検出
useEffect(() => {
  setIsMounted(true);
}, []);

// SSR時はスキップ、CSR時のみ接続
if (!isMounted) return; // サーバーサイドでは何もしない
```

**特化されたフック**:
```typescript
useJobSSE(onEvent, options)     // jobs チャンネル
useSystemSSE(onEvent, options)  // system チャンネル
useFileSSE(onEvent, options)    // files チャンネル
```

#### **`/app/app/components/ui/SystemStatusBar.tsx`**
**役割**: SSE統合UIコンポーネント
```typescript
export function SystemStatusBar({ 
  initialLicenseUsed, 
  initialLicenseTotal 
}) {
  const [isMounted, setIsMounted] = useState(false);
  
  // SSE接続
  const { connectionState } = useSystemSSE((event) => {
    if (event.type === 'license_update') {
      setLicenseUsed(event.data.used);
    }
  });

  // 二段階レンダリング
  if (!isMounted) {
    return <StaticStatusBar />; // SSR用静的コンテンツ
  }
  
  return <DynamicStatusBar />; // CSR用動的コンテンツ
}
```

### 🧹 Maintenance Components

#### **`/app/app/lib/sse-cleanup-scheduler.ts`**
**役割**: 定期メンテナンス
```typescript
class SSECleanupScheduler {
  start()           // 5分間隔のクリーンアップ開始
  performCleanup()  // デッドリスナー削除実行
  getStatus()       // 統計情報取得
}
```

---

## アーキテクチャ

### 全体構成図
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client-Side   │    │   Server-Side    │    │  Event System   │
│                 │    │                  │    │                 │
│ ┌─────────────┐ │    │ ┌──────────────┐ │    │ ┌─────────────┐ │
│ │ useSSE Hook │ │◄───┤ │ api.events   │ │◄───┤ │EventEmitter │ │
│ └─────────────┘ │    │ └──────────────┘ │    │ └─────────────┘ │
│                 │    │                  │    │                 │
│ ┌─────────────┐ │    │ ┌──────────────┐ │    │ ┌─────────────┐ │
│ │SystemStatus │ │    │ │test-events   │ │◄───┤ │ sse.ts      │ │
│ │Bar          │ │    │ │API           │ │    │ │(emit funcs) │ │
│ └─────────────┘ │    │ └──────────────┘ │    │ └─────────────┘ │
│                 │    │                  │    │                 │
│ ┌─────────────┐ │    │ ┌──────────────┐ │    │ ┌─────────────┐ │
│ │ JobTable    │ │    │ │Business Logic│ │────┤ │ Cleanup     │ │
│ │(realtime)   │ │    │ │              │ │    │ │ Scheduler   │ │
│ └─────────────┘ │    │ └──────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### チャンネル構成
```
system  ──→ ライセンス状況、接続状態、システムイベント
jobs    ──→ ジョブ作成、更新、削除、ステータス変更
files   ──→ ファイルアップロード、削除、検証結果
nodes   ──→ ノード状態、負荷情報、稼働状況
users   ──→ ユーザー管理、アクティビティ
```

---

## データフロー

### 1. 接続確立フロー
```
Client                     Server                    EventEmitter
  │                          │                          │
  ├── GET /api/events?channel=system ──────────────────►│
  │                          │                          │
  │                          ├── validateChannel()      │
  │                          ├── createReadableStream() │
  │                          ├── sendConnectionEvent ──►│
  │                          ├── registerListener() ───►│
  │                          ├── startKeepAlive()       │
  │                          │                          │
  │◄─── EventStream ────────┤                          │
  │     (connected event)    │                          │
```

### 2. イベント送信フロー
```
Business Logic            sse.ts                 EventEmitter           Client
      │                     │                        │                    │
      ├── emitSystemEvent ──►│                        │                    │
      │   ('license_update') │                        │                    │
      │                     ├── createSSEEvent()      │                    │
      │                     ├── emit(channel, event) ─►│                    │
      │                     │                        ├── forEach listener ─►│
      │                     │                        │    controller       │
      │                     │                        │    .enqueue()       │
      │                     │                        │                    │
      │                     │                        │    ◄──EventStream───┤
      │                     │                        │                    │
```

### 3. クライアント受信フロー
```
EventSource              useSSE Hook           Component
     │                      │                     │
     ├── onmessage ─────────►│                     │
     │   (raw event data)    │                     │
     │                      ├── JSON.parse()      │
     │                      ├── validateSSEEvent() │
     │                      ├── setLastEvent()     │
     │                      ├── onEvent() ────────►│
     │                      │                     ├── setState()
     │                      │                     ├── UI Update
```

---

## Hydration安全性の実装

### 問題と解決策

#### **問題**: サーバーとクライアントの状態不整合
- サーバーサイドで`EventSource`を作成しようとしてエラー
- `localStorage`アクセスでの実行時エラー
- 初期レンダリング時の動的コンテンツ差異

#### **解決策**: 二段階レンダリングパターン

**1. クライアントサイド検出**
```typescript
const [isMounted, setIsMounted] = useState(false);

useEffect(() => {
  setIsMounted(true); // クライアントサイドでのみtrue
}, []);
```

**2. 条件付きレンダリング**
```typescript
if (!isMounted) {
  // SSR: 静的コンテンツ
  return <StaticStatusBar initialData={serverData} />;
}

// CSR: 動的コンテンツ
return <DynamicStatusBar withSSE={true} />;
```

**3. 安全なAPI呼び出し**
```typescript
useEffect(() => {
  if (!isMounted || typeof window === 'undefined') return;
  
  // ブラウザAPIの安全な使用
  const eventSource = new EventSource(url);
  const savedData = localStorage.getItem('key');
}, [isMounted]);
```

### 実装パターン

#### **useSSE Hook**
```typescript
export function useSSE(channel, onEvent, options) {
  const [isMounted, setIsMounted] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');
  
  // Phase 1: Mount detection
  useEffect(() => setIsMounted(true), []);
  
  // Phase 2: Connection establishment (client-only)
  useEffect(() => {
    if (!isMounted) return; // Skip on server
    
    const eventSource = new EventSource(`/api/events?channel=${channel}`);
    // ... setup listeners
    
    return () => eventSource.close(); // Cleanup
  }, [isMounted, channel]);
  
  return { connectionState, isConnected, isMounted };
}
```

#### **Component Integration**
```typescript
export function RealtimeComponent({ initialData }) {
  const [data, setData] = useState(initialData);
  const [isMounted, setIsMounted] = useState(false);
  
  const { connectionState } = useSSE('channel', (event) => {
    setData(event.data); // Real-time update
  });
  
  useEffect(() => setIsMounted(true), []);
  
  return (
    <div>
      {/* Always render this part */}
      <StaticContent data={data} />
      
      {/* Only render on client-side */}
      {isMounted && (
        <ConnectionIndicator state={connectionState} />
      )}
    </div>
  );
}
```

---

## エラーハンドリング

### 接続エラーの処理

#### **自動再接続メカニズム**
```typescript
const handleError = useCallback((error: Event) => {
  setConnectionState('error');
  
  if (autoReconnect && reconnectAttempts < maxAttempts) {
    reconnectAttempts++;
    
    setTimeout(() => {
      createConnection(); // 再接続試行
    }, reconnectDelay * reconnectAttempts); // 指数バックオフ
  }
}, [autoReconnect, maxAttempts, reconnectDelay]);
```

#### **デッドリスナーの自動削除**
```typescript
// sse-event-emitter.ts
emit(event: string, data: unknown) {
  const deadListeners = [];
  
  listeners.forEach(callback => {
    try {
      callback(data);
    } catch (error) {
      if (error.message.includes('ReadableStreamDefaultController')) {
        deadListeners.push(callback); // Mark for removal
      }
    }
  });
  
  deadListeners.forEach(dead => listeners.delete(dead));
}
```

#### **サーバーサイド接続状態管理**
```typescript
// api.events.ts
let isConnectionActive = true;

const listener = (eventData) => {
  if (!isConnectionActive) return; // Skip if connection closed
  
  try {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(eventData)}\n\n`));
  } catch (error) {
    if (error.message.includes('ReadableStreamDefaultController')) {
      isConnectionActive = false;
      sseEventEmitter.off(channel, listener); // Self-cleanup
    }
  }
};

request.signal?.addEventListener('abort', () => {
  isConnectionActive = false; // Mark as inactive
  sseEventEmitter.off(channel, listener);
});
```

### エラーの種類と対処法

| エラータイプ | 原因 | 対処法 |
|------------|------|--------|
| `EventSource is not defined` | SSRでのEventSource使用 | `isMounted`チェック |
| `localStorage is not defined` | SSRでのlocalStorage使用 | `typeof window`チェック |
| `ReadableStreamDefaultController` | 閉じた接続への送信 | 接続状態管理 |
| Network errors | 接続断、サーバーエラー | 自動再接続 |
| Parse errors | 不正なJSONデータ | バリデーション強化 |

---

## 設定とカスタマイズ

### useSSE Hook オプション
```typescript
interface UseSSEOptions<T> {
  onConnect?: () => void;              // 接続成功時
  onDisconnect?: () => void;           // 接続切断時  
  onError?: (error: Event) => void;    // エラー発生時
  autoReconnect?: boolean;             // 自動再接続 (default: true)
  reconnectDelay?: number;             // 再接続間隔 (default: 1000ms)
  maxReconnectAttempts?: number;       // 最大再接続回数 (default: 5)
}
```

### 使用例
```typescript
// 基本的な使用
const { connectionState, isConnected } = useSSE('system', (event) => {
  console.log('Received:', event);
});

// カスタム設定
const { connectionState } = useSSE('jobs', handleJobEvent, {
  autoReconnect: true,
  reconnectDelay: 2000,
  maxReconnectAttempts: 10,
  onConnect: () => console.log('Connected!'),
  onError: (error) => console.error('SSE Error:', error)
});
```

### チャンネル別の推奨設定

```typescript
// システム監視 - 高頻度再接続
useSystemSSE(handleSystemEvents, {
  reconnectDelay: 1000,
  maxReconnectAttempts: 10
});

// ジョブ更新 - 中頻度
useJobSSE(handleJobEvents, {
  reconnectDelay: 2000,
  maxReconnectAttempts: 5
});

// ファイル操作 - 低頻度でも確実
useFileSSE(handleFileEvents, {
  reconnectDelay: 5000,
  maxReconnectAttempts: 3
});
```

---

## デバッグとモニタリング

### ログレベルと出力

#### **開発環境でのデバッグ**
```typescript
// logger.ts設定でDEBUGレベルを有効化
export const logger = getLogger('abaqus-job-manager');

// SSE関連のログ出力例
DEBUG useSSE:system SSE mounted on client-side
INFO  api.events SSE connection established {channel: "system"}
DEBUG SSEEventEmitter Emitting SSE event: system to 2 listeners
DEBUG api.events SSE data sent to client {channel: "system", dataSize: 156}
```

#### **本番環境での監視**
```typescript
// 統計情報の定期出力
setInterval(() => {
  const stats = sseEventEmitter.getStats();
  logger.info('SSE Statistics', 'SSEMonitor', stats);
}, 300000); // 5分間隔
```

### ブラウザ開発者ツールでの確認

#### **Network タブ**
```
Name: api/events?channel=system
Type: eventsource
Status: 200
Transfer: chunked
```

#### **Console でのイベント監視**
```typescript
// useSSE Hook内で自動出力されるログ
useSSE('system', (event) => {
  console.log('SSE Event received:', {
    type: event.type,
    channel: event.channel,
    timestamp: event.timestamp,
    data: event.data
  });
});
```

#### **リアルタイム統計の確認**
```typescript
// ブラウザコンソールで実行
window.sseStats = () => {
  fetch('/api/sse-stats').then(r => r.json()).then(console.log);
};
```

### トラブルシューティング

#### **よくある問題と解決法**

**1. 接続が確立されない**
```bash
# ログで確認
grep "SSE connection established" logs/app.log

# 原因: チャンネル名の誤り、認証エラー
# 解決: URLパラメータとログの確認
```

**2. イベントが受信されない**
```bash
# リスナー数の確認
grep "listeners" logs/app.log

# 原因: イベントタイプの不一致、バリデーションエラー
# 解決: sse-schemas.tsでの型定義確認
```

**3. メモリリーク**
```bash
# クリーンアップログの確認
grep "cleanup" logs/app.log

# 原因: デッドリスナーの蓄積
# 解決: cleanup schedulerの動作確認
```

### パフォーマンス監視

#### **メトリクス**
- **接続数**: 同時SSE接続数
- **イベントレート**: 分あたりのイベント送信数  
- **エラー率**: 接続エラーの発生頻度
- **再接続率**: 自動再接続の成功率
- **メモリ使用量**: リスナー数とメモリ使用量

#### **アラート閾値**
- 接続エラー率 > 5%
- 再接続失敗率 > 10% 
- デッドリスナー数 > 100
- イベント送信失敗率 > 1%

---

## まとめ

### 実装の特徴
1. **Hydration-Safe設計**: SSR/CSR環境での完全な互換性
2. **型安全性**: TypeScriptによる包括的な型定義
3. **自動復旧**: ネットワーク障害からの自動回復
4. **リソース管理**: メモリリーク防止とパフォーマンス最適化
5. **開発者体験**: 豊富なログとデバッグ支援

### 開発時の注意点
- 新しいチャンネル追加時は`sse-schemas.ts`の更新必須
- Hydration安全性を保つため、SSEを使用するコンポーネントでは`isMounted`チェック必須
- 本番環境では適切なログレベル設定とモニタリング設定が重要

### 今後の拡張
- 双方向通信が必要な場合の検討（現在は SSE で十分）
- クラスタ環境でのイベント同期
- より詳細なメトリクス収集
- カスタムイベントフィルタリング機能