/**
 * Node Repository - BaseRepository継承による重複コード削除
 * Martin Fowler Template Method パターンの具体実装
 */

import { BaseRepository } from "./base-repository";
import { selectQuery, safeDbOperation } from "./db-utils";
import {
	NodeSchema,
	CreateNodeSchema,
	PersistedNodeSchema,
	UpdateNodeSchema,
	type Node,
	type CreateNode,
	type PersistedNode,
	type UpdateNode,
} from "../types/database";
import {
	emitNodeCreated,
	emitNodeUpdated,
	emitNodeDeleted,
	emitNodeStatusChanged,
} from "../../../server/services/sse/sse.server";
import type { NodeId } from "../../../domain/value-objects/entity-ids";
import type { NodeEventData } from "../../../server/services/sse/sse-schemas";
import { getLogger } from "../logger/logger.server";
import { executeQuery } from "./db-utils";

/**
 * NodeRepository - Template Method Pattern 適用
 */
export class NodeRepository extends BaseRepository<
	PersistedNode,
	CreateNode,
	UpdateNode,
	NodeId
> {
	protected readonly tableName = "nodes";
	protected readonly entitySchema = PersistedNodeSchema;
	protected readonly createSchema = CreateNodeSchema;
	protected readonly updateSchema = UpdateNodeSchema;

	/**
	 * Number IDの場合はlastInsertRowidを返す
	 */
	protected getIdFromCreateResult(result: any, data: CreateNode): NodeId {
		return result.lastInsertRowid as NodeId;
	}

	// === Public API Methods ===

	createNode(data: CreateNode): NodeId {
		return this.create(data);
	}

	findNodeById(id: NodeId): PersistedNode | null {
		return this.findById(id);
	}

	findAllNodes(): PersistedNode[] {
		return this.findAll();
	}

	updateNode(data: UpdateNode): boolean {
		return this.update(data);
	}

	deleteNode(id: NodeId): boolean {
		return this.delete(id);
	}

	// === Specialized Node Methods ===

	findActiveNodes(): PersistedNode[] {
		const sql = "SELECT * FROM nodes WHERE is_active = 1 ORDER BY name";
		return this.findByCondition(sql, []);
	}

	findAvailableNodes(): PersistedNode[] {
		const sql =
			"SELECT * FROM nodes WHERE is_active = 1 AND status = 'available' ORDER BY name";
		return this.findByCondition(sql, []);
	}

	findNodeByHostname(hostname: string): PersistedNode | null {
		const sql = "SELECT * FROM nodes WHERE hostname = ?";
		const results = this.findByCondition(sql, [hostname]);
		return results.length > 0 ? results[0] : null;
	}

	updateNodeStatus(id: NodeId, status: PersistedNode["status"]): boolean {
		try {
			// Get current node for comparison and SSE event
			const currentNode = this.findNodeById(id);
			const previousStatus = currentNode?.status;

			const sql = `
        UPDATE nodes 
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

			const result = executeQuery(sql, [status, id]);

			if (result.success && result.result.changes > 0) {
				this.logStatusChange(
					id,
					currentNode,
					previousStatus || "unknown",
					status,
				);

				// Emit SSE event for real-time status updates
				const updatedNode = this.findNodeById(id);
				if (updatedNode) {
					emitNodeStatusChanged(this.nodeToEventData(updatedNode));
				}

				return true;
			}

			return false;
		} catch (error) {
			const { handleDbError } = require("./db-utils");
			handleDbError(error, "update node status", { id, status });
			return false;
		}
	}

	activateNode(id: NodeId): boolean {
		const sql = `
      UPDATE nodes 
      SET is_active = 1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
		return this.executeStatusUpdate(sql, [id], "activate");
	}

	deactivateNode(id: NodeId): boolean {
		const sql = `
      UPDATE nodes 
      SET is_active = 0, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
		return this.executeStatusUpdate(sql, [id], "deactivate");
	}

	// === Hook Method Implementations ===

	protected afterCreate(id: NodeId, _data: CreateNode): void {
		const createdNode = this.findNodeById(id);
		if (createdNode) {
			emitNodeCreated(this.nodeToEventData(createdNode));
		}
	}

	protected afterUpdate(id: NodeId, _data: UpdateNode): void {
		const updatedNode = this.findNodeById(id);
		if (updatedNode) {
			emitNodeUpdated(this.nodeToEventData(updatedNode));
		}
	}

	protected beforeDelete(id: NodeId): PersistedNode | null {
		return this.findNodeById(id);
	}

	protected afterDelete(_id: NodeId, deletedNode?: PersistedNode | null): void {
		if (deletedNode) {
			emitNodeDeleted(this.nodeToEventData(deletedNode));
		}
	}

	protected extractLogData(data: CreateNode | UpdateNode): Record<string, any> {
		if ("name" in data && "hostname" in data) {
			return { name: data.name, hostname: data.hostname };
		}
		return {};
	}

	// === Private Helper Methods ===

	private findByCondition(sql: string, params: any[]): PersistedNode[] {
		return safeDbOperation(
			() =>
				selectQuery(
					sql,
					params,
					this.entitySchema,
					false,
					"Database",
				) as PersistedNode[],
			`find nodes by condition`,
			[],
		);
	}

	private executeStatusUpdate(
		sql: string,
		params: any[],
		operation: string,
	): boolean {
		try {
			const result = executeQuery(sql, params);

			if (result.success && result.result.changes > 0) {
				const { logDbSuccess } = require("./db-utils");
				logDbSuccess(`Node ${operation}d`, { id: params[0] });

				// Emit SSE event for real-time updates
				const updatedNode = this.findNodeById(params[0]);
				if (updatedNode) {
					emitNodeUpdated(this.nodeToEventData(updatedNode));
				}

				return true;
			}

			return false;
		} catch (error) {
			const { handleDbError } = require("./db-utils");
			handleDbError(error, `${operation} node`, { id: params[0] });
			return false;
		}
	}

	private logStatusChange(
		id: NodeId,
		currentNode: PersistedNode | null,
		previousStatus: string,
		newStatus: string,
	): void {
		if (previousStatus !== newStatus) {
			const logger = getLogger();

			if (newStatus === "unavailable") {
				logger.warn("NodeStatus: Node status changed to unavailable", {
					nodeId: id,
					nodeName: currentNode?.name,
					hostname: currentNode?.hostname,
					previousStatus,
					newStatus,
					timestamp: new Date().toISOString(),
				});
			} else if (
				newStatus === "available" &&
				previousStatus === "unavailable"
			) {
				logger.info("NodeStatus: Node recovered from unavailable status", {
					nodeId: id,
					nodeName: currentNode?.name,
					hostname: currentNode?.hostname,
					previousStatus,
					newStatus,
					timestamp: new Date().toISOString(),
				});
			} else {
				const { logDbSuccess } = require("./db-utils");
				logDbSuccess("Node status updated", {
					id,
					previousStatus,
					newStatus,
					nodeName: currentNode?.name,
					hostname: currentNode?.hostname,
				});
			}
		}
	}

	private nodeToEventData(node: PersistedNode): NodeEventData {
		return {
			nodeId: node.id,
			nodeName: node.name,
			hostname: node.hostname,
			sshUsername: node.ssh_username,
			sshPort: node.ssh_port,
			cpuCoresLimit: node.cpu_cores_limit,
			licenseTokenLimit: node.license_token_limit,
			status: node.status,
			isActive: node.is_active,
		};
	}
}

// Singleton instance
export const nodeRepository = new NodeRepository();
