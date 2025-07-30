import type { MetaFunction } from "react-router";
import { useState } from "react";
import {
	Button,
	Card,
	CardHeader,
	CardTitle,
	CardContent,
} from "~/client/components/ui";
import { SystemStatusBar } from "~/client/components/ui/SystemStatusBar";
import { TestLayout } from "~/client/components/layout/TestLayout";

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
				<Card>
					<CardHeader>
						<CardTitle>SSE Event Testing</CardTitle>
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
							<h4 className="font-semibold mb-2">How to Test:</h4>
							<ul className="list-disc list-inside space-y-1 text-sm">
								<li>
									<strong>Network Tab</strong>: Check developer tools → Network
									→ see POST to /api/test-events
								</li>
								<li>
									<strong>EventStream</strong>: Look for
									/api/events?channel=system connection in Network tab
								</li>
								<li>
									<strong>SystemStatusBar</strong>: Watch license numbers change
									in real-time above
								</li>
								<li>
									<strong>Console</strong>: See event logs and success/error
									messages
								</li>
								<li>
									<strong>Result Display</strong>: Success/error feedback
									appears below buttons
								</li>
							</ul>
						</div>

						<div className="mt-4 p-4 bg-blue-50 rounded-lg">
							<h4 className="font-semibold mb-2">Expected Behavior:</h4>
							<ul className="list-disc list-inside space-y-1 text-sm">
								<li>
									<strong>License Update</strong>: Should update the license
									display in real-time
								</li>
								<li>
									<strong>Job Status Update</strong>: Should trigger events on
									the jobs channel
								</li>
								<li>
									<strong>Connection Event</strong>: Should show connection
									status changes
								</li>
								<li>
									<strong>Ping Event</strong>: Should maintain connection
									keep-alive
								</li>
							</ul>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>SSE Connection Status</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-sm space-y-2">
							<p>
								The SystemStatusBar above shows the real-time SSE connection
								status:
							</p>
							<ul className="list-disc list-inside ml-4 space-y-1">
								<li>
									<span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
									Connected: Real-time updates active
								</li>
								<li>
									<span className="inline-block w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
									Connecting: Establishing connection...
								</li>
								<li>
									<span className="inline-block w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
									Error: Connection error - retrying...
								</li>
								<li>
									<span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-2"></span>
									Disconnected: Manual refresh required
								</li>
							</ul>
						</div>
					</CardContent>
				</Card>
			</div>
		</TestLayout>
	);
}
