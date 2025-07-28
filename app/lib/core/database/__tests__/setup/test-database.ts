/**
 * テスト用データベースセットアップ
 * Integration Tests用のSQLite環境を提供
 */

import { Database } from "bun:sqlite";

let testDb: Database | null = null;

/**
 * テスト用のmain_settings操作関数
 */
export function getMainSettingsForTest(): any {
	const db = getTestDatabase();
	const result = db
		.prepare("SELECT value FROM app_settings WHERE key = ?")
		.get("main_settings") as { value: string } | undefined;

	if (!result) {
		return {
			MAX_UPLOAD_SIZE: 100 * 1024 * 1024,
			LICENSE_SERVER: "",
			AVAILABLE_LICENCE_TOKEN: 0,
		};
	}

	return JSON.parse(result.value);
}

export function setMainSettingsForTest(settings: any): void {
	const db = getTestDatabase();
	const json = JSON.stringify(settings);

	db.prepare(`
    INSERT OR REPLACE INTO app_settings (key, value, updated_at) 
    VALUES (?, ?, CURRENT_TIMESTAMP)
  `).run("main_settings", json);
}

/**
 * テスト用JSON Path操作関数
 */
export function getSettingJsonPathForTest(key: string, path: string): any {
	const db = getTestDatabase();
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
}

export function setSettingJsonPathForTest(
	key: string,
	path: string,
	value: any,
): void {
	const db = getTestDatabase();

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
}

/**
 * テスト用SQLiteインメモリデータベースを取得
 */
export function getTestDatabase(): Database {
	if (!testDb) {
		testDb = new Database(":memory:");

		// 外部キー制約を有効化
		testDb.exec("PRAGMA foreign_keys = ON");

		// app_settingsテーブルを作成
		testDb.exec(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL CHECK (json_valid(value)),
        schema_version INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
	}

	return testDb;
}

/**
 * テストデータベースをクリーンアップ
 */
export function cleanupTestDatabase(): void {
	if (testDb) {
		testDb.exec("DELETE FROM app_settings");
	}
}

/**
 * テストデータベースを閉じる
 */
export function closeTestDatabase(): void {
	if (testDb) {
		testDb.close();
		testDb = null;
	}
}

/**
 * テスト用のサンプル設定データを挿入
 */
export function insertTestSettings(): void {
	const db = getTestDatabase();

	const mainSettings = {
		MAX_UPLOAD_SIZE: 100 * 1024 * 1024,
		LICENSE_SERVER: "test-license-server",
		AVAILABLE_LICENCE_TOKEN: 0,
	};

	db.prepare(`
    INSERT OR REPLACE INTO app_settings (key, value) 
    VALUES (?, ?)
  `).run("main_settings", JSON.stringify(mainSettings));
}
