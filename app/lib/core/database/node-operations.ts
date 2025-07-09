/**
 * Simple, direct node database operations
 * Replaces complex NodeOperations class with straightforward functions
 */

import { NodeSchema, type Node } from "../types/database";
import { validateData, selectQuery, executeQuery, buildUpdateSQL, handleDbError, logDbSuccess, safeDbOperation } from "./db-utils";

// Type definitions for node operations
export type CreateNodeInput = Omit<Node, 'id' | 'created_at' | 'updated_at' | 'status'>;
export type UpdateNodeInput = Partial<CreateNodeInput>;

/**
 * Create a new node
 */
export function createNode(data: CreateNodeInput): number {
  try {
    const validated = validateData(
      NodeSchema.omit({ id: true, created_at: true, updated_at: true, status: true }), 
      data
    );
    
    const sql = `
      INSERT INTO nodes (name, hostname, ssh_port, max_cpu_cores, is_active)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const params = [
      validated.name,
      validated.hostname,
      validated.ssh_port || 22,
      validated.max_cpu_cores,
      validated.is_active !== false
    ];
    
    const result = executeQuery(sql, params);
    if (!result.success) {
      throw new Error(result.error || 'Failed to create node');
    }
    
    const nodeId = result.result.lastInsertRowid as number;
    logDbSuccess('Node created', { nodeId, name: validated.name, hostname: validated.hostname });
    return nodeId;
  } catch (error) {
    handleDbError(error, 'create node', { data });
  }
}

/**
 * Find node by ID
 */
export function findNodeById(id: number): Node | null {
  try {
    return selectQuery(
      "SELECT * FROM nodes WHERE id = ?",
      [id],
      NodeSchema,
      true,
      'Database'
    ) as Node | null;
  } catch (error) {
    handleDbError(error, 'find node by id', { id });
  }
}

/**
 * Find all nodes
 */
export function findAllNodes(): Node[] {
  return safeDbOperation(
    () => selectQuery(
      "SELECT * FROM nodes ORDER BY created_at DESC",
      [],
      NodeSchema,
      false,
      'Database'
    ) as Node[],
    'find all nodes',
    []
  );
}

/**
 * Find active nodes
 */
export function findActiveNodes(): Node[] {
  return safeDbOperation(
    () => selectQuery(
      "SELECT * FROM nodes WHERE is_active = 1 ORDER BY name",
      [],
      NodeSchema,
      false,
      'Database'
    ) as Node[],
    'find active nodes',
    []
  );
}

/**
 * Find available nodes (active and available status)
 */
export function findAvailableNodes(): Node[] {
  return safeDbOperation(
    () => selectQuery(
      "SELECT * FROM nodes WHERE is_active = 1 AND status = 'available' ORDER BY name",
      [],
      NodeSchema,
      false,
      'Database'
    ) as Node[],
    'find available nodes',
    []
  );
}

/**
 * Update node status
 */
export function updateNodeStatus(id: number, status: Node['status']): boolean {
  try {
    const sql = `
      UPDATE nodes 
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    const result = executeQuery(sql, [status, id]);
    
    if (result.success && result.result.changes > 0) {
      logDbSuccess('Node status updated', { id, status });
      return true;
    }
    
    return false;
  } catch (error) {
    handleDbError(error, 'update node status', { id, status });
  }
}

/**
 * Update node
 */
export function updateNode(id: number, data: UpdateNodeInput): boolean {
  try {
    const validated = validateData(
      NodeSchema.omit({ id: true, created_at: true, updated_at: true, status: true }).partial(),
      data
    );
    
    const { sql, values } = buildUpdateSQL('nodes', validated);
    const result = executeQuery(sql, [...values, id]);
    
    if (result.success && result.result.changes > 0) {
      logDbSuccess('Node updated', { id, fields: Object.keys(validated) });
      return true;
    }
    
    return false;
  } catch (error) {
    handleDbError(error, 'update node', { id, data });
  }
}

/**
 * Delete node
 */
export function deleteNode(id: number): boolean {
  try {
    const result = executeQuery("DELETE FROM nodes WHERE id = ?", [id]);
    
    if (result.success && result.result.changes > 0) {
      logDbSuccess('Node deleted', { id });
      return true;
    }
    
    return false;
  } catch (error) {
    handleDbError(error, 'delete node', { id });
  }
}

/**
 * Activate node
 */
export function activateNode(id: number): boolean {
  try {
    const sql = `
      UPDATE nodes 
      SET is_active = 1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    
    const result = executeQuery(sql, [id]);
    
    if (result.success && result.result.changes > 0) {
      logDbSuccess('Node activated', { id });
      return true;
    }
    
    return false;
  } catch (error) {
    handleDbError(error, 'activate node', { id });
  }
}

/**
 * Deactivate node
 */
export function deactivateNode(id: number): boolean {
  try {
    const sql = `
      UPDATE nodes 
      SET is_active = 0, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    
    const result = executeQuery(sql, [id]);
    
    if (result.success && result.result.changes > 0) {
      logDbSuccess('Node deactivated', { id });
      return true;
    }
    
    return false;
  } catch (error) {
    handleDbError(error, 'deactivate node', { id });
  }
}

/**
 * Find node by hostname
 */
export function findNodeByHostname(hostname: string): Node | null {
  try {
    return selectQuery(
      "SELECT * FROM nodes WHERE hostname = ?",
      [hostname],
      NodeSchema,
      true,
      'Database'
    ) as Node | null;
  } catch (error) {
    handleDbError(error, 'find node by hostname', { hostname });
  }
}