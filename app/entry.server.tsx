import { isbot } from "isbot";
import { renderToReadableStream } from "react-dom/server.bun";
import type { AppLoadContext, EntryContext } from "react-router";
import { ServerRouter } from "react-router";
import { initializeDatabase } from "./lib/database";

// データベース初期化（一度のみ実行）
let dbInitialized = false;
if (!dbInitialized) {
  try {
    initializeDatabase();
    dbInitialized = true;
    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Failed to initialize database:", error);
  }
}

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  _loadContext: AppLoadContext
) {
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
