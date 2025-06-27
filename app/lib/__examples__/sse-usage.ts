/**
 * SSE (Server-Sent Events) 使用例とベストプラクティス
 * 
 * ZodとGenericsを活用した型安全なSSEシステムの使用方法を示します。
 */

import { useState } from 'react';
import { useSSE } from '~/hooks/useSSE';
import { emitFileEvent, emitJobEvent } from '~/lib/sse';
import { 
  type FileEvent, 
  type JobEvent, 
  type SSEEvent,
  type SSEEventUnion,
  type SSEChannel,
  validateEventForChannel,
  isFileEvent,
  isValidChannel
} from '~/lib/sse-schemas';

// ========================================
// 1. 基本的な使用方法
// ========================================

/**
 * ファイル管理画面での使用例
 * - 型安全性: FileEvent型でイベントを受信
 * - チャンネル検証: strictChannelValidation=trueで不正イベントを拒否
 */
function FilesAdminExample() {
  const handleFileEvent = (event: FileEvent) => {
    // event.type は 'file_created' | 'file_updated' | 'file_deleted' に限定
    // event.data は FileEventData型で型安全
    console.log('File event:', event.type, event.data?.fileName);
  };

  useSSE({
    channel: 'files' as const,
    onEvent: handleFileEvent,
    strictChannelValidation: true, // ファイルイベントのみ受信
    validateEvents: true
  });
}

/**
 * ジョブ管理画面での使用例
 */
function JobsAdminExample() {
  const handleJobEvent = (event: JobEvent) => {
    switch (event.type) {
      case 'job_created':
        console.log('New job:', event.data?.jobName);
        break;
      case 'job_status_changed':
        console.log('Job status update:', event.data?.status);
        break;
    }
  };

  useSSE({
    channel: 'jobs' as const,
    onEvent: handleJobEvent,
    strictChannelValidation: true
  });
}

// ========================================
// 2. Generic SSEEvent<T> の活用（将来の拡張用）
// ========================================

/**
 * ジェネリック型を使った柔軟なイベントハンドリング
 * 現在は定義済みのイベント型のみサポート
 */
function FlexibleEventExample() {
  // ジェネリック型を使った型安全なイベントハンドリング
  const handleSystemEvent = (event: SSEEventUnion) => {
    if (event.type === 'connected') {
      console.log('Connected to channel:', event.data);
    } else if (event.type === 'disconnected') {
      console.log('Disconnected from channel:', event.data);
    }
  };

  useSSE({
    channel: 'system',
    onEvent: handleSystemEvent,
    validateEvents: true
  });
}

// ========================================
// 3. イベント発信のベストプラクティス
// ========================================

/**
 * ファイルアップロード完了時のイベント発信
 */
function emitFileUploadEvent(fileId: number, fileName: string, fileSize: number) {
  emitFileEvent('created', {
    fileId,
    fileName,
    fileSize,
    mimeType: 'application/octet-stream',
    uploadedBy: 'system'
  });
}

/**
 * ジョブステータス変更時のイベント発信
 */
function emitJobStatusChange(jobId: number, newStatus: 'running' | 'completed' | 'failed') {
  emitJobEvent('status_changed', {
    jobId,
    status: newStatus,
    // その他の必要なデータ
  });
}

// ========================================
// 4. 混合チャンネル対応
// ========================================

/**
 * システムイベントを処理する場合
 */
function SystemEventExample() {
  const handleSystemEvent = (event: SSEEventUnion) => {
    // Type guardsを使用してイベント型を判定
    if (isFileEvent(event)) {
      // event は FileEvent型として扱われる
      console.log('File event:', event.type);
    } else if (event.type.startsWith('job_')) {
      // ジョブイベントの処理
      console.log('Job event:', event.type);
    }
  };

  useSSE({
    channel: 'system', // 型安全なチャンネル指定
    onEvent: handleSystemEvent,
    strictChannelValidation: false,
    validateEvents: true
  });
}

// ========================================
// 5. エラーハンドリングとデバッグ
// ========================================

/**
 * エラーハンドリングを含む本格的な使用例
 */
function ProductionReadyExample() {
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');

  const handleFileEvent = (event: FileEvent) => {
    try {
      // ビジネスロジックの実行
      processFileEvent(event);
    } catch (error) {
      console.error('Failed to process file event:', error);
    }
  };

  const { isConnected, disconnect, reconnect } = useSSE({
    channel: 'files' as const,
    onEvent: handleFileEvent,
    onConnect: () => {
      console.log('SSE connected');
      setConnectionStatus('connected');
    },
    onDisconnect: () => {
      console.log('SSE disconnected');
      setConnectionStatus('disconnected');
    },
    onError: (error) => {
      console.error('SSE error:', error);
      setConnectionStatus('error');
    },
    strictChannelValidation: true,
    validateEvents: true,
    reconnectInterval: 5000
  });

  // 手動で再接続
  const handleReconnect = () => {
    disconnect();
    setTimeout(reconnect, 1000);
  };
}

// ========================================
// 6. チャンネル固有の検証
// ========================================

/**
 * 実行時にチャンネルとイベント型の整合性をチェック - 型安全版
 */
function validateChannelEvent(event: unknown, expectedChannel: string) {
  // まずチャンネル名を検証
  if (!isValidChannel(expectedChannel)) {
    console.error('Invalid channel name:', expectedChannel);
    return null;
  }

  const channel: SSEChannel = expectedChannel;
  
  switch (channel) {
    case 'files':
      const fileEvent = validateEventForChannel(event, 'files');
      if (fileEvent) {
        console.log('Valid file event:', fileEvent.type);
        return fileEvent;
      }
      break;
    case 'jobs':
      const jobEvent = validateEventForChannel(event, 'jobs');
      if (jobEvent) {
        console.log('Valid job event:', jobEvent.type);
        return jobEvent;
      }
      break;
    // 他のチャンネルも同様に処理
  }
  
  console.error('Invalid event for channel:', expectedChannel);
  return null;
}

/**
 * 動的チャンネル選択の例
 */
function DynamicChannelExample() {
  const [selectedChannel, setSelectedChannel] = useState<SSEChannel>('files');
  
  // チャンネル変更時の型安全性
  const handleChannelChange = (newChannel: string) => {
    if (isValidChannel(newChannel)) {
      setSelectedChannel(newChannel); // 型安全に設定
    } else {
      console.error('Invalid channel:', newChannel);
    }
  };

  const handleEvent = (event: SSEEventUnion) => {
    console.log(`Event on ${selectedChannel}:`, event.type);
  };

  useSSE({
    channel: selectedChannel, // 型安全なチャンネル
    onEvent: handleEvent,
    strictChannelValidation: true
  });
}

function processFileEvent(event: FileEvent) {
  // ファイルイベントの処理ロジック
  console.log(`Processing ${event.type} for file ${event.data?.fileName}`);
}

export {
  FilesAdminExample,
  JobsAdminExample,
  FlexibleEventExample,
  SystemEventExample,
  ProductionReadyExample,
  DynamicChannelExample,
  emitFileUploadEvent,
  emitJobStatusChange,
  validateChannelEvent
};