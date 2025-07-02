/**
 * Simplified useSSE Hook
 * Practical implementation focused on usability
 */

import { useEffect, useCallback, useRef } from 'react';
import { logger } from '~/lib/logger/logger';
import { 
  validateSSEEvent,
  type SSEEvent,
  type SSEChannel
} from '~/lib/sse-schemas';

export interface UseSSEOptions<T = any> {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  onEvent?: (event: SSEEvent<T>) => void;
}

/**
 * Simplified useSSE hook with practical event handling
 */
export function useSSE<T = any>(
  channel: string,
  onEvent: (event: SSEEvent<T>) => void,
  options: UseSSEOptions<T> = {}
): {
  isConnected: boolean;
  lastEvent: SSEEvent<T> | null;
  disconnect: () => void;
} {
  const eventSourceRef = useRef<EventSource | null>(null);
  const isConnectedRef = useRef(false);
  const lastEventRef = useRef<SSEEvent<T> | null>(null);
  
  const { onConnect, onDisconnect, onError } = options;

  // Handle incoming SSE messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const rawData = JSON.parse(event.data);
      const validatedEvent = validateSSEEvent(rawData);
      
      if (validatedEvent) {
        logger.debug('SSE event received', `useSSE:${channel}`, { 
          type: validatedEvent.type 
        });
        
        lastEventRef.current = validatedEvent as SSEEvent<T>;
        onEvent(validatedEvent as SSEEvent<T>);
      } else {
        logger.error('Invalid SSE event received', `useSSE:${channel}`, {
          rawData
        });
      }
    } catch (error) {
      logger.error('Failed to parse SSE event data', `useSSE:${channel}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        rawData: event.data
      });
    }
  }, [channel, onEvent]);

  // Handle connection open
  const handleOpen = useCallback(() => {
    isConnectedRef.current = true;
    logger.info('SSE connection established', `useSSE:${channel}`);
    onConnect?.();
  }, [channel, onConnect]);

  // Handle connection error
  const handleError = useCallback((error: Event) => {
    logger.error('SSE connection error', `useSSE:${channel}`, { error });
    onError?.(error);
  }, [channel, onError]);

  // Handle connection close
  const handleClose = useCallback(() => {
    isConnectedRef.current = false;
    logger.info('SSE connection closed', `useSSE:${channel}`);
    onDisconnect?.();
  }, [channel, onDisconnect]);

  // Disconnect function
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      isConnectedRef.current = false;
      logger.info('SSE connection manually closed', `useSSE:${channel}`);
    }
  }, [channel]);

  // Set up SSE connection
  useEffect(() => {
    // Construct SSE URL with channel parameter
    const sseUrl = `/api/events?channel=${encodeURIComponent(channel)}`;
    
    logger.info('Establishing SSE connection', `useSSE:${channel}`, { url: sseUrl });
    
    try {
      const eventSource = new EventSource(sseUrl);
      eventSourceRef.current = eventSource;

      // Set up event listeners
      eventSource.onopen = handleOpen;
      eventSource.onmessage = handleMessage;
      eventSource.onerror = handleError;
      
      // Custom event listener for connection close
      eventSource.addEventListener('close', handleClose);

      // Cleanup function
      return () => {
        eventSource.close();
        eventSourceRef.current = null;
        isConnectedRef.current = false;
        logger.debug('SSE cleanup completed', `useSSE:${channel}`);
      };
    } catch (error) {
      logger.error('Failed to create SSE connection', `useSSE:${channel}`, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, [channel, handleOpen, handleMessage, handleError, handleClose]);

  return {
    isConnected: isConnectedRef.current,
    lastEvent: lastEventRef.current,
    disconnect
  };
}

/**
 * Specialized hooks for common channels
 */
export function useJobSSE(onEvent: (event: SSEEvent) => void, options?: UseSSEOptions) {
  return useSSE('jobs', onEvent, options);
}

export function useFileSSE(onEvent: (event: SSEEvent) => void, options?: UseSSEOptions) {
  return useSSE('files', onEvent, options);
}

export function useNodeSSE(onEvent: (event: SSEEvent) => void, options?: UseSSEOptions) {
  return useSSE('nodes', onEvent, options);
}

export function useUserSSE(onEvent: (event: SSEEvent) => void, options?: UseSSEOptions) {
  return useSSE('users', onEvent, options);
}

export function useSystemSSE(onEvent: (event: SSEEvent) => void, options?: UseSSEOptions) {
  return useSSE('system', onEvent, options);
}