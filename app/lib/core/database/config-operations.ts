import { getDatabase } from "./connection.server";

/**
 * Simple system configuration functions
 * Basic implementation for license management
 */
export function getSystemConfig(key: string): string | null {
  try {
    const db = getDatabase();
    
    // First check if system_config table exists
    const tableCheck = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='system_config'
    `).get();
    
    if (!tableCheck) {
      console.error(`system_config table does not exist`);
      return null;
    }
    
    const stmt = db.prepare("SELECT value FROM system_config WHERE key = ?");
    const result = stmt.get(key) as { value: string } | undefined;
    
    if (!result) {
      console.warn(`System config key '${key}' not found in database`);
      return null;
    }
    
    return result.value;
  } catch (error) {
    console.error(`Failed to get system config '${key}':`, error);
    return null;
  }
}

export function setSystemConfig(key: string, value: string): void {
  try {
    const db = getDatabase();
    const stmt = db.prepare("INSERT OR REPLACE INTO system_config (key, value) VALUES (?, ?)");
    stmt.run(key, value);
  } catch {
    // Ignore errors for now
  }
}
