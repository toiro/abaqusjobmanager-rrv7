import { useEffect, useCallback, useRef } from 'react';
import { logger } from '~/lib/logger';
import { 
  validateSSEEventUnion, 
  validateEventForChannel,
  isValidChannel,
  type SSEEventUnion,
  type SSEChannel
} from '~/lib/sse-schemas';

interface UseSSEOptions<T extends SSEEventUnion = SSEEventUnion> {
  channel: SSEChannel;
  onEvent?: (event: T) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  reconnectInterval?: number;
  enabled?: boolean;
  validateEvents?: boolean; // Option to enable/disable validation
  strictChannelValidation?: boolean; // Only accept events matching the channel
}

export function useSSE<T extends SSEEventUnion = SSEEventUnion>({
  channel,
  onEvent,
  onConnect,
  onDisconnect,
  onError,
  reconnectInterval = 5000,
  enabled = true,
  validateEvents = true,
  strictChannelValidation = false
}: UseSSEOptions<T>) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isConnectedRef = useRef(false);

  const connect = useCallback(() => {
    if (!enabled || isConnectedRef.current) return;

    try {
      const eventSource = new EventSource(`/api/events?channel=${encodeURIComponent(channel)}`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        logger.info("SSE connection established", `useSSE:${channel}`);
        isConnectedRef.current = true;
        onConnect?.();
      };

      eventSource.onmessage = (event) => {
        try {
          const rawData = JSON.parse(event.data);
          
          // Handle keep-alive pings
          if (rawData.type === 'ping') {
            return;
          }
          
          logger.debug("SSE event received", `useSSE:${channel}`, { type: rawData.type });
          
          if (validateEvents) {
            let validatedEvent: T | null = null;
            
            if (strictChannelValidation && isValidChannel(channel)) {
              // Use channel-specific validation
              validatedEvent = validateEventForChannel<T>(rawData, channel);
            } else {
              // Use general union validation
              const unionEvent = validateSSEEventUnion(rawData);
              validatedEvent = unionEvent as T;
            }
            
            if (!validatedEvent) {
              logger.error("Invalid SSE event received", `useSSE:${channel}`, {
                channel,
                rawData,
                strictValidation: strictChannelValidation
              });
              return;
            }
            
            logger.debug("SSE event validated", `useSSE:${channel}`, { type: validatedEvent.type });
            onEvent?.(validatedEvent);
          } else {
            // Pass through without validation for backwards compatibility
            onEvent?.(rawData as T);
          }
        } catch (error) {
          logger.error("Failed to parse SSE event data", `useSSE:${channel}`, error);
        }
      };

      eventSource.onerror = (error) => {
        logger.error("SSE connection error", `useSSE:${channel}`, { error });
        isConnectedRef.current = false;
        onError?.(error);
        onDisconnect?.();

        // Attempt to reconnect
        if (enabled && reconnectInterval > 0) {
          reconnectTimeoutRef.current = setTimeout(() => {
            logger.info("Attempting SSE reconnection", `useSSE:${channel}`, { 
              reconnectInterval 
            });
            connect();
          }, reconnectInterval);
        }
      };

    } catch (error) {
      logger.error("Failed to create SSE EventSource", `useSSE:${channel}`, error);
    }
  }, [channel, enabled, onEvent, onConnect, onDisconnect, onError, reconnectInterval, validateEvents, strictChannelValidation]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      logger.info("SSE disconnecting", `useSSE:${channel}`);
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      isConnectedRef.current = false;
      onDisconnect?.();
    }
  }, [channel, onDisconnect]);

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    isConnected: isConnectedRef.current,
    disconnect,
    reconnect: () => {
      disconnect();
      setTimeout(connect, 100);
    }
  };
}