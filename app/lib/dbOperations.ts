/**
 * Type-safe database operations with Generics
 * Enhanced CRUD operations using the new type-safe repository pattern
 */

import { getDatabase } from "./database";
import type { Database } from "bun:sqlite";
import { 
  Job, 
  Node, 
  User,
  FileRecord,
  JobLog,
  JobSchema, 
  NodeSchema,
  UserSchema,
  FileRecordSchema,
  JobLogSchema,
  type TypedRepository,
  type TypedJobOperations,
  type DatabaseResult,
  type BaseEntity
} from "./types/database";

// Re-export types for components
export type { Job, Node, User, FileRecord, JobLog } from "./types/database";
import { logger } from "./logger/logger";

// All entity types are now imported from database.ts

// Base repository implementation with Generics
abstract class BaseRepository<TEntity extends BaseEntity, TCreateInput, TUpdateInput> implements TypedRepository<TEntity, TCreateInput, TUpdateInput> {
  protected _db: Database | null = null;
  protected abstract tableName: string;
  protected abstract schema: any;
  
  protected get db(): Database {
    if (!this._db) {
      this._db = getDatabase();
    }
    return this._db;
  }
  
  public resetConnection(): void {
    this._db = null;
  }

  abstract findAll(): TEntity[];
  abstract findById(id: number): TEntity | null;
  abstract create(data: TCreateInput): number;
  abstract update(id: number, data: TUpdateInput): boolean;
  abstract delete(id: number): boolean;

  findBy<K extends keyof TEntity>(field: K, value: TEntity[K]): TEntity[] {
    try {
      const stmt = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE ${String(field)} = ?`);
      // Handle null/undefined values for SQLite - cast to valid SQLite type
      const bindValue = value === undefined ? null : (value as any);
      const results = stmt.all(bindValue);
      return this.validateResults(results);
    } catch (error) {
      logger.error(`Failed to find ${this.tableName} by ${String(field)}`, 'BaseRepository', error);
      return [];
    }
  }

  validate(data: unknown): TEntity | null {
    if (!this.schema) {
      return data as TEntity; // Fallback for entities without schema
    }
    
    try {
      const result = this.schema.safeParse(data);
      return result.success ? result.data : null;
    } catch (error) {
      logger.error(`Validation failed for ${this.tableName}`, 'BaseRepository', error);
      return null;
    }
  }

  protected validateResults(results: unknown[]): TEntity[] {
    if (!this.schema) {
      return results as TEntity[]; // Fallback for entities without schema
    }
    
    return results
      .map(result => this.validate(result))
      .filter((item): item is TEntity => item !== null);
  }

  protected validateSingleResult(result: unknown): TEntity | null {
    if (!result) return null;
    
    if (!this.schema) {
      return result as TEntity; // Fallback for entities without schema
    }
    
    return this.validate(result);
  }
}

// Enhanced Job Operations with type safety
export class JobOperations extends BaseRepository<
  Job, 
  Omit<Job, 'id' | 'created_at' | 'updated_at'>, 
  Partial<Omit<Job, 'id' | 'created_at' | 'updated_at'>>
> implements TypedJobOperations {
  protected tableName = 'jobs';
  protected schema = JobSchema;

  create(job: Omit<Job, 'id' | 'created_at' | 'updated_at'>): number {
    try {
      const validatedJob = this.schema.omit({ id: true, created_at: true, updated_at: true }).parse(job);
      
      const stmt = this.db.prepare(`
        INSERT INTO jobs (name, status, node_id, file_id, user_id, cpu_cores, priority)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        validatedJob.name,
        validatedJob.status,
        validatedJob.node_id || null,
        validatedJob.file_id,
        validatedJob.user_id,
        validatedJob.cpu_cores,
        validatedJob.priority || 'normal'
      );
      
      const insertId = result.lastInsertRowid as number;
      logger.info('Job created successfully', 'JobOperations', { jobId: insertId, name: validatedJob.name });
      return insertId;
    } catch (error) {
      logger.error('Failed to create job', 'JobOperations', { job, error });
      throw new Error(`Failed to create job: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  findById(id: number): Job | null {
    try {
      const stmt = this.db.prepare("SELECT * FROM jobs WHERE id = ?");
      const result = stmt.get(id);
      return this.validateSingleResult(result);
    } catch (error) {
      logger.error('Failed to find job by id', 'JobOperations', { id, error });
      return null;
    }
  }

  findAll(): Job[] {
    try {
      const stmt = this.db.prepare("SELECT * FROM jobs ORDER BY created_at DESC");
      const results = stmt.all();
      return this.validateResults(results);
    } catch (error) {
      logger.error('Failed to find all jobs', 'JobOperations', error);
      return [];
    }
  }

  findByStatus(status: Job['status']): Job[] {
    try {
      const stmt = this.db.prepare("SELECT * FROM jobs WHERE status = ? ORDER BY created_at DESC");
      const results = stmt.all(status);
      return this.validateResults(results);
    } catch (error) {
      logger.error('Failed to find jobs by status', 'JobOperations', { status, error });
      return [];
    }
  }

  findByUser(userId: number): Job[] {
    try {
      const stmt = this.db.prepare("SELECT * FROM jobs WHERE user_id = ? ORDER BY created_at DESC");
      const results = stmt.all(userId);
      return this.validateResults(results);
    } catch (error) {
      logger.error('Failed to find jobs by user', 'JobOperations', { userId, error });
      return [];
    }
  }

  findByNode(nodeId: number): Job[] {
    try {
      const stmt = this.db.prepare("SELECT * FROM jobs WHERE node_id = ? ORDER BY created_at DESC");
      const results = stmt.all(nodeId);
      return this.validateResults(results);
    } catch (error) {
      logger.error('Failed to find jobs by node', 'JobOperations', { nodeId, error });
      return [];
    }
  }

  updateStatus(id: number, status: Job['status'], errorMessage?: string): boolean {
    try {
      const stmt = this.db.prepare(`
        UPDATE jobs 
        SET status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      const result = stmt.run(status, errorMessage || null, id);
      const success = result.changes > 0;
      
      if (success) {
        logger.info('Job status updated', 'JobOperations', { id, status, errorMessage });
      } else {
        logger.warn('Job status update affected no rows', 'JobOperations', { id, status });
      }
      
      return success;
    } catch (error) {
      logger.error('Failed to update job status', 'JobOperations', { id, status, error });
      return false;
    }
  }

  update(id: number, data: Partial<Omit<Job, 'id' | 'created_at' | 'updated_at'>>): boolean {
    try {
      const validatedData = this.schema.omit({ id: true, created_at: true, updated_at: true }).partial().parse(data);
      
      const fields = Object.keys(validatedData).filter(key => validatedData[key as keyof typeof validatedData] !== undefined);
      if (fields.length === 0) {
        logger.warn('No valid fields to update', 'JobOperations', { id, data });
        return false;
      }
      
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const values = fields.map(field => {
        const val = validatedData[field as keyof typeof validatedData];
        return val === undefined ? null : val;
      });
      
      const sql = `UPDATE jobs SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      
      const stmt = this.db.prepare(sql);
      const result = stmt.run(...values, id);
      const success = result.changes > 0;
      
      if (success) {
        logger.info('Job updated successfully', 'JobOperations', { id, fields });
      } else {
        logger.warn('Job update affected no rows', 'JobOperations', { id, sql, values });
      }
      
      return success;
    } catch (error) {
      logger.error('Failed to update job', 'JobOperations', { id, data, error });
      return false;
    }
  }

  assignToNode(id: number, nodeId: number): boolean {
    try {
      const stmt = this.db.prepare(`
        UPDATE jobs 
        SET node_id = ?, status = 'starting', start_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      const result = stmt.run(nodeId, id);
      const success = result.changes > 0;
      
      if (success) {
        logger.info('Job assigned to node', 'JobOperations', { id, nodeId });
      } else {
        logger.warn('Job assignment affected no rows', 'JobOperations', { id, nodeId });
      }
      
      return success;
    } catch (error) {
      logger.error('Failed to assign job to node', 'JobOperations', { id, nodeId, error });
      return false;
    }
  }

  markCompleted(id: number, outputFilePath?: string): boolean {
    try {
      const stmt = this.db.prepare(`
        UPDATE jobs 
        SET status = 'completed', end_time = CURRENT_TIMESTAMP, output_file_path = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      const result = stmt.run(outputFilePath || null, id);
      const success = result.changes > 0;
      
      if (success) {
        logger.info('Job marked as completed', 'JobOperations', { id, outputFilePath });
      } else {
        logger.warn('Job completion update affected no rows', 'JobOperations', { id });
      }
      
      return success;
    } catch (error) {
      logger.error('Failed to mark job as completed', 'JobOperations', { id, error });
      return false;
    }
  }

  delete(id: number): boolean {
    try {
      const stmt = this.db.prepare("DELETE FROM jobs WHERE id = ?");
      const result = stmt.run(id);
      const success = result.changes > 0;
      
      if (success) {
        logger.info('Job deleted successfully', 'JobOperations', { id });
      } else {
        logger.warn('Job deletion affected no rows', 'JobOperations', { id });
      }
      
      return success;
    } catch (error) {
      logger.error('Failed to delete job', 'JobOperations', { id, error });
      return false;
    }
  }
}

// Enhanced Node Operations with type safety
export class NodeOperations extends BaseRepository<
  Node, 
  Omit<Node, 'id' | 'created_at' | 'updated_at'>, 
  Partial<Omit<Node, 'id' | 'created_at' | 'updated_at'>>
> {
  protected tableName = 'nodes';
  protected schema = NodeSchema;

  create(node: Omit<Node, 'id' | 'created_at' | 'updated_at'>): number {
    try {
      const validatedNode = this.schema.omit({ id: true, created_at: true, updated_at: true }).parse(node);
      
      const stmt = this.db.prepare(`
        INSERT INTO nodes (name, hostname, ssh_port, max_cpu_cores, is_active)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        validatedNode.name,
        validatedNode.hostname,
        validatedNode.ssh_port || 22,
        validatedNode.max_cpu_cores,
        validatedNode.is_active !== false ? 1 : 0
      );
      
      const insertId = result.lastInsertRowid as number;
      logger.info('Node created successfully', 'NodeOperations', { nodeId: insertId, name: validatedNode.name });
      return insertId;
    } catch (error) {
      logger.error('Failed to create node', 'NodeOperations', { node, error });
      throw new Error(`Failed to create node: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  findById(id: number): Node | null {
    try {
      const stmt = this.db.prepare("SELECT * FROM nodes WHERE id = ?");
      const result = stmt.get(id);
      return this.validateSingleResult(result);
    } catch (error) {
      logger.error('Failed to find node by id', 'NodeOperations', { id, error });
      return null;
    }
  }

  findAll(): Node[] {
    try {
      const stmt = this.db.prepare("SELECT * FROM nodes ORDER BY name");
      const results = stmt.all();
      return this.validateResults(results);
    } catch (error) {
      logger.error('Failed to find all nodes', 'NodeOperations', error);
      return [];
    }
  }

  findActive(): Node[] {
    try {
      const stmt = this.db.prepare("SELECT * FROM nodes WHERE is_active = 1 ORDER BY name");
      const results = stmt.all();
      return this.validateResults(results);
    } catch (error) {
      logger.error('Failed to find active nodes', 'NodeOperations', error);
      return [];
    }
  }


  update(id: number, data: Partial<Omit<Node, 'id' | 'created_at' | 'updated_at'>>): boolean {
    try {
      const validatedData = this.schema.omit({ id: true, created_at: true, updated_at: true }).partial().parse(data);
      
      const fields = Object.keys(validatedData).filter(key => validatedData[key as keyof typeof validatedData] !== undefined);
      if (fields.length === 0) {
        logger.warn('No valid fields to update', 'NodeOperations', { id, data });
        return false;
      }
      
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const values = fields.map(field => {
        const val = validatedData[field as keyof typeof validatedData];
        return val === undefined ? null : val;
      });
      
      const stmt = this.db.prepare(`
        UPDATE nodes 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      
      const result = stmt.run(...values, id);
      const success = result.changes > 0;
      
      if (success) {
        logger.info('Node updated successfully', 'NodeOperations', { id, fields });
      } else {
        logger.warn('Node update affected no rows', 'NodeOperations', { id });
      }
      
      return success;
    } catch (error) {
      logger.error('Failed to update node', 'NodeOperations', { id, data, error });
      return false;
    }
  }


  deactivate(id: number): boolean {
    try {
      const stmt = this.db.prepare(`
        UPDATE nodes 
        SET is_active = 0, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      const result = stmt.run(id);
      const success = result.changes > 0;
      
      if (success) {
        logger.info('Node deactivated', 'NodeOperations', { id });
      } else {
        logger.warn('Node deactivation affected no rows', 'NodeOperations', { id });
      }
      
      return success;
    } catch (error) {
      logger.error('Failed to deactivate node', 'NodeOperations', { id, error });
      return false;
    }
  }

  activate(id: number): boolean {
    try {
      const stmt = this.db.prepare(`
        UPDATE nodes 
        SET is_active = 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      const result = stmt.run(id);
      const success = result.changes > 0;
      
      if (success) {
        logger.info('Node activated', 'NodeOperations', { id });
      } else {
        logger.warn('Node activation affected no rows', 'NodeOperations', { id });
      }
      
      return success;
    } catch (error) {
      logger.error('Failed to activate node', 'NodeOperations', { id, error });
      return false;
    }
  }

  delete(id: number): boolean {
    try {
      const stmt = this.db.prepare("DELETE FROM nodes WHERE id = ?");
      const result = stmt.run(id);
      const success = result.changes > 0;
      
      if (success) {
        logger.info('Node deleted successfully', 'NodeOperations', { id });
      } else {
        logger.warn('Node deletion affected no rows', 'NodeOperations', { id });
      }
      
      return success;
    } catch (error) {
      logger.error('Failed to delete node', 'NodeOperations', { id, error });
      return false;
    }
  }
}

// File Operations with basic type safety
export class FileOperations extends BaseRepository<
  FileRecord, 
  Omit<FileRecord, 'id' | 'created_at' | 'updated_at'>, 
  Partial<Omit<FileRecord, 'id' | 'created_at' | 'updated_at'>>
> {
  protected tableName = 'files';
  protected schema = FileRecordSchema;

  create(file: Omit<FileRecord, 'id' | 'created_at'>): number {
    try {
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
      
      const insertId = result.lastInsertRowid as number;
      logger.info('File created successfully', 'FileOperations', { fileId: insertId, originalName: file.original_name });
      return insertId;
    } catch (error) {
      logger.error('Failed to create file', 'FileOperations', { file, error });
      throw new Error(`Failed to create file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  findById(id: number): FileRecord | null {
    try {
      const stmt = this.db.prepare("SELECT * FROM files WHERE id = ?");
      const result = stmt.get(id);
      return result as FileRecord | null; // No schema validation yet
    } catch (error) {
      logger.error('Failed to find file by id', 'FileOperations', { id, error });
      return null;
    }
  }

  findAll(): FileRecord[] {
    try {
      const stmt = this.db.prepare("SELECT * FROM files ORDER BY created_at DESC");
      const results = stmt.all();
      return results as FileRecord[]; // No schema validation yet
    } catch (error) {
      logger.error('Failed to find all files', 'FileOperations', error);
      return [];
    }
  }

  update(id: number, data: Partial<Omit<FileRecord, 'id' | 'created_at'>>): boolean {
    try {
      const fields = Object.keys(data).filter(key => data[key as keyof typeof data] !== undefined);
      if (fields.length === 0) {
        logger.warn('No valid fields to update', 'FileOperations', { id, data });
        return false;
      }
      
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const values = fields.map(field => {
        const val = data[field as keyof typeof data];
        return val === undefined ? null : val;
      });
      
      const stmt = this.db.prepare(`UPDATE files SET ${setClause} WHERE id = ?`);
      const result = stmt.run(...values, id);
      const success = result.changes > 0;
      
      if (success) {
        logger.info('File updated successfully', 'FileOperations', { id, fields });
      } else {
        logger.warn('File update affected no rows', 'FileOperations', { id });
      }
      
      return success;
    } catch (error) {
      logger.error('Failed to update file', 'FileOperations', { id, data, error });
      return false;
    }
  }

  delete(id: number): boolean {
    try {
      const stmt = this.db.prepare("DELETE FROM files WHERE id = ?");
      const result = stmt.run(id);
      const success = result.changes > 0;
      
      if (success) {
        logger.info('File deleted successfully', 'FileOperations', { id });
      } else {
        logger.warn('File deletion affected no rows', 'FileOperations', { id });
      }
      
      return success;
    } catch (error) {
      logger.error('Failed to delete file', 'FileOperations', { id, error });
      return false;
    }
  }
}

// Enhanced User Operations with type safety
export class UserOperations extends BaseRepository<
  User, 
  Omit<User, 'id' | 'created_at' | 'updated_at'>, 
  Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>
> {
  protected tableName = 'users';
  protected schema = UserSchema;

  create(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): number {
    try {
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
      
      const insertId = result.lastInsertRowid as number;
      logger.info('User created successfully', 'UserOperations', { userId: insertId, displayName: user.display_name });
      return insertId;
    } catch (error) {
      logger.error('Failed to create user', 'UserOperations', { user, error });
      throw error;
    }
  }

  findById(id: number): User | null {
    try {
      const stmt = this.db.prepare("SELECT * FROM users WHERE id = ?");
      const result = stmt.get(id);
      return result as User | null; // No schema validation yet
    } catch (error) {
      logger.error('Failed to find user by id', 'UserOperations', { id, error });
      return null;
    }
  }

  findByDisplayName(displayName: string): User | null {
    try {
      const stmt = this.db.prepare("SELECT * FROM users WHERE display_name = ?");
      const result = stmt.get(displayName);
      return result as User | null; // No schema validation yet
    } catch (error) {
      logger.error('Failed to find user by display name', 'UserOperations', { displayName, error });
      return null;
    }
  }

  findAll(): User[] {
    try {
      const stmt = this.db.prepare("SELECT * FROM users ORDER BY display_name");
      const results = stmt.all();
      return results as User[]; // No schema validation yet
    } catch (error) {
      logger.error('Failed to find all users', 'UserOperations', error);
      return [];
    }
  }

  findActive(): User[] {
    try {
      const stmt = this.db.prepare("SELECT * FROM users WHERE is_active = 1 ORDER BY display_name");
      const results = stmt.all();
      return results as User[]; // No schema validation yet
    } catch (error) {
      logger.error('Failed to find active users', 'UserOperations', error);
      return [];
    }
  }

  update(id: number, data: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>): boolean {
    try {
      const fields = Object.keys(data).filter(key => data[key as keyof typeof data] !== undefined);
      if (fields.length === 0) {
        logger.warn('No valid fields to update', 'UserOperations', { id, data });
        return false;
      }
      
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const values = fields.map(field => {
        const val = data[field as keyof typeof data];
        return val === undefined ? null : val;
      });
      
      const stmt = this.db.prepare(`
        UPDATE users 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      
      const result = stmt.run(...values, id);
      const success = result.changes > 0;
      
      if (success) {
        logger.info('User updated successfully', 'UserOperations', { id, fields });
      } else {
        logger.warn('User update affected no rows', 'UserOperations', { id });
      }
      
      return success;
    } catch (error) {
      logger.error('Failed to update user', 'UserOperations', { id, data, error });
      return false;
    }
  }

  updateMaxConcurrentJobs(id: number, maxJobs: number): boolean {
    try {
      const stmt = this.db.prepare(`
        UPDATE users 
        SET max_concurrent_jobs = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      const result = stmt.run(maxJobs, id);
      const success = result.changes > 0;
      
      if (success) {
        logger.info('User max concurrent jobs updated', 'UserOperations', { id, maxJobs });
      } else {
        logger.warn('User max concurrent jobs update affected no rows', 'UserOperations', { id });
      }
      
      return success;
    } catch (error) {
      logger.error('Failed to update user max concurrent jobs', 'UserOperations', { id, maxJobs, error });
      return false;
    }
  }

  activate(id: number): boolean {
    try {
      const stmt = this.db.prepare(`
        UPDATE users 
        SET is_active = 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      const result = stmt.run(id);
      const success = result.changes > 0;
      
      if (success) {
        logger.info('User activated', 'UserOperations', { id });
      } else {
        logger.warn('User activation affected no rows', 'UserOperations', { id });
      }
      
      return success;
    } catch (error) {
      logger.error('Failed to activate user', 'UserOperations', { id, error });
      return false;
    }
  }

  deactivate(id: number): boolean {
    try {
      const stmt = this.db.prepare(`
        UPDATE users 
        SET is_active = 0, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      const result = stmt.run(id);
      const success = result.changes > 0;
      
      if (success) {
        logger.info('User deactivated', 'UserOperations', { id });
      } else {
        logger.warn('User deactivation affected no rows', 'UserOperations', { id });
      }
      
      return success;
    } catch (error) {
      logger.error('Failed to deactivate user', 'UserOperations', { id, error });
      return false;
    }
  }

  getCurrentJobCount(userId: number): number {
    try {
      const stmt = this.db.prepare(`
        SELECT COUNT(*) as count 
        FROM jobs 
        WHERE user_id = ? 
        AND status IN ('starting', 'running')
      `);
      const result = stmt.get(userId) as { count: number };
      return result.count;
    } catch (error) {
      logger.error('Failed to get current job count', 'UserOperations', { userId, error });
      return 0;
    }
  }

  canCreateJob(userId: number): boolean {
    try {
      const user = this.findById(userId);
      if (!user || !user.is_active) return false;
      
      const currentJobs = this.getCurrentJobCount(userId);
      return currentJobs < user.max_concurrent_jobs;
    } catch (error) {
      logger.error('Failed to check if user can create job', 'UserOperations', { userId, error });
      return false;
    }
  }

  delete(id: number): boolean {
    try {
      const stmt = this.db.prepare("DELETE FROM users WHERE id = ?");
      const result = stmt.run(id);
      const success = result.changes > 0;
      
      if (success) {
        logger.info('User deleted successfully', 'UserOperations', { id });
      } else {
        logger.warn('User deletion affected no rows', 'UserOperations', { id });
      }
      
      return success;
    } catch (error) {
      logger.error('Failed to delete user', 'UserOperations', { id, error });
      return false;
    }
  }
}

// Enhanced Job Log Operations with type safety
export class JobLogOperations extends BaseRepository<
  JobLog, 
  Omit<JobLog, 'id' | 'created_at'>, 
  Partial<Omit<JobLog, 'id' | 'created_at'>>
> {
  protected tableName = 'job_logs';
  protected schema = JobLogSchema;

  create(log: Omit<JobLog, 'id' | 'created_at'>): number {
    try {
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
      
      const insertId = result.lastInsertRowid as number;
      logger.debug('Job log created successfully', 'JobLogOperations', { logId: insertId, jobId: log.job_id });
      return insertId;
    } catch (error) {
      logger.error('Failed to create job log', 'JobLogOperations', { log, error });
      throw new Error(`Failed to create job log: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  findById(id: number): JobLog | null {
    try {
      const stmt = this.db.prepare("SELECT * FROM job_logs WHERE id = ?");
      const result = stmt.get(id);
      return result as JobLog | null; // No schema validation yet
    } catch (error) {
      logger.error('Failed to find job log by id', 'JobLogOperations', { id, error });
      return null;
    }
  }

  findAll(): JobLog[] {
    try {
      const stmt = this.db.prepare("SELECT * FROM job_logs ORDER BY created_at DESC");
      const results = stmt.all();
      return results as JobLog[]; // No schema validation yet
    } catch (error) {
      logger.error('Failed to find all job logs', 'JobLogOperations', error);
      return [];
    }
  }

  findByJobId(jobId: number): JobLog[] {
    try {
      const stmt = this.db.prepare("SELECT * FROM job_logs WHERE job_id = ? ORDER BY created_at DESC");
      const results = stmt.all(jobId);
      return results as JobLog[]; // No schema validation yet
    } catch (error) {
      logger.error('Failed to find job logs by job id', 'JobLogOperations', { jobId, error });
      return [];
    }
  }

  findByLogLevel(logLevel: JobLog['log_level']): JobLog[] {
    try {
      const stmt = this.db.prepare("SELECT * FROM job_logs WHERE log_level = ? ORDER BY created_at DESC");
      const results = stmt.all(logLevel);
      return results as JobLog[]; // No schema validation yet
    } catch (error) {
      logger.error('Failed to find job logs by log level', 'JobLogOperations', { logLevel, error });
      return [];
    }
  }

  update(id: number, data: Partial<Omit<JobLog, 'id' | 'created_at'>>): boolean {
    try {
      const fields = Object.keys(data).filter(key => data[key as keyof typeof data] !== undefined);
      if (fields.length === 0) {
        logger.warn('No valid fields to update', 'JobLogOperations', { id, data });
        return false;
      }
      
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const values = fields.map(field => {
        const val = data[field as keyof typeof data];
        return val === undefined ? null : val;
      });
      
      const stmt = this.db.prepare(`UPDATE job_logs SET ${setClause} WHERE id = ?`);
      const result = stmt.run(...values, id);
      const success = result.changes > 0;
      
      if (success) {
        logger.info('Job log updated successfully', 'JobLogOperations', { id, fields });
      } else {
        logger.warn('Job log update affected no rows', 'JobLogOperations', { id });
      }
      
      return success;
    } catch (error) {
      logger.error('Failed to update job log', 'JobLogOperations', { id, data, error });
      return false;
    }
  }

  delete(id: number): boolean {
    try {
      const stmt = this.db.prepare("DELETE FROM job_logs WHERE id = ?");
      const result = stmt.run(id);
      const success = result.changes > 0;
      
      if (success) {
        logger.info('Job log deleted successfully', 'JobLogOperations', { id });
      } else {
        logger.warn('Job log deletion affected no rows', 'JobLogOperations', { id });
      }
      
      return success;
    } catch (error) {
      logger.error('Failed to delete job log', 'JobLogOperations', { id, error });
      return false;
    }
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