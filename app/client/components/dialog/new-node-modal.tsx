/**
 * NewNodeModal - 新規ノード作成フォームダイアログ
 * FormDialogを使用したノード作成UI
 */

import { FormDialog } from "~/client/components/dialog";
import { Input, Label } from "~/client/components/ui";
import { BUTTONS, SYSTEM_MESSAGES } from "~/client/constants/messages";

export interface NewNodeModalProps {
	/** ダイアログの開閉状態 */
	isOpen: boolean;
	/** ダイアログを閉じるコールバック */
	onClose: () => void;
	/** アクションデータ */
	actionData?: any;
}

/**
 * 新規ノード作成フォームダイアログ
 *
 * 機能：
 * - ノード名入力
 * - ホスト名入力
 * - SSHポート設定
 * - ユーザー名設定
 * - CPUコア数設定
 * - フォーム送信後の自動クローズ
 */
export const NewNodeModal = ({
	isOpen,
	onClose,
	actionData,
}: NewNodeModalProps) => {
	return (
		<FormDialog
			isOpen={isOpen}
			title="新規ノード作成"
			onClose={onClose}
			intent="create-node"
			submitText={SYSTEM_MESSAGES.CREATE}
			maxWidth="max-w-lg"
		>
			<div className="space-y-4">
				{/* ノード名 */}
				<div>
					<Label htmlFor="node-name">ノード名</Label>
					<Input
						id="node-name"
						name="name"
						placeholder="ノード名を入力"
						required
					/>
				</div>

				{/* ホスト名 */}
				<div>
					<Label htmlFor="node-hostname">ホスト名</Label>
					<Input
						id="node-hostname"
						name="hostname"
						placeholder="hostname.example.com"
						required
					/>
				</div>

				{/* SSHポート */}
				<div>
					<Label htmlFor="node-ssh-port">SSHポート</Label>
					<Input
						id="node-ssh-port"
						name="ssh_port"
						type="number"
						defaultValue="22"
						min="1"
						max="65535"
						required
					/>
				</div>

				{/* ユーザー名 */}
				<div>
					<Label htmlFor="node-username">ユーザー名</Label>
					<Input
						id="node-username"
						name="username"
						placeholder="SSH接続用ユーザー名"
						required
					/>
				</div>

				{/* CPUコア数 */}
				<div>
					<Label htmlFor="node-cpu-cores">CPUコア数</Label>
					<Input
						id="node-cpu-cores"
						name="cpu_cores"
						type="number"
						defaultValue="4"
						min="1"
						max="128"
						required
					/>
				</div>

				{/* 説明 */}
				<div>
					<Label htmlFor="node-description">説明（任意）</Label>
					<Input
						id="node-description"
						name="description"
						placeholder="ノードの説明"
					/>
				</div>
			</div>
		</FormDialog>
	);
};
