/**
 * NewUserModal - 新規ユーザー作成フォームダイアログ
 * FormDialogを使用したユーザー作成UI
 */

import { FormDialog } from "~/client/components/dialog";
import { Input, Label, Select } from "~/client/components/ui";
import { BUTTONS, SYSTEM_MESSAGES } from "~/client/constants/messages";

export interface NewUserModalProps {
	/** ダイアログの開閉状態 */
	isOpen: boolean;
	/** ダイアログを閉じるコールバック */
	onClose: () => void;
	/** アクションデータ */
	actionData?: any;
}

/**
 * 新規ユーザー作成フォームダイアログ
 *
 * 機能：
 * - ユーザー名入力
 * - メールアドレス入力
 * - ロール選択
 * - フォーム送信後の自動クローズ
 */
export const NewUserModal = ({
	isOpen,
	onClose,
	actionData,
}: NewUserModalProps) => {
	return (
		<FormDialog
			isOpen={isOpen}
			title="新規ユーザー作成"
			onClose={onClose}
			intent="create-user"
			submitText={SYSTEM_MESSAGES.CREATE}
			maxWidth="max-w-lg"
		>
			<div className="space-y-4">
				{/* ユーザー名 */}
				<div>
					<Label htmlFor="user-name">ユーザー名</Label>
					<Input
						id="user-name"
						name="name"
						placeholder="ユーザー名を入力"
						required
					/>
				</div>

				{/* メールアドレス */}
				<div>
					<Label htmlFor="user-email">メールアドレス</Label>
					<Input
						id="user-email"
						name="email"
						type="email"
						placeholder="user@example.com"
						required
					/>
				</div>

				{/* ロール */}
				<div>
					<Label htmlFor="user-role">ロール</Label>
					<Select id="user-role" name="role" defaultValue="user" required>
						<option value="user">一般ユーザー</option>
						<option value="admin">管理者</option>
						<option value="manager">マネージャー</option>
					</Select>
				</div>

				{/* 部署・所属 */}
				<div>
					<Label htmlFor="user-department">部署・所属（任意）</Label>
					<Input id="user-department" name="department" placeholder="部署名" />
				</div>
			</div>
		</FormDialog>
	);
};
