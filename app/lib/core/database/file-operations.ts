/**
 * Simple, direct file record database operations
 */

import { FileRecordSchema, type FileRecord } from "../types/database";
import { validateData, selectQuery, executeQuery, buildUpdateSQL, handleDbError, logDbSuccess, safeDbOperation } from "./db-utils";
import { getDatabase } from "./connection.server";
import { emitFileCreated, emitFileUpdated, emitFileDeleted } from "../../services/sse/sse.server";
import type { FileEventData } from "../../services/sse/sse-schemas";
import { getLogger } from "../logger/logger.server";

export type CreateFileInput = Omit<FileRecord, 'id' | 'created_at' | 'updated_at'>;
export type UpdateFileInput = Partial<CreateFileInput>;

// Extended file record with referencing job information
export interface FileWithJobs extends FileRecord {
  referencingJobs: Array<{
    jobId: number;
    jobName: string;
    jobStatus: string;
    jobOwner: string;
    createdAt: string;
  }>;
}

/**
 * Convert FileRecord to FileEventData for SSE events
 */
function fileToEventData(file: FileRecord): FileEventData {
  return {
    fileId: file.id,
    fileName: file.original_name,
    fileSize: file.file_size,
    mimeType: file.mime_type || undefined,
    uploadedBy: file.uploaded_by || undefined
  };
}

/**
 * Create a new file record
 */
export function createFileRecord(data: CreateFileInput): number {
  try {
    const validated = validateData(
      FileRecordSchema.omit({ id: true, created_at: true, updated_at: true }), 
      data
    );
    
    const sql = `
      INSERT INTO files (original_name, stored_name, file_path, file_size, mime_type, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      validated.original_name,
      validated.stored_name,
      validated.file_path,
      validated.file_size,
      validated.mime_type || 'application/octet-stream',
      validated.uploaded_by
    ];
    
    const result = executeQuery(sql, params);
    if (!result.success) {
      throw new Error(result.error || 'Failed to create file record');
    }
    
    const fileId = result.result.lastInsertRowid as number;
    logDbSuccess('File record created', { 
      fileId, 
      originalName: validated.original_name,
      fileSize: validated.file_size 
    });
    
    // Emit SSE event for real-time updates
    const createdFile = findFileById(fileId);
    if (createdFile) {
      emitFileCreated(fileToEventData(createdFile));
    }
    
    return fileId;
  } catch (error) {
    handleDbError(error, 'create file record', { data });
  }
}

/**
 * Find file record by ID
 */
export function findFileById(id: number): FileRecord | null {
  try {
    return selectQuery(
      "SELECT * FROM files WHERE id = ?",
      [id],
      FileRecordSchema,
      true,
      'Database'
    ) as FileRecord | null;
  } catch (error) {
    handleDbError(error, 'find file by id', { id });
  }
}

/**
 * Find all file records
 */
export function findAllFiles(): FileRecord[] {
  return safeDbOperation(
    () => selectQuery(
      "SELECT * FROM files ORDER BY created_at DESC",
      [],
      FileRecordSchema,
      false,
      'Database'
    ) as FileRecord[],
    'find all files',
    []
  );
}

/**
 * Find files by uploader
 */
export function findFilesByUploader(uploadedBy: string): FileRecord[] {
  try {
    return selectQuery(
      "SELECT * FROM files WHERE uploaded_by = ? ORDER BY created_at DESC",
      [uploadedBy],
      FileRecordSchema,
      false,
      'Database'
    ) as FileRecord[];
  } catch (error) {
    handleDbError(error, 'find files by uploader', { uploadedBy });
  }
}

/**
 * Find file by stored name
 */
export function findFileByStoredName(storedName: string): FileRecord | null {
  try {
    return selectQuery(
      "SELECT * FROM files WHERE stored_name = ?",
      [storedName],
      FileRecordSchema,
      true,
      'Database'
    ) as FileRecord | null;
  } catch (error) {
    handleDbError(error, 'find file by stored name', { storedName });
  }
}

/**
 * Update file record
 */
export function updateFileRecord(id: number, data: UpdateFileInput): boolean {
  try {
    const validated = validateData(
      FileRecordSchema.omit({ id: true, created_at: true, updated_at: true }).partial(),
      data
    );
    
    const { sql, values } = buildUpdateSQL('files', validated);
    const result = executeQuery(sql, [...values, id]);
    
    if (result.success && result.result.changes > 0) {
      logDbSuccess('File record updated', { id, fields: Object.keys(validated) });
      
      // Emit SSE event for real-time updates
      const updatedFile = findFileById(id);
      if (updatedFile) {
        emitFileUpdated(fileToEventData(updatedFile));
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    handleDbError(error, 'update file record', { id, data });
  }
}

/**
 * Delete file record
 */
export function deleteFileRecord(id: number): boolean {
  try {
    // Get file data before deletion for SSE event
    const fileToDelete = findFileById(id);
    
    const result = executeQuery("DELETE FROM files WHERE id = ?", [id]);
    
    if (result.success && result.result.changes > 0) {
      logDbSuccess('File record deleted', { id });
      
      // Emit SSE event for real-time updates
      if (fileToDelete) {
        emitFileDeleted(fileToEventData(fileToDelete));
        getLogger().info('File deleted', 'FileManagement', {
          fileId: id,
          fileName: fileToDelete.original_name,
          fileSize: fileToDelete.file_size,
          uploadedBy: fileToDelete.uploaded_by
        });
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    handleDbError(error, 'delete file record', { id });
  }
}

/**
 * Get total file size for all files
 */
export function getTotalFileSize(): number {
  try {
    const result = selectQuery(
      "SELECT SUM(file_size) as total FROM files",
      [],
      FileRecordSchema.pick({ id: true }).extend({ total: FileRecordSchema.shape.file_size.nullable() }),
      true,
      'Database'
    ) as { total: number | null } | null;
    
    return result?.total || 0;
  } catch (error) {
    handleDbError(error, 'get total file size', {});
  }
}

/**
 * Get file count
 */
export function getFileCount(): number {
  try {
    const result = selectQuery(
      "SELECT COUNT(*) as count FROM files",
      [],
      FileRecordSchema.pick({ id: true }).extend({ count: FileRecordSchema.shape.id }),
      true,
      'Database'
    ) as { count: number } | null;
    
    return result?.count || 0;
  } catch (error) {
    handleDbError(error, 'get file count', {});
  }
}

/**
 * Find all files with their referencing job information
 * Uses LEFT JOIN to get files with associated job details
 */
export function findAllFilesWithJobs(): FileWithJobs[] {
  try {
    const sql = `
      SELECT 
        f.id,
        f.original_name,
        f.stored_name,
        f.file_path,
        f.file_size,
        f.mime_type,
        f.uploaded_by,
        f.created_at,
        f.updated_at,
        j.id as job_id,
        j.name as job_name,
        j.status as job_status,
        j.owner as job_owner,
        j.created_at as job_created_at
      FROM files f
      LEFT JOIN jobs j ON f.id = j.file_id
      ORDER BY f.created_at DESC, j.created_at ASC
    `;
    
    const db = getDatabase();
    const stmt = db.prepare(sql);
    const rows = stmt.all() as Array<{
      id: number;
      original_name: string;
      stored_name: string;
      file_path: string;
      file_size: number;
      mime_type: string | null;
      uploaded_by: string | null;
      created_at: string;
      updated_at: string;
      job_id: number | null;
      job_name: string | null;
      job_status: string | null;
      job_owner: string | null;
      job_created_at: string | null;
    }>;
    
    // Group results by file ID to consolidate multiple job references
    const fileMap = new Map<number, FileWithJobs>();
    
    for (const row of rows) {
      const fileId = row.id;
      
      if (!fileMap.has(fileId)) {
        // Create new file entry
        const fileRecord: FileRecord = {
          id: row.id,
          original_name: row.original_name,
          stored_name: row.stored_name,
          file_path: row.file_path,
          file_size: row.file_size,
          mime_type: row.mime_type,
          uploaded_by: row.uploaded_by,
          created_at: row.created_at,
          updated_at: row.updated_at
        };
        
        fileMap.set(fileId, {
          ...fileRecord,
          referencingJobs: []
        });
      }
      
      // Add job reference if it exists
      if (row.job_id && row.job_name && row.job_status && row.job_owner) {
        const file = fileMap.get(fileId)!;
        file.referencingJobs.push({
          jobId: row.job_id,
          jobName: row.job_name,
          jobStatus: row.job_status,
          jobOwner: row.job_owner,
          createdAt: row.job_created_at || ''
        });
      }
    }
    
    const result = Array.from(fileMap.values());
    logDbSuccess('Files with jobs retrieved', { 
      filesCount: result.length,
      totalJobReferences: result.reduce((sum, file) => sum + file.referencingJobs.length, 0)
    });
    
    return result;
  } catch (error) {
    handleDbError(error, 'find all files with jobs', {});
  }
}