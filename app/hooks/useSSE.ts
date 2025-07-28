/**
 * Hydration-Safe useSSE Hook
 * Prevents hydration mismatches by ensuring SSE connections only occur on client-side
 */

import { useEffect, useCallback, useState, useRef } from "react";
// Development-only debug helpers
const isDev =
	typeof window !== "undefined" && window.location.hostname === "localhost";
const debugLog = (message: string, data?: any) => {
	if (isDev) console.debug(`[SSE Debug] ${message}`, data || "");
};
import {
	validateSSEEvent,
	SSE_CHANNELS,
	type SSEEvent,
} from "~/lib/services/sse/sse-schemas";

export interface UseSSEOptions<T = unknown> {
	onConnect?: () => void;
	onDisconnect?: () => void;
	onError?: (error: Event) => void;
	onEvent?: (event: SSEEvent<T>) => void;
	/**
	 * Enable automatic reconnection on error
	 */
	autoReconnect?: boolean;
	/**
	 * Reconnection delay in milliseconds
	 */
	reconnectDelay?: number;
	/**
	 * Maximum reconnection attempts
	 */
	maxReconnectAttempts?: number;
}

export interface UseSSEResult<T = unknown> {
	isConnected: boolean;
	lastEvent: SSEEvent<T> | null;
	connectionState: "disconnected" | "connecting" | "connected" | "error";
	disconnect: () => void;
	reconnect: () => void;
	/**
	 * Indicates if the component has mounted (client-side only)
	 */
	isMounted: boolean;
}

/**
 * Hydration-safe useSSE hook that prevents server-side rendering issues
 */
export function useSSE<T = unknown>(
	channel: string,
	onEvent: (event: SSEEvent<T>) => void,
	options: UseSSEOptions<T> = {},
): UseSSEResult<T> {
	// 1. Client-side detection pattern
	const [isMounted, setIsMounted] = useState(false);

	// 2. State management with useState (not useRef) for proper re-renders
	const [isConnected, setIsConnected] = useState(false);
	const [lastEvent, setLastEvent] = useState<SSEEvent<T> | null>(null);
	const [connectionState, setConnectionState] = useState<
		"disconnected" | "connecting" | "connected" | "error"
	>("disconnected");

	// 3. Refs for managing connection and cleanup
	const eventSourceRef = useRef<EventSource | null>(null);
	const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);
	const reconnectAttemptsRef = useRef(0);

	const {
		onConnect,
		onDisconnect,
		onError,
		autoReconnect = true,
		reconnectDelay = 1000,
		maxReconnectAttempts = 5,
	} = options;

	// 4. Refs for latest callback handlers
	const onEventRef = useRef(onEvent);
	const onConnectRef = useRef(onConnect);
	const onDisconnectRef = useRef(onDisconnect);
	const onErrorRef = useRef(onError);

	// Update refs when callbacks change
	useEffect(() => {
		onEventRef.current = onEvent;
		onConnectRef.current = onConnect;
		onDisconnectRef.current = onDisconnect;
		onErrorRef.current = onError;
	});

	// 5. Client-side mounting detection
	useEffect(() => {
		setIsMounted(true);
		debugLog(`useSSE mounted for channel: ${channel}`);
	}, [channel]);

	// Disconnect function
	const disconnect = useCallback(() => {
		if (eventSourceRef.current) {
			eventSourceRef.current.close();
			eventSourceRef.current = null;
		}

		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current);
			reconnectTimeoutRef.current = null;
		}

		setIsConnected(false);
		setConnectionState("disconnected");
		debugLog(`SSE connection manually closed for ${channel}`);
	}, [channel]);

	// Reconnect function
	const reconnect = useCallback(() => {
		debugLog(`SSE manual reconnection initiated for ${channel}`);
		reconnectAttemptsRef.current = 0;

		// Clean up existing connection first
		if (eventSourceRef.current) {
			eventSourceRef.current.close();
			eventSourceRef.current = null;
		}

		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current);
			reconnectTimeoutRef.current = null;
		}

		// Create new connection - trigger remount to use main connection logic
		setIsMounted(false);
		setTimeout(() => setIsMounted(true), 0);
	}, [channel]);

	// 6. Set up SSE connection only on client-side
	useEffect(() => {
		if (!isMounted) {
			return; // Skip on server-side
		}

		// Create connection directly in useEffect to avoid dependency issues
		const sseUrl = `/api/events?channel=${encodeURIComponent(channel)}`;

		debugLog(`Establishing SSE connection for useSSE:${channel}`, {
			url: sseUrl,
		});
		setConnectionState("connecting");

		try {
			const eventSource = new EventSource(sseUrl);
			eventSourceRef.current = eventSource;

			// Set up event listeners using refs to avoid dependency issues
			eventSource.onopen = () => {
				setIsConnected(true);
				setConnectionState("connected");
				reconnectAttemptsRef.current = 0;
				debugLog(`SSE connection established for useSSE:${channel}`);
				onConnectRef.current?.();
			};

			eventSource.onmessage = (event: MessageEvent) => {
				try {
					const rawData = JSON.parse(event.data);
					const validatedEvent = validateSSEEvent(rawData);

					if (validatedEvent) {
						debugLog(`SSE event received for useSSE:${channel}`, {
							type: validatedEvent.type,
						});

						const typedEvent = validatedEvent as SSEEvent<T>;
						setLastEvent(typedEvent);
						onEventRef.current(typedEvent);
					} else {
						console.error(
							`[SSE Error] Invalid SSE event received for useSSE:${channel}`,
							{
								rawData,
							},
						);
					}
				} catch (error) {
					console.error(
						`[SSE Error] Failed to parse SSE event data for useSSE:${channel}`,
						{
							error: error instanceof Error ? error.message : "Unknown error",
							rawData: event.data,
						},
					);
				}
			};

			eventSource.onerror = (error: Event) => {
				console.error(
					`[SSE Error] SSE connection error for useSSE:${channel}`,
					{ error },
				);
				setIsConnected(false);
				setConnectionState("error");
				onErrorRef.current?.(error);

				// Auto-reconnect logic
				if (
					autoReconnect &&
					reconnectAttemptsRef.current < maxReconnectAttempts
				) {
					reconnectAttemptsRef.current++;
					debugLog(
						`SSE reconnection attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts} for useSSE:${channel}`,
					);

					reconnectTimeoutRef.current = setTimeout(() => {
						if (eventSourceRef.current === null) {
							debugLog(`SSE attempting reconnection for useSSE:${channel}`);
							const reconnectUrl = `/api/events?channel=${encodeURIComponent(channel)}`;
							setConnectionState("connecting");

							try {
								const newEventSource = new EventSource(reconnectUrl);
								eventSourceRef.current = newEventSource;
								// Copy the same handlers for consistency
								newEventSource.onopen = eventSource.onopen;
								newEventSource.onmessage = eventSource.onmessage;
								newEventSource.onerror = eventSource.onerror;
								newEventSource.addEventListener("close", () => {
									setIsConnected(false);
									setConnectionState("disconnected");
									debugLog(`SSE connection closed for useSSE:${channel}`);
									onDisconnectRef.current?.();
								});
							} catch (reconnectError) {
								console.error(
									`[SSE Error] Failed to create SSE connection during reconnect for useSSE:${channel}`,
									{
										error:
											reconnectError instanceof Error
												? reconnectError.message
												: "Unknown error",
									},
								);
								setConnectionState("error");
							}
						}
					}, reconnectDelay * reconnectAttemptsRef.current);
				}
			};

			// Custom event listener for connection close
			eventSource.addEventListener("close", () => {
				setIsConnected(false);
				setConnectionState("disconnected");
				debugLog(`SSE connection closed for useSSE:${channel}`);
				onDisconnectRef.current?.();
			});
		} catch (error) {
			console.error(
				`[SSE Error] Failed to create SSE connection for useSSE:${channel}`,
				{
					error: error instanceof Error ? error.message : "Unknown error",
				},
			);
			setConnectionState("error");
		}

		// Cleanup function
		return () => {
			if (eventSourceRef.current) {
				eventSourceRef.current.close();
				eventSourceRef.current = null;
			}

			if (reconnectTimeoutRef.current) {
				clearTimeout(reconnectTimeoutRef.current);
				reconnectTimeoutRef.current = null;
			}

			debugLog(`SSE cleanup completed for useSSE:${channel}`);
		};
	}, [isMounted, channel]); // Remove handler dependencies to prevent reconnection loops

	return {
		isConnected,
		lastEvent,
		connectionState,
		disconnect,
		reconnect,
		isMounted,
	};
}

/**
 * Specialized hooks for common channels with hydration safety
 */
export function useJobSSE(
	onEvent: (event: SSEEvent) => void,
	options?: UseSSEOptions,
) {
	return useSSE(SSE_CHANNELS.JOBS, onEvent, options);
}

export function useFileSSE(
	onEvent: (event: SSEEvent) => void,
	options?: UseSSEOptions,
) {
	return useSSE(SSE_CHANNELS.FILES, onEvent, options);
}

export function useNodeSSE(
	onEvent: (event: SSEEvent) => void,
	options?: UseSSEOptions,
) {
	return useSSE(SSE_CHANNELS.NODES, onEvent, options);
}

export function useUserSSE(
	onEvent: (event: SSEEvent) => void,
	options?: UseSSEOptions,
) {
	return useSSE(SSE_CHANNELS.USERS, onEvent, options);
}

export function useSystemSSE(
	onEvent: (event: SSEEvent) => void,
	options?: UseSSEOptions,
) {
	return useSSE(SSE_CHANNELS.SYSTEM, onEvent, options);
}
