import type { Route } from "./+types/api.events";
import { logger } from "~/lib/logger";
import { emitSystemEvent } from "~/lib/sse";
import { isValidChannel, type SSEChannel } from "~/lib/sse-schemas";

// Global event emitter for SSE
class EventEmitter {
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();

  on(event: string, callback: (data: unknown) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (data: unknown) => void) {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event: string, data: unknown) {
    this.listeners.get(event)?.forEach(callback => callback(data));
  }
}

export const eventEmitter = new EventEmitter();

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const channelParam = url.searchParams.get('channel') || 'system';
  
  // チャンネル名のバリデーション
  if (!isValidChannel(channelParam)) {
    logger.warn("Invalid SSE channel requested", "api.events", { 
      requestedChannel: channelParam,
      validChannels: ['files', 'jobs', 'nodes', 'users', 'system']
    });
    return new Response('Invalid channel', { status: 400 });
  }
  
  const channel: SSEChannel = channelParam;

  // Create SSE response
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const encoder = new TextEncoder();
      
      // Emit system connected event using proper typing
      emitSystemEvent('connected', { channel });
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', channel, timestamp: new Date().toISOString() })}\n\n`));
      
      logger.info("SSE connection established", "api.events", { channel });

      // Set up event listener
      const listener = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Connection closed or other error
        }
      };

      eventEmitter.on(channel, listener);

      // Keep-alive ping every 30 seconds
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() })}\n\n`));
        } catch {
          clearInterval(keepAlive);
        }
      }, 30000);

      // Cleanup when connection closes
      request.signal?.addEventListener('abort', () => {
        clearInterval(keepAlive);
        eventEmitter.off(channel, listener);
        
        logger.info("SSE connection closed", "api.events", { channel });
        
        // Emit disconnection event
        emitSystemEvent('disconnected', { channel });
        
        try {
          controller.close();
        } catch {
          // Connection already closed
        }
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}