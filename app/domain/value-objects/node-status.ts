/**
 * Node Status Value Object (DDD)
 * ノードの状態を表現する値オブジェクト
 * 
 * Domain-Driven Design における Value Object として実装
 * - ノードの可用性に関するビジネスルールをカプセル化
 * - 状態変更の妥当性チェック機能を提供
 * - 型安全性を確保
 */

export const NODE_STATUSES = [
	"available",
	"unavailable"
] as const;

export type NodeStatus = typeof NODE_STATUSES[number];

/**
 * Node Status Value Object のヘルパー関数
 * ノード状態に関するビジネスロジックをカプセル化
 */
export const NodeStatusVO = {
	/**
	 * ノードが利用可能かどうかを判定
	 */
	isAvailable: (status: NodeStatus): boolean =>
		status === 'available',
	
	/**
	 * ノードが利用不可かどうかを判定
	 */
	isUnavailable: (status: NodeStatus): boolean =>
		status === 'unavailable',
	
	/**
	 * ジョブを実行可能な状態かどうかを判定
	 */
	canExecuteJob: (status: NodeStatus): boolean =>
		status === 'available',
	
	/**
	 * デフォルトステータスを取得（セキュリティのため unavailable）
	 */
	getDefault: (): NodeStatus => 'unavailable',
	
	/**
	 * 状態の遷移が可能かどうかを判定
	 */
	canTransitionTo: (from: NodeStatus, to: NodeStatus): boolean => {
		// ノードステータスは自由に変更可能（管理者が制御）
		return true;
	},
	
	/**
	 * 表示用ラベルを取得
	 */
	getDisplayLabel: (status: NodeStatus): string => {
		const labels: Record<NodeStatus, string> = {
			available: "Available",
			unavailable: "Unavailable"
		};
		return labels[status];
	},
	
	/**
	 * 表示用カラー（UI用）を取得
	 */
	getDisplayColor: (status: NodeStatus): 'green' | 'red' => {
		const colors: Record<NodeStatus, 'green' | 'red'> = {
			available: 'green',
			unavailable: 'red'
		};
		return colors[status];
	},
} as const;