/**
 * Simple LogTape configuration for Abaqus Job Manager
 * Unified single logger approach
 */

import path from "node:path";
import { type FileSinkOptions, getFileSink } from "@logtape/file";
import {
	configureSync,
	getConsoleSink,
	getLogger,
	jsonLinesFormatter,
} from "@logtape/logtape";
import { env } from "../env";
/**
 * Initialize LogTape with simplified configuration
 * Server-only function - will not be included in client bundles
 */
export async function initializeLogger(): Promise<void> {
	try {
		if (env.LOG_FILE_ENABLED === "true") {
			const jsonFormatOption: FileSinkOptions = {
				formatter: jsonLinesFormatter,
			};

			configureSync({
				sinks: {
					console: getConsoleSink(),
					appFile: getFileSink(getLogPath("app.log"), jsonFormatOption),
					httpFile: getFileSink(getLogPath("http.log"), jsonFormatOption),
					errorFile: getFileSink(getLogPath("error.log")),
				},
				loggers: [
					{
						category: "app",
						lowestLevel: env.LOG_LEVEL,
						sinks: ["console", "appFile"],
					},
					{
						category: "http",
						lowestLevel: env.LOG_LEVEL,
						sinks: ["console", "httpFile"],
					},
					{
						category: "error",
						lowestLevel: "error",
						sinks: ["errorFile"],
					},
				],
			});
		}

		const rootLogger = getLogger("abaqus-job-manager");
		rootLogger.info("Logger initialized", {
			environment: "server",
			fileLogging: env.LOG_FILE_ENABLED === "true",
			logLevel: env.LOG_LEVEL,
		});
	} catch (error) {
		console.error("Failed to initialize LogTape:", error);
		console.warn("Falling back to console logging only");
	}
}

function getLogPath(fileName: string): string {
	return path.join(env.LOG_FILE_DIR, fileName);
}
