/**
 * Simple, direct file record database operations
 */

import { FileRecordSchema, type FileRecord } from "../types/database";
import { validateData, selectQuery, executeQuery, buildUpdateSQL, handleDbError, logDbSuccess, safeDbOperation } from "./db-utils";

export type CreateFileInput = Omit<FileRecord, 'id' | 'created_at' | 'updated_at'>;
export type UpdateFileInput = Partial<CreateFileInput>;

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
    const result = executeQuery("DELETE FROM files WHERE id = ?", [id]);
    
    if (result.success && result.result.changes > 0) {
      logDbSuccess('File record deleted', { id });
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