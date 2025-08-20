import { useCallback, useState } from "react";
import type { MetaFunction } from "react-router";
import { TestLayout } from "~/client/components/layout/TestLayout";
import {
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "~/client/components/ui";
import { SystemStatusBar } from "~/client/components/ui/SystemStatusBar";
import { useJobSSE, useSystemSSE } from "~/client/hooks/useSSE";
import type {
	JobSSEEvent,
	SystemSSEEvent,
} from "~/server/services/sse/sse-schemas";

export const meta: MetaFunction = () => {
	return [
		{ title: "SSE Test - Abaqus Job Manager" },
		{
			name: "description",
			content: "Testing Server-Sent Events functionality",
		},
	];
};

export default function TestSSE() {
	const [isLoading, setIsLoading] = useState<string | null>(null);
	const [lastResult, setLastResult] = useState<string>("");
	const [receivedEvents, setReceivedEvents] = useState<
		Array<{
			id: string;
			timestamp: string;
			channel: string;
			type: string;
			data: unknown;
		}>
	>([]);

	// SSE Event Handlers
	const handleSystemEvent = useCallback((event: SystemSSEEvent) => {
		const eventRecord = {
			id: `${Date.now()}-${Math.random()}`,
			timestamp: new Date().toISOString(),
			channel: "system",
			type: event.type,
			data: event.data,
		};
		setReceivedEvents((prev) => [eventRecord, ...prev.slice(0, 49)]); // Keep last 50 events
		console.log("📡 System SSE Event:", event);
	}, []);

	const handleJobEvent = useCallback((event: JobSSEEvent) => {
		const eventRecord = {
			id: `${Date.now()}-${Math.random()}`,
			timestamp: new Date().toISOString(),
			channel: "jobs",
			type: event.type,
			data: event.data,
		};
		setReceivedEvents((prev) => [eventRecord, ...prev.slice(0, 49)]);
		console.log("📡 Job SSE Event:", event);
	}, []);

	// SSE Hook Usage
	const systemSSE = useSystemSSE(handleSystemEvent, {
		autoReconnect: true,
		reconnectDelay: 3000,
		onConnect: () => console.log("🔗 System SSE Connected"),
		onDisconnect: () => console.log("🔌 System SSE Disconnected"),
		onError: (error) => console.error("❌ System SSE Error:", error),
	});

	const jobSSE = useJobSSE(handleJobEvent, {
		autoReconnect: true,
		reconnectDelay: 3000,
		onConnect: () => console.log("🔗 Job SSE Connected"),
		onDisconnect: () => console.log("🔌 Job SSE Disconnected"),
		onError: (error) => console.error("❌ Job SSE Error:", error),
	});

	const sendTestEvent = async (eventType: string, data: any = {}) => {
		setIsLoading(eventType);
		try {
			const response = await fetch("/api/test-events", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ eventType, data }),
			});

			const result = await response.json();

			if (response.ok) {
				setLastResult(`✅ ${result.message}`);
				console.log("Test event sent successfully:", result);
			} else {
				setLastResult(`❌ Error: ${result.error}`);
				console.error("Failed to send test event:", result);
			}
		} catch (error) {
			setLastResult(
				`❌ Network error: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
			console.error("Network error:", error);
		} finally {
			setIsLoading(null);
		}
	};

	const handleLicenseUpdate = () => {
		const totalTokens = 50;
		const usedTokens = Math.floor(Math.random() * totalTokens) + 1;
		const availableTokens = totalTokens - usedTokens;

		sendTestEvent("license_usage_updated", {
			totalTokens,
			usedTokens,
			availableTokens,
			runningJobs: [
				{ id: 1, name: "Test Job 1", cpu_cores: 4, tokens: 8 },
				{ id: 2, name: "Test Job 2", cpu_cores: 2, tokens: 5 },
			],
		});
	};

	const handleJobStatusUpdate = () => {
		const statuses = ["waiting", "running", "completed", "failed"] as const;
		const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
		sendTestEvent("job_status_changed", {
			jobId: Math.floor(Math.random() * 100) + 1,
			jobName: `Test Job ${Math.floor(Math.random() * 100) + 1}`,
			status: randomStatus,
			nodeId: 1,
			userId: 1,
			cpuCores: 4,
			priority: "normal",
		});
	};

	const handleConnectionTest = () => {
		sendTestEvent("connected", {
			channel: "system",
		});
	};

	const handlePingTest = () => {
		sendTestEvent("ping");
	};

	return (
		<TestLayout
			title="Server-Sent Events Test"
			description="Test real-time SSE functionality and event handling"
		>
			{/* System Status Bar for testing */}
			<Card className="mb-8">
				<CardHeader>
					<CardTitle>Live SystemStatusBar</CardTitle>
				</CardHeader>
				<CardContent>
					<SystemStatusBar initialLicenseUsed={5} initialLicenseTotal={12} />
					<p className="text-sm text-muted-foreground mt-2">
						Watch this status bar for real-time updates when testing License
						Update events.
					</p>
				</CardContent>
			</Card>

			<div className="space-y-8">
				{/* SSE Connection Status */}
				<Card>
					<CardHeader>
						<CardTitle>SSE Connection Status</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="flex items-center space-x-3">
								<div
									className={`w-3 h-3 rounded-full ${
										systemSSE.connectionState === "connected"
											? "bg-green-500"
											: systemSSE.connectionState === "connecting"
												? "bg-yellow-500"
												: systemSSE.connectionState === "error"
													? "bg-orange-500"
													: "bg-red-500"
									}`}
								/>
								<span className="text-sm">
									System SSE: <strong>{systemSSE.connectionState}</strong>
								</span>
							</div>
							<div className="flex items-center space-x-3">
								<div
									className={`w-3 h-3 rounded-full ${
										jobSSE.connectionState === "connected"
											? "bg-green-500"
											: jobSSE.connectionState === "connecting"
												? "bg-yellow-500"
												: jobSSE.connectionState === "error"
													? "bg-orange-500"
													: "bg-red-500"
									}`}
								/>
								<span className="text-sm">
									Jobs SSE: <strong>{jobSSE.connectionState}</strong>
								</span>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Received Events Display */}
				<Card>
					<CardHeader>
						<CardTitle>Received SSE Events ({receivedEvents.length})</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							<div className="flex justify-between items-center">
								<p className="text-sm text-muted-foreground">
									Live events received via useTypedSSE hooks
								</p>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setReceivedEvents([])}
								>
									Clear Events
								</Button>
							</div>
							<div className="max-h-64 overflow-y-auto border rounded-lg p-3 bg-muted/30">
								{receivedEvents.length === 0 ? (
									<p className="text-sm text-muted-foreground italic">
										No events received yet. Send test events below to see
										real-time updates.
									</p>
								) : (
									<div className="space-y-2">
										{receivedEvents.map((event) => (
											<div
												key={event.id}
												className="text-xs font-mono bg-background p-2 rounded border"
											>
												<div className="flex justify-between items-start mb-1">
													<span
														className={`px-2 py-1 rounded text-xs font-semibold ${
															event.channel === "system"
																? "bg-blue-100 text-blue-800"
																: event.channel === "jobs"
																	? "bg-green-100 text-green-800"
																	: "bg-gray-100 text-gray-800"
														}`}
													>
														{event.channel}:{event.type}
													</span>
													<span className="text-muted-foreground">
														{new Date(event.timestamp).toLocaleTimeString()}
													</span>
												</div>
												<pre className="text-xs overflow-x-auto">
													{JSON.stringify(event.data, null, 2)}
												</pre>
											</div>
										))}
									</div>
								)}
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Send Test Events</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<Button
								onClick={handleLicenseUpdate}
								className="w-full"
								disabled={isLoading !== null}
							>
								{isLoading === "license_usage_updated"
									? "Sending..."
									: "Send License Update"}
							</Button>

							<Button
								onClick={handleJobStatusUpdate}
								className="w-full"
								disabled={isLoading !== null}
							>
								{isLoading === "job_status_changed"
									? "Sending..."
									: "Send Job Status Update"}
							</Button>

							<Button
								onClick={handleConnectionTest}
								className="w-full"
								disabled={isLoading !== null}
							>
								{isLoading === "connected"
									? "Sending..."
									: "Send Connection Event"}
							</Button>

							<Button
								onClick={handlePingTest}
								className="w-full"
								disabled={isLoading !== null}
							>
								{isLoading === "ping" ? "Sending..." : "Send Ping Event"}
							</Button>
						</div>

						{/* Result display */}
						{lastResult && (
							<div className="mt-4 p-3 bg-muted rounded-lg">
								<h4 className="font-semibold mb-2">Last Action Result:</h4>
								<p className="text-sm font-mono">{lastResult}</p>
							</div>
						)}

						<div className="mt-6 p-4 bg-muted/30 rounded-lg">
							<h4 className="font-semibold mb-2">How to Test useTypedSSE:</h4>
							<ul className="list-disc list-inside space-y-1 text-sm">
								<li>
									<strong>Connection Status</strong>: Watch SSE connection
									states above (connected/connecting/error/disconnected)
								</li>
								<li>
									<strong>Real-time Events</strong>: Events appear immediately
									in the "Received SSE Events" section
								</li>
								<li>
									<strong>Type Safety</strong>: Events are properly typed based
									on channel (system/jobs)
								</li>
								<li>
									<strong>Network Tab</strong>: Check developer tools → Network
									→ see EventSource connections to /api/events
								</li>
								<li>
									<strong>Console Logs</strong>: Detailed SSE event logs with 📡
									prefix
								</li>
								<li>
									<strong>SystemStatusBar</strong>: Watch license numbers change
									in real-time from system events
								</li>
							</ul>
						</div>

						<div className="mt-4 p-4 bg-blue-50 rounded-lg">
							<h4 className="font-semibold mb-2">
								useTypedSSE Features Tested:
							</h4>
							<ul className="list-disc list-inside space-y-1 text-sm">
								<li>
									<strong>useSystemSSE</strong>: Receives license_usage_updated,
									connected, ping events
								</li>
								<li>
									<strong>useJobSSE</strong>: Receives job_status_changed events
								</li>
								<li>
									<strong>Auto-reconnection</strong>: Automatic reconnection on
									connection loss
								</li>
								<li>
									<strong>Type Safety</strong>: TypeScript ensures correct event
									data structure
								</li>
								<li>
									<strong>Event Logging</strong>: Real-time display of all
									received events with timestamps
								</li>
								<li>
									<strong>Connection Management</strong>: Visual connection
									state indicators
								</li>
							</ul>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>useTypedSSE Testing Summary</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-sm space-y-3">
							<p>
								This page now provides comprehensive testing of the{" "}
								<code className="bg-muted px-1 rounded">useTypedSSE</code> hook:
							</p>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<h5 className="font-semibold mb-2">✅ What's Working:</h5>
									<ul className="list-disc list-inside ml-4 space-y-1 text-xs">
										<li>Real-time SSE event reception</li>
										<li>Type-safe event handling</li>
										<li>Connection state management</li>
										<li>Auto-reconnection on errors</li>
										<li>Event logging and display</li>
									</ul>
								</div>
								<div>
									<h5 className="font-semibold mb-2">🔍 How to Verify:</h5>
									<ul className="list-disc list-inside ml-4 space-y-1 text-xs">
										<li>Send test events → see them appear instantly</li>
										<li>Check Network tab for EventSource connections</li>
										<li>Watch connection status indicators</li>
										<li>View TypeScript autocompletion in DevTools</li>
									</ul>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</TestLayout>
	);
}
