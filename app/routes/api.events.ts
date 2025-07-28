import type { Route } from "./+types/api.events";
import { getLogger } from "~/lib/core/logger/logger.server";
import { emitSystemEvent } from "~/lib/services/sse/sse.server";
import { getSSEEventEmitter } from "~/lib/services/sse/sse-event-emitter.server";
import {
	isValidChannel,
	type SSEChannel,
	type SSEEvent,
} from "~/lib/services/sse/sse-schemas";

export async function loader({ request }: Route.LoaderArgs) {
	const url = new URL(request.url);
	const channelParam = url.searchParams.get("channel") || "system";

	// チャンネル名のバリデーション
	if (!isValidChannel(channelParam)) {
		getLogger().warn("Invalid SSE channel requested", "api.events", {
			requestedChannel: channelParam,
			validChannels: ["files", "jobs", "nodes", "users", "system"],
		});
		return new Response("Invalid channel", { status: 400 });
	}

	const channel: SSEChannel = channelParam;

	// Create SSE response
	const stream = new ReadableStream({
		start(controller) {
			// Send initial connection message
			const encoder = new TextEncoder();

			// Send initial connection event
			const connectionEvent: SSEEvent = {
				type: "connected",
				channel,
				timestamp: new Date().toISOString(),
				data: { channel },
			};

			controller.enqueue(
				encoder.encode(`data: ${JSON.stringify(connectionEvent)}\n\n`),
			);
			getLogger().info("SSE connection established", "api.events", { channel });

			// Track connection state
			let isConnectionActive = true;

			// Set up event listener
			const listener = (eventData: unknown) => {
				// Check if connection is still active before sending
				if (!isConnectionActive) {
					getLogger().debug(
						"SSE data ignored - connection closed",
						"api.events",
						{ channel },
					);
					return;
				}

				try {
					const serializedData = JSON.stringify(eventData);
					controller.enqueue(encoder.encode(`data: ${serializedData}\n\n`));
					getLogger().debug("SSE data sent to client", "api.events", {
						channel,
						dataSize: serializedData.length,
					});
				} catch (error) {
					// Connection was likely closed
					if (
						error instanceof Error &&
						error.message.includes("ReadableStreamDefaultController")
					) {
						getLogger().debug(
							"SSE connection closed during data send",
							"api.events",
							{ channel },
						);
						isConnectionActive = false;
						// Remove this listener since connection is dead
						getSSEEventEmitter().off(channel, listener);
					} else {
						getLogger().error("Failed to send SSE data", "api.events", {
							channel,
							error: error instanceof Error ? error.message : "Unknown error",
						});
					}
				}
			};

			getSSEEventEmitter().on(channel, listener);
			getLogger().debug("SSE listener registered", "api.events", {
				channel,
				totalListeners: getSSEEventEmitter().getListenerCount(channel),
			});

			// Keep-alive ping every 30 seconds
			const keepAlive = setInterval(() => {
				if (!isConnectionActive) {
					clearInterval(keepAlive);
					return;
				}

				try {
					const pingEvent: SSEEvent = {
						type: "ping",
						channel,
						timestamp: new Date().toISOString(),
					};
					controller.enqueue(
						encoder.encode(`data: ${JSON.stringify(pingEvent)}\n\n`),
					);
					getLogger().debug("SSE ping sent", "api.events", { channel });
				} catch (error) {
					getLogger().debug(
						"SSE ping failed - connection closed",
						"api.events",
						{
							channel,
							error: error instanceof Error ? error.message : "Unknown error",
						},
					);
					isConnectionActive = false;
					clearInterval(keepAlive);
				}
			}, 30000);

			// Cleanup when connection closes
			request.signal?.addEventListener("abort", () => {
				isConnectionActive = false;
				clearInterval(keepAlive);
				getSSEEventEmitter().off(channel, listener);

				getLogger().info("SSE connection closed", "api.events", {
					channel,
					remainingListeners: getSSEEventEmitter().getListenerCount(channel),
				});

				// Emit disconnection event only if we can
				try {
					emitSystemEvent("disconnected", { channel });
				} catch (error) {
					getLogger().debug(
						"Could not emit disconnection event",
						"api.events",
						{
							channel,
							error: error instanceof Error ? error.message : "Unknown error",
						},
					);
				}

				try {
					controller.close();
				} catch {
					// Connection already closed
				}
			});
		},
	});

	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			Connection: "keep-alive",
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Headers": "Cache-Control",
		},
	});
}
