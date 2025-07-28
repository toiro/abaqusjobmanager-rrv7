/**
 * File Repository - BaseRepository継承による完全統一
 * Martin Fowler Template Method パターンの具体実装
 */

import { BaseRepository } from "./base-repository";
import { selectQuery, safeDbOperation } from "./db-utils";
import {
	FileRecordSchema,
	PersistedFileRecordSchema,
	UpdateFileRecordSchema,
	type FileRecord,
	type CreateFileRecord,
	type PersistedFileRecord,
	type UpdateFileRecord,
} from "../types/database";
import {
	emitFileCreated,
	emitFileUpdated,
	emitFileDeleted,
} from "../../services/sse/sse.server";
import type { FileEventData } from "../../services/sse/sse-schemas";

/**
 * Extended file type with job reference (1:1 relationship)
 * Now imported from dedicated type file (1 Type 1 File strategy)
 */
import type { FileWithJob } from "./types/file-with-jobs";
export type { FileWithJob };

/**
 * FileRepository - Template Method Pattern 適用
 */
export class FileRepository extends BaseRepository<
	PersistedFileRecord,
	CreateFileRecord,
	UpdateFileRecord,
	number
> {
	protected readonly tableName = "files";
	protected readonly entitySchema = PersistedFileRecordSchema;
	protected readonly createSchema = FileRecordSchema.omit({
		id: true,
		created_at: true,
		updated_at: true,
	});
	protected readonly updateSchema = UpdateFileRecordSchema;

	/**
	 * Number IDの場合はlastInsertRowidを返す
	 */
	protected getIdFromCreateResult(result: any, data: CreateFileRecord): number {
		return result.lastInsertRowid as number;
	}

	// === Public API Methods ===

	createFile(data: CreateFileRecord): number {
		return this.create(data);
	}

	findFileById(id: number): PersistedFileRecord | null {
		return this.findById(id);
	}

	findAllFiles(): PersistedFileRecord[] {
		return this.findAll();
	}

	updateFile(data: UpdateFileRecord): boolean {
		return this.update(data);
	}

	deleteFile(id: number): boolean {
		return this.delete(id);
	}

	// === Specialized File Methods ===

	findFileByStoredName(storedName: string): PersistedFileRecord | null {
		const sql = "SELECT * FROM files WHERE stored_name = ?";
		const results = this.findByCondition(sql, [storedName]);
		return results.length > 0 ? results[0] : null;
	}

	findFilesByUploader(uploadedBy: string): PersistedFileRecord[] {
		const sql =
			"SELECT * FROM files WHERE uploaded_by = ? ORDER BY created_at DESC";
		return this.findByCondition(sql, [uploadedBy]);
	}

	findFilesByMimeType(mimeType: string): PersistedFileRecord[] {
		const sql =
			"SELECT * FROM files WHERE mime_type = ? ORDER BY created_at DESC";
		return this.findByCondition(sql, [mimeType]);
	}

	findLargeFiles(minSizeBytes: number): PersistedFileRecord[] {
		const sql =
			"SELECT * FROM files WHERE file_size >= ? ORDER BY file_size DESC";
		return this.findByCondition(sql, [minSizeBytes]);
	}

	getTotalFileSize(): number {
		return safeDbOperation(
			() => {
				const result = selectQuery(
					"SELECT SUM(file_size) as total FROM files",
					[],
					{ parse: (row: any) => ({ total: row.total || 0 }) } as any,
					true,
					"Database",
				) as { total: number } | null;
				return result?.total || 0;
			},
			"get total file size",
			0,
		);
	}

	getFileCount(): number {
		return safeDbOperation(
			() => {
				const result = selectQuery(
					"SELECT COUNT(*) as count FROM files",
					[],
					{ parse: (row: any) => ({ count: row.count || 0 }) } as any,
					true,
					"Database",
				) as { count: number } | null;
				return result?.count || 0;
			},
			"get file count",
			0,
		);
	}

	findAllFilesWithJobs(): FileWithJob[] {
		return safeDbOperation(
			() => {
				// Get all files
				const files = this.findAllFiles();

				// For each file, get its referencing job (1:1 relationship)
				return files.map((file) => {
					const jobSql = `
            SELECT j.id as jobId, j.name as jobName, j.status as jobStatus, 
                   u.display_name as jobOwner, j.created_at
            FROM jobs j
            LEFT JOIN users u ON j.user_id = u.id
            WHERE j.file_id = ?
            LIMIT 1
          `;

					const referencingJobResults = selectQuery(
						jobSql,
						[file.id],
						{
							parse: (row: any) => ({
								jobId: row.jobId,
								jobName: row.jobName,
								jobStatus: row.jobStatus,
								jobOwner: row.jobOwner,
								createdAt: row.created_at,
							}),
						} as any,
						false,
						"Database",
					) as Array<{
						jobId: number;
						jobName: string;
						jobStatus: string;
						jobOwner: string;
						createdAt: string;
					}>;

					return {
						...file,
						referencingJob:
							referencingJobResults.length > 0
								? referencingJobResults[0]
								: null,
					};
				});
			},
			"find all files with jobs",
			[],
		);
	}

	// === Hook Method Implementations ===

	protected afterCreate(id: number, _data: CreateFileRecord): void {
		const createdFile = this.findFileById(id);
		if (createdFile) {
			emitFileCreated(this.fileToEventData(createdFile));
		}
	}

	protected afterUpdate(id: number, _data: UpdateFileRecord): void {
		const updatedFile = this.findFileById(id);
		if (updatedFile) {
			emitFileUpdated(this.fileToEventData(updatedFile));
		}
	}

	protected beforeDelete(id: number): PersistedFileRecord | null {
		return this.findFileById(id);
	}

	protected afterDelete(
		_id: number,
		deletedFile?: PersistedFileRecord | null,
	): void {
		if (deletedFile) {
			emitFileDeleted(this.fileToEventData(deletedFile));
		}
	}

	protected extractLogData(
		data: CreateFileRecord | UpdateFileRecord,
	): Record<string, any> {
		if ("original_name" in data && "file_size" in data) {
			return {
				originalName: data.original_name,
				fileSize: data.file_size,
			};
		}
		return {};
	}

	// === Private Helper Methods ===

	private findByCondition(sql: string, params: any[]): PersistedFileRecord[] {
		return safeDbOperation(
			() =>
				selectQuery(
					sql,
					params,
					this.entitySchema,
					false,
					"Database",
				) as PersistedFileRecord[],
			`find files by condition`,
			[],
		);
	}

	private fileToEventData(file: PersistedFileRecord): FileEventData {
		return {
			fileId: file.id,
			fileName: file.original_name,
			fileSize: file.file_size,
			mimeType: file.mime_type || undefined,
			uploadedBy: file.uploaded_by || undefined,
		};
	}
}

// Singleton instance
export const fileRepository = new FileRepository();
