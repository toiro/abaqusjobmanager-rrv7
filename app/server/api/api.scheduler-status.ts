/**
 * Scheduler Status API Endpoint
 * 新Schedulerシステム対応版
 */

import type { Route } from "./+types/api.scheduler-status";
import { getSchedulerSystem } from "~/server/controller/scheduler-system";
import {
	createSuccessResponse,
	createErrorResponse,
} from "~/shared/core/types/api-routes";
import { authenticateAdmin } from "~/server/services/auth/auth";

/**
 * GET /api/scheduler-status
 * Returns comprehensive scheduler system status
 */
export async function loader({ request }: Route.LoaderArgs) {
	try {
		// Require admin authentication
		const authResult = await authenticateAdmin(request);
		if (!authResult || !("success" in authResult) || !authResult.success) {
			return createErrorResponse("Unauthorized", 401);
		}

		// Get new scheduler system status
		const schedulerSystem = getSchedulerSystem();
		const systemStatus = schedulerSystem.getStatus();

		// Calculate health summary
		const schedulers = Object.entries(systemStatus.schedulers);
		const totalSchedulers = schedulers.length;
		const runningCount = schedulers.filter(([_, s]) => s.running).length;
		const enabledCount = schedulers.filter(([_, s]) => s.enabled).length;

		const healthSummary = {
			totalSchedulers,
			enabledCount,
			runningCount,
			stoppedCount: enabledCount - runningCount,
			overallHealth: calculateOverallHealth(runningCount, enabledCount),
		};

		const response = {
			timestamp: new Date().toISOString(),
			system: {
				initialized: systemStatus.initialized,
				type: "new-scheduler-system",
			},
			summary: healthSummary,
			schedulers: schedulers.map(([name, scheduler]) => ({
				name,
				enabled: scheduler.enabled,
				running: scheduler.running,
				stats: scheduler.stats,
				health: {
					status: scheduler.enabled
						? scheduler.running
							? "healthy"
							: "stopped"
						: "disabled",
				},
			})),
		};

		return createSuccessResponse(response);
	} catch (error) {
		return createErrorResponse("Failed to get scheduler status", 500);
	}
}

/**
 * POST /api/scheduler-status
 * Control scheduler operations (start/stop/restart)
 */
export async function action({ request }: Route.ActionArgs) {
	try {
		// Require admin authentication
		const authResult = await authenticateAdmin(request);
		if (!authResult || !("success" in authResult) || !authResult.success) {
			return createErrorResponse("Unauthorized", 401);
		}

		const body = await request.json();
		const { action: schedulerAction, schedulerName } = body;

		if (!schedulerAction) {
			return createErrorResponse("Missing action parameter", 400);
		}

		const schedulerSystem = getSchedulerSystem();

		switch (schedulerAction) {
			case "stop-all":
				await schedulerSystem.stop();
				return createSuccessResponse({
					message: "All schedulers stopped",
					timestamp: new Date().toISOString(),
				});

			case "start-all":
				await schedulerSystem.start();
				return createSuccessResponse({
					message: "All schedulers started",
					timestamp: new Date().toISOString(),
				});

			case "get-scheduler": {
				if (!schedulerName) {
					return createErrorResponse("Missing schedulerName parameter", 400);
				}

				const scheduler = getSchedulerByName(schedulerSystem, schedulerName);
				if (!scheduler) {
					return createErrorResponse(
						`Scheduler '${schedulerName}' not found`,
						404,
					);
				}

				return createSuccessResponse({
					name: schedulerName,
					running: scheduler.isRunning(),
					stats: scheduler.getStats(),
					health: {
						status: scheduler.isRunning() ? "healthy" : "stopped",
					},
				});
			}

			case "stop-scheduler": {
				if (!schedulerName) {
					return createErrorResponse("Missing schedulerName parameter", 400);
				}

				const scheduler = getSchedulerByName(schedulerSystem, schedulerName);
				if (!scheduler) {
					return createErrorResponse(
						`Scheduler '${schedulerName}' not found`,
						404,
					);
				}

				await scheduler.stop();
				return createSuccessResponse({
					message: `Scheduler '${schedulerName}' stopped`,
					timestamp: new Date().toISOString(),
				});
			}

			case "start-scheduler": {
				if (!schedulerName) {
					return createErrorResponse("Missing schedulerName parameter", 400);
				}

				const scheduler = getSchedulerByName(schedulerSystem, schedulerName);
				if (!scheduler) {
					return createErrorResponse(
						`Scheduler '${schedulerName}' not found`,
						404,
					);
				}

				scheduler.start();
				return createSuccessResponse({
					message: `Scheduler '${schedulerName}' started`,
					timestamp: new Date().toISOString(),
				});
			}

			default:
				return createErrorResponse(`Unknown action: ${schedulerAction}`, 400);
		}
	} catch (error) {
		return createErrorResponse("Failed to execute scheduler action", 500);
	}
}

/**
 * Calculate overall system health
 */
function calculateOverallHealth(
	runningCount: number,
	enabledCount: number,
): "healthy" | "degraded" | "stopped" {
	if (enabledCount === 0) return "stopped";
	if (runningCount === 0) return "stopped";
	if (runningCount === enabledCount) return "healthy";
	return "degraded";
}

/**
 * Get scheduler by name from the new system
 */
function getSchedulerByName(
	system: ReturnType<typeof getSchedulerSystem>,
	name: string,
) {
	switch (name) {
		case "health-check":
			return system.getHealthCheckScheduler();
		case "sse-cleanup":
			return system.getSSECleanupScheduler();
		case "job-execution":
			return system.getJobExecutionScheduler();
		default:
			return null;
	}
}
