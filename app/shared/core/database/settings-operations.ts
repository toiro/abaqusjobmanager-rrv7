/**
 * Settings Operations
 * SQLite JSON機能を活用した型安全な設定管理システム
 */

import { getLogger } from "../logger/logger.server";
import {
	type MainSettings,
	type SettingKey,
	settingsSchemas,
} from "../types/app-settings";
import { getDatabase } from "./connection.server";

const logger = getLogger();

/**
 * main_settingsの取得
 * デフォルト値またはDBから取得し、Zodでバリデーション
 */
export function getMainSettings(): MainSettings {
	try {
		const db = getDatabase();
		const result = db
			.prepare("SELECT value FROM app_settings WHERE key = ?")
			.get("main_settings") as { value: string } | undefined;

		if (!result) {
			logger.debug(
				"SettingsOperations: No main_settings found, returning defaults",
			);

			// デフォルト値を返す（Zodスキーマのdefaultを使用）
			return settingsSchemas.main_settings.parse({
				LICENSE_SERVER: "",
			});
		}

		const parsed = JSON.parse(result.value);

		// Zodによるバリデーションとデフォルト値適用
		const validated = settingsSchemas.main_settings.parse(parsed);

		logger.debug("SettingsOperations: Main settings retrieved successfully", {
			hasLicenseServer: !!validated.LICENSE_SERVER,
			uploadSize: validated.MAX_UPLOAD_SIZE,
			tokens: validated.AVAILABLE_LICENCE_TOKEN,
		});

		return validated;
	} catch (error) {
		logger.error("SettingsOperations: Failed to get main settings", { error });

		// エラー時はデフォルト値を返す
		return settingsSchemas.main_settings.parse({
			LICENSE_SERVER: "",
		});
	}
}

/**
 * main_settingsの設定
 * Zodバリデーション後にJSONとして保存
 */
export function setMainSettings(settings: MainSettings): void {
	try {
		// Zodによるバリデーション
		const validated = settingsSchemas.main_settings.parse(settings);

		const db = getDatabase();
		const json = JSON.stringify(validated);

		db.prepare(`
      INSERT OR REPLACE INTO app_settings (key, value, updated_at) 
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `).run("main_settings", json);

		logger.info("SettingsOperations: Main settings updated successfully", {
			uploadSize: validated.MAX_UPLOAD_SIZE,
			licenseServer: validated.LICENSE_SERVER,
			tokens: validated.AVAILABLE_LICENCE_TOKEN,
		});
	} catch (error) {
		logger.error("SettingsOperations: Failed to set main settings", {
			error,
			settings,
		});
		throw error;
	}
}

/**
 * main_settingsの部分更新
 * SQLite json_patchを使用して効率的な部分更新
 */
export function updateMainSettings(
	partialSettings: Partial<MainSettings>,
): void {
	try {
		// 部分的なデータをバリデーション（必須フィールドなしでもOK）
		const partialSchema = settingsSchemas.main_settings.partial();
		const validated = partialSchema.parse(partialSettings);

		const db = getDatabase();
		const patchJson = JSON.stringify(validated);

		// 既存の設定が存在するか確認
		const existing = db
			.prepare("SELECT 1 FROM app_settings WHERE key = ?")
			.get("main_settings");

		if (!existing) {
			// 設定が存在しない場合は、デフォルト値とマージして新規作成
			const defaults = getMainSettings();
			const merged = { ...defaults, ...validated };
			setMainSettings(merged);
		} else {
			// json_patchで部分更新
			db.prepare(`
        UPDATE app_settings 
        SET value = json_patch(value, ?),
            updated_at = CURRENT_TIMESTAMP
        WHERE key = ?
      `).run(patchJson, "main_settings");
		}

		logger.info("SettingsOperations: Main settings updated partially", {
			updatedFields: Object.keys(validated),
		});
	} catch (error) {
		logger.error("SettingsOperations: Failed to update main settings", {
			error,
			partialSettings,
		});
		throw error;
	}
}

/**
 * 特定のJSON pathの値を取得
 * SQLite json_extractを使用
 */
export function getSettingJsonPath(key: SettingKey, path: string): any {
	try {
		const db = getDatabase();
		const result = db
			.prepare(`
      SELECT json_extract(value, ?) as extracted_value
      FROM app_settings 
      WHERE key = ?
    `)
			.get(path, key) as { extracted_value: any } | undefined;

		// SQLiteのjson_extractは存在しない場合のみnullを返す
		// 0やfalseの場合は実際の値を返すので、|| null は使わない
		return result ? result.extracted_value : null;
	} catch (error) {
		logger.error("SettingsOperations: Failed to get setting JSON path", {
			error,
			key,
			path,
		});
		return null;
	}
}

/**
 * 特定のJSON pathに値を設定
 * SQLite json_setを使用
 */
export function setSettingJsonPath(
	key: SettingKey,
	path: string,
	value: any,
): void {
	try {
		const db = getDatabase();

		// 設定が存在するか確認
		const existing = db
			.prepare("SELECT 1 FROM app_settings WHERE key = ?")
			.get(key);

		if (!existing) {
			throw new Error(`Setting key '${key}' does not exist`);
		}

		// SQLiteのjson_setは渡された値の型に応じて適切にJSONエンコードする
		// 文字列、数値、boolean、nullは直接渡す（JSON.stringifyは不要）
		const jsonValue = value;

		db.prepare(`
      UPDATE app_settings 
      SET value = json_set(value, ?, ?),
          updated_at = CURRENT_TIMESTAMP
      WHERE key = ?
    `).run(path, jsonValue, key);

		logger.debug("SettingsOperations: Setting JSON path updated", {
			key,
			path,
			value,
		});
	} catch (error) {
		logger.error("SettingsOperations: Failed to set setting JSON path", {
			error,
			key,
			path,
			value,
		});
		throw error;
	}
}

/**
 * 汎用設定取得関数
 * 型安全性を保ちながら任意の設定を取得
 */
export function getSettings<T>(key: SettingKey): T | null {
	try {
		const schema = settingsSchemas[key];
		if (!schema) {
			throw new Error(`Unknown setting key: ${key}`);
		}

		const db = getDatabase();
		const result = db
			.prepare("SELECT value FROM app_settings WHERE key = ?")
			.get(key) as { value: string } | undefined;

		if (!result) {
			return null;
		}

		const parsed = JSON.parse(result.value);
		const validated = schema.parse(parsed);

		return validated as T;
	} catch (error) {
		logger.error("SettingsOperations: Failed to get settings", { error, key });
		return null;
	}
}

/**
 * 汎用設定保存関数
 * 型安全性を保ちながら任意の設定を保存
 */
export function setSettings<T>(key: SettingKey, value: T): void {
	try {
		const schema = settingsSchemas[key];
		if (!schema) {
			throw new Error(`Unknown setting key: ${key}`);
		}

		// Zodによるバリデーション
		const validated = schema.parse(value);

		const db = getDatabase();
		const json = JSON.stringify(validated);

		db.prepare(`
      INSERT OR REPLACE INTO app_settings (key, value, updated_at) 
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `).run(key, json);

		logger.info("SettingsOperations: Settings updated", { key });
	} catch (error) {
		logger.error("SettingsOperations: Failed to set settings", {
			error,
			key,
			value,
		});
		throw error;
	}
}

// 便利なヘルパー関数群

/**
 * ライセンスサーバーの取得
 */
export function getLicenseServer(): string {
	const settings = getMainSettings();
	return settings.LICENSE_SERVER;
}

/**
 * ライセンスサーバーの設定
 */
export function setLicenseServer(server: string): void {
	updateMainSettings({ LICENSE_SERVER: server });
}

/**
 * 最大アップロードサイズの取得
 */
export function getMaxUploadSize(): number {
	const settings = getMainSettings();
	return settings.MAX_UPLOAD_SIZE;
}

/**
 * 最大アップロードサイズの設定
 */
export function setMaxUploadSize(size: number): void {
	updateMainSettings({ MAX_UPLOAD_SIZE: size });
}

/**
 * 利用可能ライセンストークン数の取得
 */
export function getAvailableLicenseTokens(): number {
	const settings = getMainSettings();
	return settings.AVAILABLE_LICENCE_TOKEN;
}

/**
 * 利用可能ライセンストークン数の設定
 */
export function setAvailableLicenseTokens(tokens: number): void {
	updateMainSettings({ AVAILABLE_LICENCE_TOKEN: tokens });
}
