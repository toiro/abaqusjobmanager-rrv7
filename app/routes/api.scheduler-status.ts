/**
 * Scheduler Status API Endpoint
 * Provides comprehensive scheduler system monitoring
 */

import type { Route } from "./+types/api.scheduler-status";
import { getSchedulerSystemStatus } from "~/lib/services/scheduler-system";
import { SchedulerRegistry } from "~/lib/services/scheduler";
import { createSuccessResponse, createErrorResponse } from "~/lib/core/types/api-routes";
import { authenticateAdmin } from "~/lib/services/auth/auth";

/**
 * GET /api/scheduler-status
 * Returns comprehensive scheduler system status
 */
export async function loader({ request }: Route.LoaderArgs) {
  try {
    // Require admin authentication
    const authResult = await authenticateAdmin(request);
    if (!authResult || !('success' in authResult) || !authResult.success) {
      return createErrorResponse('Unauthorized', 401);
    }

    // Get comprehensive scheduler status
    const systemStatus = getSchedulerSystemStatus();
    const allSchedulers = SchedulerRegistry.getAll();
    
    // Get detailed health information
    const schedulerHealth = allSchedulers.map(scheduler => ({
      name: scheduler.getStats().name,
      health: scheduler.getHealth(),
      stats: scheduler.getStats(),
      isRunning: scheduler.isRunning()
    }));

    // Calculate system health summary
    const healthSummary = {
      totalSchedulers: allSchedulers.length,
      healthyCount: schedulerHealth.filter(s => s.health.status === 'healthy').length,
      degradedCount: schedulerHealth.filter(s => s.health.status === 'degraded').length,
      unhealthyCount: schedulerHealth.filter(s => s.health.status === 'unhealthy').length,
      stoppedCount: schedulerHealth.filter(s => s.health.status === 'stopped').length,
      overallHealth: calculateOverallHealth(schedulerHealth)
    };

    const response = {
      timestamp: new Date().toISOString(),
      system: systemStatus.system,
      summary: healthSummary,
      schedulers: schedulerHealth,
      registry: SchedulerRegistry.getOverallStats()
    };

    return createSuccessResponse(response);

  } catch (error) { // eslint-disable-line @typescript-eslint/no-unused-vars
    return createErrorResponse(
      'Failed to get scheduler status',
      500
    );
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
    if (!authResult || !('success' in authResult) || !authResult.success) {
      return createErrorResponse('Unauthorized', 401);
    }

    const body = await request.json();
    const { action: schedulerAction, schedulerName } = body;

    if (!schedulerAction) {
      return createErrorResponse('Missing action parameter', 400);
    }

    switch (schedulerAction) {
      case 'stop-all':
        await SchedulerRegistry.stopAll();
        return createSuccessResponse({ 
          message: 'All schedulers stopped',
          timestamp: new Date().toISOString()
        });

      case 'get-scheduler': {
        if (!schedulerName) {
          return createErrorResponse('Missing schedulerName parameter', 400);
        }
        
        const scheduler = SchedulerRegistry.getByName(schedulerName);
        if (!scheduler) {
          return createErrorResponse(`Scheduler '${schedulerName}' not found`, 404);
        }

        return createSuccessResponse({
          name: schedulerName,
          health: scheduler.getHealth(),
          stats: scheduler.getStats(),
          isRunning: scheduler.isRunning()
        });
      }

      case 'stop-scheduler': {
        if (!schedulerName) {
          return createErrorResponse('Missing schedulerName parameter', 400);
        }
        
        const schedulerToStop = SchedulerRegistry.getByName(schedulerName);
        if (!schedulerToStop) {
          return createErrorResponse(`Scheduler '${schedulerName}' not found`, 404);
        }

        await schedulerToStop.stop();
        return createSuccessResponse({ 
          message: `Scheduler '${schedulerName}' stopped`,
          timestamp: new Date().toISOString()
        });
      }

      case 'start-scheduler': {
        if (!schedulerName) {
          return createErrorResponse('Missing schedulerName parameter', 400);
        }
        
        const schedulerToStart = SchedulerRegistry.getByName(schedulerName);
        if (!schedulerToStart) {
          return createErrorResponse(`Scheduler '${schedulerName}' not found`, 404);
        }

        schedulerToStart.start();
        return createSuccessResponse({ 
          message: `Scheduler '${schedulerName}' started`,
          timestamp: new Date().toISOString()
        });
      }

      default:
        return createErrorResponse(`Unknown action: ${schedulerAction}`, 400);
    }

  } catch (error) { // eslint-disable-line @typescript-eslint/no-unused-vars
    return createErrorResponse(
      'Failed to execute scheduler action',
      500
    );
  }
}

/**
 * Calculate overall system health based on individual scheduler health
 */
function calculateOverallHealth(schedulerHealth: any[]): 'healthy' | 'degraded' | 'unhealthy' | 'stopped' {
  if (schedulerHealth.length === 0) return 'stopped';
  
  const stoppedCount = schedulerHealth.filter(s => s.health.status === 'stopped').length;
  const unhealthyCount = schedulerHealth.filter(s => s.health.status === 'unhealthy').length;
  const degradedCount = schedulerHealth.filter(s => s.health.status === 'degraded').length;
  
  // If all schedulers are stopped
  if (stoppedCount === schedulerHealth.length) return 'stopped';
  
  // If any scheduler is unhealthy
  if (unhealthyCount > 0) return 'unhealthy';
  
  // If more than half are degraded or stopped
  if ((degradedCount + stoppedCount) > schedulerHealth.length / 2) return 'degraded';
  
  // If any scheduler is degraded
  if (degradedCount > 0) return 'degraded';
  
  return 'healthy';
}