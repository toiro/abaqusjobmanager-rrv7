/**
 * File Repository Interface
 *
 * ファイルアグリゲートの永続化を担うリポジトリのインターフェース
 * 実装は Infrastructure 層で行う
 */

import type { 
  PersistedFileRecord, 
  CreateFileRecord, 
  UpdateFileRecord 
} from "../../shared/core/types/database";
import type { FileRecordId } from "../value-objects/entity-ids";

/**
 * File with Job information for admin view
 */
export interface FileWithJob {
  id: FileRecordId;
  original_name: string;
  stored_name: string;
  file_size: number;
  mime_type: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  referencingJob: {
    jobId: number;
    jobName: string;
    jobStatus: string;
    jobOwner: string;
    createdAt: string;
  } | null;
}

/**
 * File Repository Interface (Functional DDD)
 *
 * 関数型ファイルの永続化インターフェース
 */
export interface FileRepository {
  // === Basic CRUD Operations ===
  
  /**
   * ファイルを作成
   */
  createFile(data: CreateFileRecord): FileRecordId;

  /**
   * IDでファイルを検索
   */
  findFileById(id: FileRecordId): PersistedFileRecord | null;

  /**
   * すべてのファイルを取得
   */
  findAllFiles(): PersistedFileRecord[];

  /**
   * ファイルを更新
   */
  updateFile(data: UpdateFileRecord): boolean;

  /**
   * ファイルを削除
   */
  deleteFile(id: FileRecordId): boolean;

  // === Query Methods ===

  /**
   * 保存名でファイルを検索
   */
  findFileByStoredName(storedName: string): PersistedFileRecord | null;

  /**
   * アップロード者でファイルを検索
   */
  findFilesByUploader(uploadedBy: string): PersistedFileRecord[];

  /**
   * MIMEタイプでファイルを検索
   */
  findFilesByMimeType(mimeType: string): PersistedFileRecord[];

  /**
   * サイズでファイルを検索
   */
  findLargeFiles(minSizeBytes: number): PersistedFileRecord[];

  // === Statistics ===

  /**
   * 総ファイルサイズを取得
   */
  getTotalFileSize(): number;

  /**
   * ファイル数を取得
   */
  getFileCount(): number;

  /**
   * ジョブ情報付きですべてのファイルを取得（管理画面用）
   */
  findAllFilesWithJobs(): FileWithJob[];
}