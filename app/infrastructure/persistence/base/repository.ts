/**
 * Base Repository Pattern - Infrastructure Layer Implementation
 * 
 * Martin Fowler Template Method パターン適用
 * データベース操作の重複コードを抽象化し、共通処理を統一
 */

import type { ZodSchema } from "zod";
import {
  validateData,
  selectQuery,
  executeQuery,
  buildUpdateSQL,
  handleDbError,
  logDbSuccess,
  safeDbOperation,
} from "../../../shared/core/database/db-utils";
import type { EntityId } from "../../../domain/value-objects/entity-ids";

/**
 * 基底リポジトリクラス - Template Method パターン
 * 型安全性を保ちながら共通のCRUD操作を提供
 */
export abstract class BaseRepository<
  TEntity,
  TCreateInput,
  TUpdateInput,
  TId extends EntityId = EntityId,
> {
  protected abstract readonly tableName: string;

  // ZodSchemaの型制約を緩和し、実用性を重視
  protected abstract readonly entitySchema: ZodSchema<any>;
  protected abstract readonly createSchema: ZodSchema<any>;
  protected abstract readonly updateSchema: ZodSchema<any>;

  /**
   * ID取得の抽象メソッド - 各リポジトリで実装
   */
  protected abstract getIdFromCreateResult(
    result: any,
    data: TCreateInput,
  ): TId;

  /**
   * Template Method: Create操作の骨格
   */
  protected create(data: TCreateInput): TId {
    try {
      const validated = this.validateForCreate(data);
      const { sql, params } = this.buildCreateSQL(validated);

      const result = executeQuery(sql, params);
      if (!result.success) {
        throw new Error(
          result.error || `Failed to create ${this.tableName} record`,
        );
      }

      const entityId = this.getIdFromCreateResult(result.result, data);
      this.logCreateSuccess(entityId, validated);
      this.afterCreate?.(entityId, validated);

      return entityId;
    } catch (error) {
      handleDbError(error, `create ${this.tableName}`, { data });
    }
  }

  /**
   * Template Method: FindById操作の骨格
   */
  protected findById(id: TId): TEntity | null {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE id = ?`;
      return selectQuery(
        sql,
        [id],
        this.entitySchema,
        true,
        "Database",
      ) as TEntity | null;
    } catch (error) {
      handleDbError(error, `find ${this.tableName} by id`, { id });
    }
  }

  /**
   * Template Method: FindAll操作の骨格
   */
  protected findAll(orderBy: string = "created_at DESC"): TEntity[] {
    return safeDbOperation(
      () => {
        const sql = `SELECT * FROM ${this.tableName} ORDER BY ${orderBy}`;
        return selectQuery(
          sql,
          [],
          this.entitySchema,
          false,
          "Database",
        ) as TEntity[];
      },
      `find all ${this.tableName}`,
      [],
    );
  }

  /**
   * Template Method: Update操作の骨格
   */
  protected update(data: TUpdateInput & { id: TId }): boolean {
    try {
      const validated = this.validateForUpdate(data);
      const { id, ...updateData } = validated;

      const { sql, values } = buildUpdateSQL(this.tableName, updateData);
      const result = executeQuery(sql, [...values, id]);

      if (result.success && result.result.changes > 0) {
        this.logUpdateSuccess(id, Object.keys(updateData));
        this.afterUpdate?.(id, validated);
        return true;
      }

      return false;
    } catch (error) {
      handleDbError(error, `update ${this.tableName}`, { id: data.id, data });
    }
  }

  /**
   * Template Method: Delete操作の骨格
   */
  protected delete(id: TId): boolean {
    try {
      const entityToDelete = this.beforeDelete?.(id);

      const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
      const result = executeQuery(sql, [id]);

      if (result.success && result.result.changes > 0) {
        logDbSuccess(`${this.tableName} deleted`, { id });
        this.afterDelete?.(id, entityToDelete || null);
        return true;
      }

      return false;
    } catch (error) {
      handleDbError(error, `delete ${this.tableName}`, { id });
    }
  }

  // === Private Helper Methods ===

  private validateForCreate(data: TCreateInput): TCreateInput {
    return validateData(this.createSchema, data);
  }

  private validateForUpdate(
    data: TUpdateInput & { id: TId },
  ): TUpdateInput & { id: TId } {
    return validateData(this.updateSchema, data);
  }

  private buildCreateSQL(data: TCreateInput): { sql: string; params: any[] } {
    const fields = Object.keys(data as object);
    const placeholders = fields.map(() => "?").join(", ");
    const values = Object.values(data as object);

    return {
      sql: `INSERT INTO ${this.tableName} (${fields.join(", ")}) VALUES (${placeholders})`,
      params: values,
    };
  }

  private logCreateSuccess(id: TId, data: TCreateInput): void {
    logDbSuccess(`${this.tableName} created`, {
      id,
      ...this.extractLogData(data),
    });
  }

  private logUpdateSuccess(id: TId, fields: string[]): void {
    logDbSuccess(`${this.tableName} updated`, { id, fields });
  }

  /**
   * Hook: ログ出力用データの抽出（子クラスでオーバーライド可能）
   */
  protected extractLogData(
    data: TCreateInput | TUpdateInput,
  ): Record<string, any> {
    return {};
  }

  // === Optional Hook Methods ===
  protected afterCreate?(id: TId, data: TCreateInput): void;
  protected afterUpdate?(id: TId, data: TUpdateInput & { id: TId }): void;
  protected beforeDelete?(id: TId): TEntity | null;
  protected afterDelete?(id: TId, deletedEntity: TEntity | null): void;
}