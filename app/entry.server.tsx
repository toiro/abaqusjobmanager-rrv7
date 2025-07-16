import { isbot } from "isbot";
import { renderToReadableStream } from "react-dom/server.bun";
import type { AppLoadContext, EntryContext } from "react-router";
import { ServerRouter } from "react-router";
import { initializeLogger, getLogger } from "~/lib/core/logger/logger.server";

// Initialize LogTape on server startup
let loggerInitialized = false;

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  _loadContext: AppLoadContext // eslint-disable-line @typescript-eslint/no-unused-vars
) {
  // Initialize logger once on server side
  if (!loggerInitialized) {
    try {
      await initializeLogger();
      loggerInitialized = true;
      
      // Log server startup info for development
      const port = process.env.PORT || 3000;
      const nodeEnv = process.env.NODE_ENV || 'development';
      
      getLogger().info('Development server started via entry.server.tsx', 'DEV_SERVER_STARTUP', {
        port,
        environment: nodeEnv,
        bunVersion: Bun.version,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Failed to initialize logger on server:", error);
    }
  }

  let shellRendered = false;
  const userAgent = request.headers.get("user-agent");

  const body = await renderToReadableStream(<ServerRouter context={routerContext} url={request.url} />, {
    onError(error: unknown) {
      responseStatusCode = 500;
      if (shellRendered) {
        console.error(error);
      }
    },
  });
  shellRendered = true;

  if ((userAgent && isbot(userAgent)) || routerContext.isSpaMode) {
    await body.allReady;
  }

  responseHeaders.set("Content-Type", "text/html");
  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}
