import { z } from "zod";

const mainSettingsSchema = z.object({
	MAX_UPLOAD_SIZE: z
		.number()
		.min(0)
		.default(100 * 1024 * 1024),
	LICENSE_SERVER: z.string().min(1),
	AVAILABLE_LICENCE_TOKEN: z.number().min(0).default(0),
});

export type MainSettings = z.infer<typeof mainSettingsSchema>;

export const settingsSchemas = {
	main_settings: mainSettingsSchema,
} as const;

export type SettingKey = keyof typeof settingsSchemas;
