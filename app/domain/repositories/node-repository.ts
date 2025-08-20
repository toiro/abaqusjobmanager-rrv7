/**
 * Node Repository Interface
 *
 * ノードアグリゲートの永続化を担うリポジトリのインターフェース
 * 実装は Infrastructure 層で行う
 */

import type { 
  PersistedNode, 
  CreateNode, 
  UpdateNode 
} from "../../shared/core/types/database";
import type { NodeId } from "../value-objects/entity-ids";

/**
 * Node Repository Interface (Functional DDD)
 *
 * 関数型ノードの永続化インターフェース
 */
export interface NodeRepository {
  // === Basic CRUD Operations ===
  
  /**
   * ノードを作成
   */
  createNode(data: CreateNode): NodeId;

  /**
   * IDでノードを検索
   */
  findNodeById(id: NodeId): PersistedNode | null;

  /**
   * すべてのノードを取得
   */
  findAllNodes(): PersistedNode[];

  /**
   * ノードを更新
   */
  updateNode(data: UpdateNode): boolean;

  /**
   * ノードを削除
   */
  deleteNode(id: NodeId): boolean;

  // === Query Methods ===

  /**
   * アクティブなノードを検索
   */
  findActiveNodes(): PersistedNode[];

  /**
   * 利用可能なノードを検索
   */
  findAvailableNodes(): PersistedNode[];

  /**
   * ホスト名でノードを検索
   */
  findNodeByHostname(hostname: string): PersistedNode | null;

  // === Status Management ===

  /**
   * ノードステータスを更新
   */
  updateNodeStatus(id: NodeId, status: PersistedNode["status"]): boolean;

  /**
   * ノードを有効化
   */
  activateNode(id: NodeId): boolean;

  /**
   * ノードを無効化
   */
  deactivateNode(id: NodeId): boolean;
}