import type { Route } from "./+types/api.test-events";
import { emitSystemEvent, emitJobEvent } from "~/lib/services/sse/sse";
import { getLogger } from "~/lib/core/logger";

export async function action({ request }: Route.ActionArgs) {
  try {
    const body = await request.json();
    const { eventType, data } = body;

    getLogger().info("Test event requested", "api.test-events", { eventType, data });

    switch (eventType) {
      case 'license_update':
        emitSystemEvent('license_update', {
          used: data.used || Math.floor(Math.random() * 12) + 1,
          total: data.total || 12,
          timestamp: new Date().toISOString()
        });
        break;

      case 'job_status_changed':
        emitJobEvent('job_status_changed', {
          jobId: data.jobId || Math.floor(Math.random() * 100) + 1,
          jobName: data.jobName || `Test Job ${Math.floor(Math.random() * 100) + 1}`,
          status: data.status || 'running',
          nodeId: data.nodeId || 1,
          userId: data.userId || 1,
          cpuCores: data.cpuCores || 4,
          priority: data.priority || 'normal'
        });
        break;

      case 'connected':
        emitSystemEvent('connected', {
          channel: 'system',
          timestamp: new Date().toISOString()
        });
        break;

      case 'ping':
        emitSystemEvent('ping', {
          timestamp: new Date().toISOString()
        });
        break;

      default:
        return Response.json({ error: 'Invalid event type' }, { status: 400 });
    }

    return Response.json({ 
      success: true, 
      eventType,
      message: `${eventType} event emitted successfully` 
    });

  } catch (error) {
    getLogger().error("Failed to emit test event", "api.test-events", {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return Response.json({ 
      error: 'Failed to emit event',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}