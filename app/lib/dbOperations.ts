/**
 * Database operations for core entities
 * Basic CRUD operations for jobs, nodes, files, and system config
 */

import { getDatabase } from "./database";
import type { Database } from "bun:sqlite";

// Type definitions
export interface Job {
  id?: number;
  name: string;
  status: 'waiting' | 'starting' | 'running' | 'completed' | 'failed' | 'missing';
  node_id?: number;
  file_id: number;
  user_id: number;
  cpu_cores: number;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  execution_order?: number;
  start_time?: string;
  end_time?: string;
  error_message?: string;
  output_file_path?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Node {
  id?: number;
  name: string;
  hostname: string;
  ssh_port?: number;
  max_cpu_cores: number;
  status: 'available' | 'high_load' | 'unavailable' | 'maintenance';
  current_cpu_usage?: number;
  current_license_usage?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface FileRecord {
  id?: number;
  original_name: string;
  stored_name: string;
  file_path: string;
  mime_type?: string;
  file_size: number;
  checksum?: string;
  uploaded_by?: string;
  created_at?: string;
}

export interface User {
  id?: number;
  display_name: string;
  max_concurrent_jobs: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface JobLog {
  id?: number;
  job_id: number;
  log_level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  details?: string;
  created_at?: string;
}

// Job Operations
export class JobOperations {
  private _db: Database | null = null;
  
  private get db(): Database {
    if (!this._db) {
      this._db = getDatabase();
    }
    return this._db;
  }
  
  // Reset connection for testing
  public resetConnection(): void {
    this._db = null;
  }

  create(job: Omit<Job, 'id' | 'created_at' | 'updated_at'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO jobs (name, status, node_id, file_id, user_id, cpu_cores, priority, execution_order, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      job.name,
      job.status,
      job.node_id || null,
      job.file_id,
      job.user_id,
      job.cpu_cores,
      job.priority || 'normal',
      job.execution_order || null,
      job.created_by || null
    );
    
    return result.lastInsertRowid as number;
  }

  findById(id: number): Job | null {
    const stmt = this.db.prepare("SELECT * FROM jobs WHERE id = ?");
    return stmt.get(id) as Job | null;
  }

  findAll(): Job[] {
    const stmt = this.db.prepare("SELECT * FROM jobs ORDER BY created_at DESC");
    return stmt.all() as Job[];
  }

  findByStatus(status: Job['status']): Job[] {
    const stmt = this.db.prepare("SELECT * FROM jobs WHERE status = ? ORDER BY created_at DESC");
    return stmt.all(status) as Job[];
  }

  updateStatus(id: number, status: Job['status'], errorMessage?: string): void {
    const stmt = this.db.prepare(`
      UPDATE jobs 
      SET status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(status, errorMessage || null, id);
  }

  assignToNode(id: number, nodeId: number): void {
    const stmt = this.db.prepare(`
      UPDATE jobs 
      SET node_id = ?, status = 'starting', start_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(nodeId, id);
  }

  markCompleted(id: number, outputFilePath?: string): void {
    const stmt = this.db.prepare(`
      UPDATE jobs 
      SET status = 'completed', end_time = CURRENT_TIMESTAMP, output_file_path = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(outputFilePath || null, id);
  }

  delete(id: number): void {
    const stmt = this.db.prepare("DELETE FROM jobs WHERE id = ?");
    stmt.run(id);
  }
}

// Node Operations
export class NodeOperations {
  private _db: Database | null = null;
  
  private get db(): Database {
    if (!this._db) {
      this._db = getDatabase();
    }
    return this._db;
  }
  
  // Reset connection for testing
  public resetConnection(): void {
    this._db = null;
  }

  create(node: Omit<Node, 'id' | 'created_at' | 'updated_at'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO nodes (name, hostname, ssh_port, max_cpu_cores, status, current_cpu_usage, current_license_usage, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      node.name,
      node.hostname,
      node.ssh_port || 22,
      node.max_cpu_cores,
      node.status,
      node.current_cpu_usage || 0,
      node.current_license_usage || 0,
      node.is_active !== false ? 1 : 0
    );
    
    return result.lastInsertRowid as number;
  }

  findById(id: number): Node | null {
    const stmt = this.db.prepare("SELECT * FROM nodes WHERE id = ?");
    return stmt.get(id) as Node | null;
  }

  findAll(): Node[] {
    const stmt = this.db.prepare("SELECT * FROM nodes ORDER BY name");
    return stmt.all() as Node[];
  }

  findActive(): Node[] {
    const stmt = this.db.prepare("SELECT * FROM nodes WHERE is_active = 1 ORDER BY name");
    return stmt.all() as Node[];
  }

  findAvailable(): Node[] {
    const stmt = this.db.prepare("SELECT * FROM nodes WHERE status = 'available' AND is_active = 1 ORDER BY name");
    return stmt.all() as Node[];
  }

  updateStatus(id: number, status: Node['status']): void {
    const stmt = this.db.prepare(`
      UPDATE nodes 
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(status, id);
  }

  updateResourceUsage(id: number, cpuUsage: number, licenseUsage: number): void {
    const stmt = this.db.prepare(`
      UPDATE nodes 
      SET current_cpu_usage = ?, current_license_usage = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(cpuUsage, licenseUsage, id);
  }

  deactivate(id: number): void {
    const stmt = this.db.prepare(`
      UPDATE nodes 
      SET is_active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(id);
  }

  activate(id: number): void {
    const stmt = this.db.prepare(`
      UPDATE nodes 
      SET is_active = 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(id);
  }
}

// File Operations
export class FileOperations {
  private _db: Database | null = null;
  
  private get db(): Database {
    if (!this._db) {
      this._db = getDatabase();
    }
    return this._db;
  }
  
  // Reset connection for testing
  public resetConnection(): void {
    this._db = null;
  }

  create(file: Omit<FileRecord, 'id' | 'created_at'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO files (original_name, stored_name, file_path, mime_type, file_size, checksum, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      file.original_name,
      file.stored_name,
      file.file_path,
      file.mime_type || null,
      file.file_size,
      file.checksum || null,
      file.uploaded_by || null
    );
    
    return result.lastInsertRowid as number;
  }

  findById(id: number): FileRecord | null {
    const stmt = this.db.prepare("SELECT * FROM files WHERE id = ?");
    return stmt.get(id) as FileRecord | null;
  }

  findAll(): FileRecord[] {
    const stmt = this.db.prepare("SELECT * FROM files ORDER BY created_at DESC");
    return stmt.all() as FileRecord[];
  }

  delete(id: number): void {
    const stmt = this.db.prepare("DELETE FROM files WHERE id = ?");
    stmt.run(id);
  }
}

// User Operations
export class UserOperations {
  private _db: Database | null = null;
  
  private get db(): Database {
    if (!this._db) {
      this._db = getDatabase();
    }
    return this._db;
  }
  
  // Reset connection for testing
  public resetConnection(): void {
    this._db = null;
  }

  create(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): number {
    // Validate display_name (folder-safe, 2+ characters)
    if (!user.display_name || user.display_name.length < 2) {
      throw new Error('Display name must be at least 2 characters long');
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(user.display_name)) {
      throw new Error('Display name can only contain alphanumeric characters, underscores, and hyphens');
    }
    
    const stmt = this.db.prepare(`
      INSERT INTO users (display_name, max_concurrent_jobs, is_active)
      VALUES (?, ?, ?)
    `);
    
    const result = stmt.run(
      user.display_name,
      user.max_concurrent_jobs,
      user.is_active !== false ? 1 : 0
    );
    
    return result.lastInsertRowid as number;
  }

  findById(id: number): User | null {
    const stmt = this.db.prepare("SELECT * FROM users WHERE id = ?");
    return stmt.get(id) as User | null;
  }

  findByDisplayName(displayName: string): User | null {
    const stmt = this.db.prepare("SELECT * FROM users WHERE display_name = ?");
    return stmt.get(displayName) as User | null;
  }

  findAll(): User[] {
    const stmt = this.db.prepare("SELECT * FROM users ORDER BY display_name");
    return stmt.all() as User[];
  }

  findActive(): User[] {
    const stmt = this.db.prepare("SELECT * FROM users WHERE is_active = 1 ORDER BY display_name");
    return stmt.all() as User[];
  }

  updateMaxConcurrentJobs(id: number, maxJobs: number): void {
    const stmt = this.db.prepare(`
      UPDATE users 
      SET max_concurrent_jobs = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(maxJobs, id);
  }

  activate(id: number): void {
    const stmt = this.db.prepare(`
      UPDATE users 
      SET is_active = 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(id);
  }

  deactivate(id: number): void {
    const stmt = this.db.prepare(`
      UPDATE users 
      SET is_active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(id);
  }

  getCurrentJobCount(userId: number): number {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count 
      FROM jobs 
      WHERE user_id = ? 
      AND status IN ('starting', 'running')
    `);
    const result = stmt.get(userId) as { count: number };
    return result.count;
  }

  canCreateJob(userId: number): boolean {
    const user = this.findById(userId);
    if (!user || !user.is_active) return false;
    
    const currentJobs = this.getCurrentJobCount(userId);
    return currentJobs < user.max_concurrent_jobs;
  }

  delete(id: number): void {
    const stmt = this.db.prepare("DELETE FROM users WHERE id = ?");
    stmt.run(id);
  }
}

// Job Log Operations
export class JobLogOperations {
  private _db: Database | null = null;
  
  private get db(): Database {
    if (!this._db) {
      this._db = getDatabase();
    }
    return this._db;
  }
  
  // Reset connection for testing
  public resetConnection(): void {
    this._db = null;
  }

  create(log: Omit<JobLog, 'id' | 'created_at'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO job_logs (job_id, log_level, message, details)
      VALUES (?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      log.job_id,
      log.log_level,
      log.message,
      log.details || null
    );
    
    return result.lastInsertRowid as number;
  }

  findByJobId(jobId: number): JobLog[] {
    const stmt = this.db.prepare("SELECT * FROM job_logs WHERE job_id = ? ORDER BY created_at DESC");
    return stmt.all(jobId) as JobLog[];
  }

  findByLogLevel(logLevel: JobLog['log_level']): JobLog[] {
    const stmt = this.db.prepare("SELECT * FROM job_logs WHERE log_level = ? ORDER BY created_at DESC");
    return stmt.all(logLevel) as JobLog[];
  }
}

// Singleton instances
export const jobOps = new JobOperations();
export const nodeOps = new NodeOperations();
export const fileOps = new FileOperations();
export const userOps = new UserOperations();
export const jobLogOps = new JobLogOperations();

/**
 * Reset all database connections (for testing)
 */
export function resetAllConnections(): void {
  jobOps.resetConnection();
  nodeOps.resetConnection();
  fileOps.resetConnection();
  userOps.resetConnection();
  jobLogOps.resetConnection();
}