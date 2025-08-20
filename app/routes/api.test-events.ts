import type { Route } from "./+types/api.test-events";
import {
	emitSystemEvent,
	emitJobEvent,
} from "~/server/services/sse/sse.server";
import { getLogger } from "~/shared/core/logger/logger.server";

export async function action({ request }: Route.ActionArgs) {
	try {
		const body = await request.json();
		const { eventType, data } = body;

		getLogger().info("Test event triggered", {
			context: "api.test-events",
			eventType,
			data,
		});

		switch (eventType) {
			case "license_usage_updated":
				emitSystemEvent("license_usage_updated", {
					totalTokens: data.totalTokens || 50,
					usedTokens: data.usedTokens || Math.floor(Math.random() * 50) + 1,
					availableTokens:
						data.availableTokens || Math.floor(Math.random() * 50),
					runningJobs: data.runningJobs || [
						{ id: 1, name: "Test Job 1", cpu_cores: 4, tokens: 8 },
						{ id: 2, name: "Test Job 2", cpu_cores: 2, tokens: 5 },
					],
				});
				break;

			case "job_status_changed":
				emitJobEvent("job_status_changed", {
					jobId: data.jobId || Math.floor(Math.random() * 100) + 1,
					jobName:
						data.jobName || `Test Job ${Math.floor(Math.random() * 100) + 1}`,
					status: data.status || "running",
					nodeId: data.nodeId || 1,
					userId: data.userId || 1,
					cpuCores: data.cpuCores || 4,
					priority: data.priority || "normal",
				});
				break;

			case "connected":
				emitSystemEvent("connected", {
					channel: "system",
					timestamp: new Date().toISOString(),
				});
				break;

			case "ping":
				emitSystemEvent("ping", {
					timestamp: new Date().toISOString(),
				});
				break;

			default:
				return Response.json({ error: "Invalid event type" }, { status: 400 });
		}

		return Response.json({
			success: true,
			eventType,
			message: `${eventType} event emitted successfully`,
		});
	} catch (error) {
		getLogger().error("Test event error", {
			context: "api.test-events",
			error: error instanceof Error ? error.message : "Unknown error",
		});

		return Response.json(
			{
				error: "Failed to emit event",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
