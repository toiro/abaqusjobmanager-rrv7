import { z } from "zod";

// スキーマ定義
const envSchema = z.object({
	// Core Application
	NODE_ENV: z
		.enum(["development", "production", "test"])
		.default("development"),
	PORT: z.coerce.number().min(1).max(65535).default(3000),
	DATABASE_PATH: z.string().default(":memory:"),

	// Authentication
	ADMIN_TOKEN: z.string().optional(),
	ADMIN_USERNAME: z.string().optional(),
	ADMIN_PASSWORD: z.string().optional(),

	// File Management
	UPLOADS_DIR: z.string().default("./uploads"),
	TEMP_DIR: z.string().default("./tmp"),

	// Scheduler System
	ENABLE_NODE_HEALTH_CHECK: z.enum(["true", "false"]).default("false"),
	HEALTH_CHECK_INTERVAL_MS: z.coerce.number().min(1000).default(30000),
	SSE_CLEANUP_INTERVAL_MS: z.coerce.number().min(1000).default(300000),
	ENABLE_JOB_EXECUTION: z.enum(["true", "false"]).default("false"),
	JOB_EXECUTION_INTERVAL_MS: z.coerce.number().min(1000).default(5000),

	// Logging
	LOG_FILE_ENABLED: z.enum(["true", "false"]).default("false"),
	LOG_FILE_DIR: z.string().default("./logs"),
	LOG_LEVEL: z
		.enum(["fatal", "error", "warning", "info", "debug", "trace"])
		.default("error"),
});

// スキーマに従って process.env を検証・変換
export const env = envSchema.parse(process.env);
