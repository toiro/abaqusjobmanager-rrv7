/**
 * EditNodeModal - ノード編集フォームダイアログ
 * FormDialogを使用したノード編集UI
 */

import type { Node } from "~/shared/core/types/database";
import { FormDialog } from "~/client/components/dialog";
import { Input, Label } from "~/client/components/ui";
import { BUTTONS } from "~/client/constants/messages";

export interface EditNodeModalProps {
	/** ダイアログの開閉状態 */
	isOpen: boolean;
	/** ダイアログを閉じるコールバック */
	onClose: () => void;
	/** 編集対象のノード */
	node: Node | null;
	/** アクションデータ */
	actionData?: any;
}

/**
 * ノード編集フォームダイアログ
 *
 * 機能：
 * - ノード名編集
 * - ホスト名編集
 * - SSHポート変更
 * - ユーザー名変更
 * - CPUコア数変更
 * - フォーム送信後の自動クローズ
 */
export const EditNodeModal = ({
	isOpen,
	onClose,
	node,
	actionData,
}: EditNodeModalProps) => {
	if (!node) return null;

	return (
		<FormDialog
			isOpen={isOpen}
			title="ノード編集"
			onClose={onClose}
			intent="edit-node"
			submitText={BUTTONS.SAVE}
			maxWidth="max-w-lg"
			hiddenFields={{ id: node.id || 0 }}
		>
			<div className="space-y-4">
				{/* ノード名 */}
				<div>
					<Label htmlFor="edit-node-name">ノード名</Label>
					<Input
						id="edit-node-name"
						name="name"
						defaultValue={node.name}
						placeholder="ノード名を入力"
						required
					/>
				</div>

				{/* ホスト名 */}
				<div>
					<Label htmlFor="edit-node-hostname">ホスト名</Label>
					<Input
						id="edit-node-hostname"
						name="hostname"
						defaultValue={node.hostname}
						placeholder="hostname.example.com"
						required
					/>
				</div>

				{/* SSHポート */}
				<div>
					<Label htmlFor="edit-node-ssh-port">SSHポート</Label>
					<Input
						id="edit-node-ssh-port"
						name="ssh_port"
						type="number"
						defaultValue={node.ssh_port?.toString() || "22"}
						min="1"
						max="65535"
						required
					/>
				</div>

				{/* ユーザー名 */}
				<div>
					<Label htmlFor="edit-node-username">ユーザー名</Label>
					<Input
						id="edit-node-username"
						name="username"
						defaultValue={node.ssh_username || ""}
						placeholder="SSH接続用ユーザー名"
						required
					/>
				</div>

				{/* CPUコア数 */}
				<div>
					<Label htmlFor="edit-node-cpu-cores">CPUコア数</Label>
					<Input
						id="edit-node-cpu-cores"
						name="cpu_cores"
						type="number"
						defaultValue={node.cpu_cores_limit?.toString() || "4"}
						min="1"
						max="128"
						required
					/>
				</div>

				{/* 説明 */}
				<div>
					<Label htmlFor="edit-node-description">説明（任意）</Label>
					<Input
						id="edit-node-description"
						name="description"
						defaultValue={""}
						placeholder="ノードの説明"
					/>
				</div>

				{/* 現在のステータス表示 */}
				<div className="p-3 bg-gray-50 rounded-lg">
					<div className="text-sm text-gray-600">
						<p>
							<strong>ノードID:</strong> {node.id}
						</p>
						<p>
							<strong>ステータス:</strong> {node.status || "不明"}
						</p>
						{node.created_at && (
							<p>
								<strong>作成日時:</strong>{" "}
								{new Date(node.created_at).toLocaleString("ja-JP")}
							</p>
						)}
					</div>
				</div>
			</div>
		</FormDialog>
	);
};
