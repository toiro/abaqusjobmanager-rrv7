/**
 * Node-based Remote PowerShell Executor
 * Node エンティティから直接 remote-pwsh を呼び出すためのユーティリティ
 */

import { createRemotePwshExecutor } from "./executor";
import type { Node, PersistedNode } from "~/shared/core/types/database";
// RemotePwshExecutor 型は executor.ts から ReturnType で推論

/**
 * Node エンティティから Remote PowerShell Executor を作成
 *
 * @param node Node または PersistedNode エンティティ
 * @param scriptPath 実行する PowerShell スクリプトのパス
 * @returns Remote PowerShell Executor インスタンス
 * @throws Error Node に必要な情報が不足している場合
 */
export function createNodeExecutor(
	node: Node | PersistedNode,
	scriptPath: string,
): ReturnType<typeof createRemotePwshExecutor> {
	// 必須フィールドのバリデーション
	if (!node.hostname || !node.hostname.trim()) {
		throw new Error("Node must have a valid hostname for remote execution");
	}

	if (!node.ssh_username || !node.ssh_username.trim()) {
		throw new Error("Node must have a valid ssh_username for remote execution");
	}

	if (!scriptPath || !scriptPath.trim()) {
		throw new Error("Script path is required for remote execution");
	}

	// remote-pwsh executor を作成
	return createRemotePwshExecutor({
		host: node.hostname,
		user: node.ssh_username,
		scriptPath: scriptPath.trim(),
	});
}
