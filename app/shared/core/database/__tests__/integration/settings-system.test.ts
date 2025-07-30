/**
 * Settings System Integration Tests
 * SQLiteの実際の機能を使用したシステムテスト
 */

import { describe, test, expect, beforeEach, afterAll } from "bun:test";
import {
	getTestDatabase,
	cleanupTestDatabase,
	closeTestDatabase,
	insertTestSettings,
	getMainSettingsForTest as getMainSettings,
	setMainSettingsForTest as setMainSettings,
	getSettingJsonPathForTest as getSettingJsonPath,
	setSettingJsonPathForTest as setSettingJsonPath,
} from "../setup/test-database";

describe("Settings System Integration Tests", () => {
	beforeEach(() => {
		cleanupTestDatabase();
	});

	afterAll(() => {
		closeTestDatabase();
	});

	describe("Database Table and Constraints", () => {
		test("should create app_settings table with JSON constraints", () => {
			const db = getTestDatabase();

			// テーブルが存在することを確認
			const tableExists = db
				.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='app_settings'
      `)
				.get() as { name: string } | undefined;

			expect(tableExists).toBeDefined();
			expect(tableExists?.name).toBe("app_settings");
		});

		test("should enforce JSON validation constraint", () => {
			const db = getTestDatabase();

			// 有効なJSONは挿入可能
			expect(() => {
				db.prepare("INSERT INTO app_settings (key, value) VALUES (?, ?)").run(
					"test_valid",
					'{"valid": "json"}',
				);
			}).not.toThrow();

			// 無効なJSONは制約違反で失敗
			expect(() => {
				db.prepare("INSERT INTO app_settings (key, value) VALUES (?, ?)").run(
					"test_invalid",
					"invalid-json",
				);
			}).toThrow();
		});

		test("should enforce primary key constraint on key field", () => {
			const db = getTestDatabase();

			// 最初の挿入は成功
			db.prepare("INSERT INTO app_settings (key, value) VALUES (?, ?)").run(
				"duplicate_key",
				'{"first": "insert"}',
			);

			// 同じキーでの挿入は制約違反
			expect(() => {
				db.prepare("INSERT INTO app_settings (key, value) VALUES (?, ?)").run(
					"duplicate_key",
					'{"second": "insert"}',
				);
			}).toThrow();
		});

		test("should support INSERT OR REPLACE for upsert operations", () => {
			const db = getTestDatabase();

			// 最初の挿入
			db.prepare(
				"INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)",
			).run("upsert_key", '{"version": 1}');

			// 同じキーで更新（REPLACE）
			db.prepare(
				"INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)",
			).run("upsert_key", '{"version": 2}');

			// 更新されたことを確認
			const result = db
				.prepare("SELECT value FROM app_settings WHERE key = ?")
				.get("upsert_key") as { value: string };

			const parsed = JSON.parse(result.value);
			expect(parsed.version).toBe(2);
		});
	});

	describe("SQLite JSON Functions", () => {
		test("should extract JSON values using json_extract", () => {
			const db = getTestDatabase();
			insertTestSettings();

			// json_extractを使用して特定の値を取得
			const licenseServer = db
				.prepare(`
        SELECT json_extract(value, '$.LICENSE_SERVER') as license_server
        FROM app_settings 
        WHERE key = ?
      `)
				.get("main_settings") as { license_server: string };

			expect(licenseServer.license_server).toBe("test-license-server");
		});

		test("should update JSON using json_patch", () => {
			const db = getTestDatabase();
			insertTestSettings();

			// json_patchを使用して部分更新
			db.prepare(`
        UPDATE app_settings 
        SET value = json_patch(value, ?),
            updated_at = CURRENT_TIMESTAMP
        WHERE key = ?
      `).run('{"MAX_UPLOAD_SIZE": 200}', "main_settings");

			// 更新確認
			const maxUploadSize = db
				.prepare(`
        SELECT json_extract(value, '$.MAX_UPLOAD_SIZE') as max_upload_size
        FROM app_settings 
        WHERE key = ?
      `)
				.get("main_settings") as { max_upload_size: number };

			expect(maxUploadSize.max_upload_size).toBe(200);

			// 他の値が変更されていないことを確認
			const licenseServer = db
				.prepare(`
        SELECT json_extract(value, '$.LICENSE_SERVER') as license_server
        FROM app_settings 
        WHERE key = ?
      `)
				.get("main_settings") as { license_server: string };

			expect(licenseServer.license_server).toBe("test-license-server");
		});

		test("should validate JSON structure with json_valid", () => {
			const db = getTestDatabase();

			// json_validを使用したvalidation
			const validJson = db
				.prepare("SELECT json_valid(?) as is_valid")
				.get('{"valid": "json"}') as { is_valid: number };

			const invalidJson = db
				.prepare("SELECT json_valid(?) as is_valid")
				.get("invalid-json") as { is_valid: number };

			expect(validJson.is_valid).toBe(1); // true
			expect(invalidJson.is_valid).toBe(0); // false
		});
	});

	describe("Timestamp Management", () => {
		test("should automatically set created_at and updated_at", () => {
			const db = getTestDatabase();

			db.prepare("INSERT INTO app_settings (key, value) VALUES (?, ?)").run(
				"timestamp_test",
				'{"test": "data"}',
			);

			const result = db
				.prepare(`
        SELECT created_at, updated_at 
        FROM app_settings 
        WHERE key = ?
      `)
				.get("timestamp_test") as { created_at: string; updated_at: string };

			expect(result.created_at).toBeDefined();
			expect(result.updated_at).toBeDefined();
			expect(result.created_at).toBe(result.updated_at); // 初回は同じ
		});

		test("should update updated_at on modification", async () => {
			const db = getTestDatabase();

			// 初期挿入
			db.prepare("INSERT INTO app_settings (key, value) VALUES (?, ?)").run(
				"update_test",
				'{"version": 1}',
			);

			// より確実な時間差を作るために少し長く待機
			await new Promise((resolve) => setTimeout(resolve, 1100));

			// 更新
			db.prepare(`
        UPDATE app_settings 
        SET value = ?, updated_at = CURRENT_TIMESTAMP
        WHERE key = ?
      `).run('{"version": 2}', "update_test");

			const result = db
				.prepare(`
        SELECT 
          value,
          datetime(created_at) as created_at,
          datetime(updated_at) as updated_at
        FROM app_settings 
        WHERE key = ?
      `)
				.get("update_test") as {
				value: string;
				created_at: string;
				updated_at: string;
			};

			const parsed = JSON.parse(result.value);
			expect(parsed.version).toBe(2);
			expect(result.updated_at).not.toBe(result.created_at);
		});
	});

	describe("Settings Operations Integration", () => {
		test("should store and retrieve main settings as JSON", () => {
			const testSettings = {
				MAX_UPLOAD_SIZE: 100 * 1024 * 1024,
				LICENSE_SERVER: "integration-test-server",
				AVAILABLE_LICENCE_TOKEN: 5,
			};

			// 設定保存
			setMainSettings(testSettings);

			// 設定取得
			const retrieved = getMainSettings();
			expect(retrieved).toEqual(testSettings);
		});

		test("should return default settings when no settings exist", () => {
			// 何も設定していない状態
			const defaultSettings = getMainSettings();

			// デフォルト値が返されることを確認
			expect(defaultSettings.MAX_UPLOAD_SIZE).toBe(100 * 1024 * 1024);
			expect(typeof defaultSettings.LICENSE_SERVER).toBe("string");
			expect(typeof defaultSettings.AVAILABLE_LICENCE_TOKEN).toBe("number");
		});

		test("should overwrite existing settings", () => {
			// 初期設定
			const initialSettings = {
				MAX_UPLOAD_SIZE: 50 * 1024 * 1024,
				LICENSE_SERVER: "initial-server",
				AVAILABLE_LICENCE_TOKEN: 3,
			};
			setMainSettings(initialSettings);

			// 新しい設定で上書き
			const newSettings = {
				MAX_UPLOAD_SIZE: 200 * 1024 * 1024,
				LICENSE_SERVER: "new-server",
				AVAILABLE_LICENCE_TOKEN: 10,
			};
			setMainSettings(newSettings);

			// 上書きされたことを確認
			const retrieved = getMainSettings();
			expect(retrieved).toEqual(newSettings);
			expect(retrieved).not.toEqual(initialSettings);
		});

		test("should persist settings across database operations", () => {
			const persistentSettings = {
				MAX_UPLOAD_SIZE: 150 * 1024 * 1024,
				LICENSE_SERVER: "persistent-server",
				AVAILABLE_LICENCE_TOKEN: 7,
			};

			setMainSettings(persistentSettings);

			// 別の操作を実行
			const db = getTestDatabase();
			db.prepare("INSERT INTO app_settings (key, value) VALUES (?, ?)").run(
				"other_setting",
				'{"test": "value"}',
			);

			// 元の設定が維持されていることを確認
			const retrieved = getMainSettings();
			expect(retrieved).toEqual(persistentSettings);
		});
	});

	describe("Advanced JSON Operations Integration", () => {
		test("should perform partial updates using json_patch", () => {
			// 初期設定
			const initialSettings = {
				MAX_UPLOAD_SIZE: 100 * 1024 * 1024,
				LICENSE_SERVER: "initial-server",
				AVAILABLE_LICENCE_TOKEN: 5,
			};
			setMainSettings(initialSettings);

			// SQLite json_patchを使用した部分更新
			const db = getTestDatabase();
			db.prepare(`
        UPDATE app_settings 
        SET value = json_patch(value, ?),
            updated_at = CURRENT_TIMESTAMP
        WHERE key = ?
      `).run(
				JSON.stringify({ MAX_UPLOAD_SIZE: 200 * 1024 * 1024 }),
				"main_settings",
			);

			// 部分更新の確認
			const updated = getMainSettings();
			expect(updated.MAX_UPLOAD_SIZE).toBe(200 * 1024 * 1024);
			expect(updated.LICENSE_SERVER).toBe("initial-server"); // 変更されない
			expect(updated.AVAILABLE_LICENCE_TOKEN).toBe(5); // 変更されない
		});

		test("should extract specific JSON paths using json_extract", () => {
			const testSettings = {
				MAX_UPLOAD_SIZE: 150 * 1024 * 1024,
				LICENSE_SERVER: "extract-test-server",
				AVAILABLE_LICENCE_TOKEN: 8,
			};
			setMainSettings(testSettings);

			const db = getTestDatabase();

			// 個別の値を抽出
			const licenseServer = db
				.prepare(`
        SELECT json_extract(value, '$.LICENSE_SERVER') as license_server
        FROM app_settings WHERE key = ?
      `)
				.get("main_settings") as { license_server: string };

			const uploadSize = db
				.prepare(`
        SELECT json_extract(value, '$.MAX_UPLOAD_SIZE') as upload_size
        FROM app_settings WHERE key = ?
      `)
				.get("main_settings") as { upload_size: number };

			const tokens = db
				.prepare(`
        SELECT json_extract(value, '$.AVAILABLE_LICENCE_TOKEN') as tokens
        FROM app_settings WHERE key = ?
      `)
				.get("main_settings") as { tokens: number };

			expect(licenseServer.license_server).toBe("extract-test-server");
			expect(uploadSize.upload_size).toBe(150 * 1024 * 1024);
			expect(tokens.tokens).toBe(8);
		});

		test("should handle multiple JSON patch operations", () => {
			const initialSettings = {
				MAX_UPLOAD_SIZE: 50 * 1024 * 1024,
				LICENSE_SERVER: "multi-patch-server",
				AVAILABLE_LICENCE_TOKEN: 2,
			};
			setMainSettings(initialSettings);

			const db = getTestDatabase();

			// 複数フィールドの一括更新
			const patchData = {
				MAX_UPLOAD_SIZE: 300 * 1024 * 1024,
				AVAILABLE_LICENCE_TOKEN: 15,
			};

			db.prepare(`
        UPDATE app_settings 
        SET value = json_patch(value, ?),
            updated_at = CURRENT_TIMESTAMP
        WHERE key = ?
      `).run(JSON.stringify(patchData), "main_settings");

			const updated = getMainSettings();
			expect(updated.MAX_UPLOAD_SIZE).toBe(300 * 1024 * 1024);
			expect(updated.LICENSE_SERVER).toBe("multi-patch-server"); // 変更されない
			expect(updated.AVAILABLE_LICENCE_TOKEN).toBe(15);
		});

		test("should validate JSON structure before updates", () => {
			setMainSettings({
				MAX_UPLOAD_SIZE: 100 * 1024 * 1024,
				LICENSE_SERVER: "validation-test",
				AVAILABLE_LICENCE_TOKEN: 1,
			});

			const db = getTestDatabase();

			// 有効なJSONパッチは成功
			expect(() => {
				db.prepare(`
          UPDATE app_settings 
          SET value = json_patch(value, ?),
              updated_at = CURRENT_TIMESTAMP
          WHERE key = ?
        `).run('{"LICENSE_SERVER": "new-server"}', "main_settings");
			}).not.toThrow();

			// 無効なJSONパッチは失敗
			expect(() => {
				db.prepare(`
          UPDATE app_settings 
          SET value = json_patch(value, ?),
              updated_at = CURRENT_TIMESTAMP
          WHERE key = ?
        `).run("invalid-json", "main_settings");
			}).toThrow();
		});

		test("should support complex JSON operations with nested structures", () => {
			// より複雑なJSONデータの場合をテスト
			const complexSettings = {
				MAX_UPLOAD_SIZE: 100 * 1024 * 1024,
				LICENSE_SERVER: "complex-server",
				AVAILABLE_LICENCE_TOKEN: 10,
				metadata: {
					version: "1.0",
					features: ["upload", "download", "streaming"],
				},
			};

			const db = getTestDatabase();

			// 複雑な構造でも保存・取得できることを確認
			db.prepare(`
        INSERT OR REPLACE INTO app_settings (key, value) 
        VALUES (?, ?)
      `).run("complex_settings", JSON.stringify(complexSettings));

			// ネストした値の抽出
			const version = db
				.prepare(`
        SELECT json_extract(value, '$.metadata.version') as version
        FROM app_settings WHERE key = ?
      `)
				.get("complex_settings") as { version: string };

			const features = db
				.prepare(`
        SELECT json_extract(value, '$.metadata.features') as features
        FROM app_settings WHERE key = ?
      `)
				.get("complex_settings") as { features: string };

			expect(version.version).toBe("1.0");
			expect(JSON.parse(features.features)).toEqual([
				"upload",
				"download",
				"streaming",
			]);
		});
	});

	describe("JSON Path Operations Integration", () => {
		test("should get specific JSON path values", () => {
			const testSettings = {
				MAX_UPLOAD_SIZE: 200 * 1024 * 1024,
				LICENSE_SERVER: "path-test-server",
				AVAILABLE_LICENCE_TOKEN: 12,
			};
			setMainSettings(testSettings);

			// 各フィールドをJSON pathで取得
			const uploadSize = getSettingJsonPath(
				"main_settings",
				"$.MAX_UPLOAD_SIZE",
			);
			const licenseServer = getSettingJsonPath(
				"main_settings",
				"$.LICENSE_SERVER",
			);
			const tokens = getSettingJsonPath(
				"main_settings",
				"$.AVAILABLE_LICENCE_TOKEN",
			);

			expect(uploadSize).toBe(200 * 1024 * 1024);
			expect(licenseServer).toBe("path-test-server");
			expect(tokens).toBe(12);
		});

		test("should return null for non-existent JSON paths", () => {
			setMainSettings({
				MAX_UPLOAD_SIZE: 100 * 1024 * 1024,
				LICENSE_SERVER: "test-server",
				AVAILABLE_LICENCE_TOKEN: 0,
			});

			// 存在しないパスは null を返す
			const nonExistent = getSettingJsonPath(
				"main_settings",
				"$.NON_EXISTENT_FIELD",
			);
			expect(nonExistent).toBeNull();

			// 深いネストした存在しないパスも null
			const deepNonExistent = getSettingJsonPath(
				"main_settings",
				"$.nested.deep.path",
			);
			expect(deepNonExistent).toBeNull();
		});

		test("should set specific JSON path values", () => {
			// 初期設定
			setMainSettings({
				MAX_UPLOAD_SIZE: 100 * 1024 * 1024,
				LICENSE_SERVER: "original-server",
				AVAILABLE_LICENCE_TOKEN: 5,
			});

			// 特定のフィールドのみ更新
			setSettingJsonPath("main_settings", "$.LICENSE_SERVER", "updated-server");
			setSettingJsonPath("main_settings", "$.AVAILABLE_LICENCE_TOKEN", 15);

			// 更新確認
			const updatedSettings = getMainSettings();
			expect(updatedSettings.MAX_UPLOAD_SIZE).toBe(100 * 1024 * 1024); // 変更されない
			expect(updatedSettings.LICENSE_SERVER).toBe("updated-server");
			expect(updatedSettings.AVAILABLE_LICENCE_TOKEN).toBe(15);
		});

		test("should handle complex JSON path operations", () => {
			// 複雑な構造のテストデータ
			const complexData = {
				MAX_UPLOAD_SIZE: 100 * 1024 * 1024,
				LICENSE_SERVER: "complex-server",
				AVAILABLE_LICENCE_TOKEN: 8,
				metadata: {
					version: "2.0",
					settings: {
						debug: true,
						logLevel: "info",
					},
					features: ["feature1", "feature2", "feature3"],
				},
			};

			const db = getTestDatabase();
			db.prepare(`
        INSERT OR REPLACE INTO app_settings (key, value) 
        VALUES (?, ?)
      `).run("complex_test", JSON.stringify(complexData));

			// ネストした値の取得
			const version = getSettingJsonPath("complex_test", "$.metadata.version");
			const debug = getSettingJsonPath(
				"complex_test",
				"$.metadata.settings.debug",
			);
			const firstFeature = getSettingJsonPath(
				"complex_test",
				"$.metadata.features[0]",
			);

			expect(version).toBe("2.0");
			expect(debug).toBe(1); // SQLite converts JSON boolean true to 1
			expect(firstFeature).toBe("feature1");

			// ネストした値の更新
			setSettingJsonPath("complex_test", "$.metadata.version", "2.1");
			setSettingJsonPath("complex_test", "$.metadata.settings.debug", false);

			// 更新確認
			const updatedVersion = getSettingJsonPath(
				"complex_test",
				"$.metadata.version",
			);
			const updatedDebug = getSettingJsonPath(
				"complex_test",
				"$.metadata.settings.debug",
			);

			expect(updatedVersion).toBe("2.1");
			expect(updatedDebug).toBe(0); // SQLite converts JSON boolean false to 0
		});

		test("should throw error when trying to set path on non-existent key", () => {
			// 存在しないキーに対するパス設定はエラー
			expect(() => {
				setSettingJsonPath("non_existent_key", "$.some.path", "value");
			}).toThrow("Setting key 'non_existent_key' does not exist");
		});

		test("should handle array operations in JSON paths", () => {
			const arrayData = {
				MAX_UPLOAD_SIZE: 100 * 1024 * 1024,
				LICENSE_SERVER: "array-test-server",
				AVAILABLE_LICENCE_TOKEN: 3,
				servers: ["server1", "server2", "server3"],
				configurations: [
					{ name: "config1", enabled: true },
					{ name: "config2", enabled: false },
				],
			};

			const db = getTestDatabase();
			db.prepare(`
        INSERT OR REPLACE INTO app_settings (key, value) 
        VALUES (?, ?)
      `).run("array_test", JSON.stringify(arrayData));

			// 配列要素の取得
			const firstServer = getSettingJsonPath("array_test", "$.servers[0]");
			const secondServer = getSettingJsonPath("array_test", "$.servers[1]");
			const configName = getSettingJsonPath(
				"array_test",
				"$.configurations[0].name",
			);
			const configEnabled = getSettingJsonPath(
				"array_test",
				"$.configurations[1].enabled",
			);

			expect(firstServer).toBe("server1");
			expect(secondServer).toBe("server2");
			expect(configName).toBe("config1");
			expect(configEnabled).toBe(0); // SQLite converts JSON boolean false to 0

			// 配列要素の更新
			setSettingJsonPath("array_test", "$.servers[1]", "updated-server2");
			setSettingJsonPath("array_test", "$.configurations[1].enabled", true);

			// 更新確認
			const updatedServer = getSettingJsonPath("array_test", "$.servers[1]");
			const updatedEnabled = getSettingJsonPath(
				"array_test",
				"$.configurations[1].enabled",
			);

			expect(updatedServer).toBe("updated-server2");
			expect(updatedEnabled).toBe(1); // SQLite converts JSON boolean true to 1
		});
	});

	// TODO: Integration Test: 複数設定カテゴリテスト
	// 将来的にmain_settings以外の設定カテゴリ（ui_settings, notification_settings等）が
	// 追加された場合のテストケースを実装する
});
