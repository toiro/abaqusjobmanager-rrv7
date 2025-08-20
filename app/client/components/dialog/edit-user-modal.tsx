/**
 * EditUserModal - ユーザー編集フォームダイアログ
 * FormDialogを使用したユーザー編集UI
 */

import type { User } from "~/shared/core/types/database";
import { FormDialog } from "~/client/components/dialog";
import { Input, Label, Select } from "~/client/components/ui";
import { BUTTONS } from "~/client/constants/messages";

export interface EditUserModalProps {
	/** ダイアログの開閉状態 */
	isOpen: boolean;
	/** ダイアログを閉じるコールバック */
	onClose: () => void;
	/** 編集対象のユーザー */
	user: User | null;
	/** アクションデータ */
	actionData?: any;
}

/**
 * ユーザー編集フォームダイアログ
 *
 * 機能：
 * - ユーザー名編集
 * - メールアドレス編集
 * - ロール変更
 * - フォーム送信後の自動クローズ
 */
export const EditUserModal = ({
	isOpen,
	onClose,
	user,
	actionData,
}: EditUserModalProps) => {
	if (!user) return null;

	return (
		<FormDialog
			isOpen={isOpen}
			title="ユーザー編集"
			onClose={onClose}
			intent="edit-user"
			submitText={BUTTONS.SAVE}
			maxWidth="max-w-lg"
			hiddenFields={{ id: user.id }}
		>
			<div className="space-y-4">
				{/* ユーザー名 */}
				<div>
					<Label htmlFor="edit-user-name">ユーザー名</Label>
					<Input
						id="edit-user-name"
						name="name"
						defaultValue={user.id}
						placeholder="ユーザー名を入力"
						required
					/>
				</div>

				{/* メールアドレス */}
				<div>
					<Label htmlFor="edit-user-email">メールアドレス</Label>
					<Input
						id="edit-user-email"
						name="email"
						type="email"
						defaultValue={""}
						placeholder="user@example.com"
						required
					/>
				</div>

				{/* ロール */}
				<div>
					<Label htmlFor="edit-user-role">ロール</Label>
					<Select
						id="edit-user-role"
						name="role"
						defaultValue={"user"}
						required
					>
						<option value="user">一般ユーザー</option>
						<option value="admin">管理者</option>
						<option value="manager">マネージャー</option>
					</Select>
				</div>

				{/* 部署・所属 */}
				<div>
					<Label htmlFor="edit-user-department">部署・所属（任意）</Label>
					<Input
						id="edit-user-department"
						name="department"
						defaultValue={""}
						placeholder="部署名"
					/>
				</div>

				{/* 現在のステータス表示 */}
				<div className="p-3 bg-gray-50 rounded-lg">
					<div className="text-sm text-gray-600">
						<p>
							<strong>ユーザーID:</strong> {user.id}
						</p>
						{user.created_at && (
							<p>
								<strong>作成日時:</strong>{" "}
								{new Date(user.created_at).toLocaleString("ja-JP")}
							</p>
						)}
					</div>
				</div>
			</div>
		</FormDialog>
	);
};
