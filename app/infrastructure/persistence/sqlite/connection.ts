/**
 * SQLite Database Connection Infrastructure
 * 
 * SQLite接続の管理とライフサイクル制御
 * Server-only: クライアントバンドルには含まれない
 */

import { Database } from "bun:sqlite";
import { env } from "../../../shared/core/env";

let db: Database | null = null;

/**
 * データベースインスタンスを取得（遅延初期化）
 */
export function getDatabase(): Database {
  if (!db) {
    db = connectDatabase(env.DATABASE_PATH);
  }

  return db;
}

/**
 * データベース接続を閉じる
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * データベース接続をリセット（テスト用）
 * 新しいデータベースインスタンスの作成を強制
 */
export function resetDatabase(): void {
  closeDatabase();
}

/**
 * データベースに接続
 * @private
 */
function connectDatabase(databasePath: string): Database {
  const database = new Database(databasePath);

  // 外部キー制約を有効化
  database.exec("PRAGMA foreign_keys = ON");

  // メモリDBでない場合はWALモードを使用（パフォーマンス向上）
  if (databasePath !== ":memory:") {
    database.exec("PRAGMA journal_mode = WAL");
  }
  
  return database;
}