/**
 * DeleteUserDialog - ユーザー削除確認ダイアログ
 * Dialogを使用したユーザー削除確認UI
 */

import type { User } from "~/shared/core/types/database";
import { Dialog } from "~/client/components/dialog";
import { Button } from "~/client/components/ui";
import { BUTTONS } from "~/client/constants/messages";
import { Form, useLocation } from "react-router";

export interface DeleteUserDialogProps {
	/** ダイアログの開閉状態 */
	isOpen: boolean;
	/** ダイアログを閉じるコールバック */
	onClose: () => void;
	/** 削除対象のユーザー */
	user: User | null;
	/** アクションデータ */
	actionData?: any;
}

/**
 * ユーザー削除確認ダイアログ
 *
 * 機能：
 * - ユーザー情報表示
 * - 削除確認
 * - 削除処理実行
 */
export const DeleteUserDialog = ({
	isOpen,
	onClose,
	user,
	actionData,
}: DeleteUserDialogProps) => {
	const location = useLocation();

	if (!user) return null;

	return (
		<Dialog
			isOpen={isOpen}
			title="ユーザー削除の確認"
			onClose={onClose}
			maxWidth="max-w-md"
		>
			<div className="space-y-4">
				<p>以下のユーザーを削除してもよろしいですか？</p>

				{/* ユーザー情報表示 */}
				<div className="p-3 bg-gray-50 rounded-lg">
					<div className="text-sm">
						<p>
							<strong>ユーザーID:</strong> {user.id}
						</p>
						<p>
							<strong>最大同時ジョブ数:</strong> {user.max_concurrent_jobs}
						</p>
						<p>
							<strong>アクティブ:</strong> {user.is_active ? "有効" : "無効"}
						</p>
						{user.created_at && (
							<p>
								<strong>作成日時:</strong>{" "}
								{new Date(user.created_at).toLocaleString("ja-JP")}
							</p>
						)}
					</div>
				</div>

				{/* 警告メッセージ */}
				<div className="p-3 bg-red-50 rounded-lg">
					<p className="text-sm text-red-800">
						<strong>注意:</strong>{" "}
						この操作は取り消すことができません。このユーザーが作成したジョブへの参照も削除される可能性があります。
					</p>
				</div>

				{/* アクションボタン */}
				<div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4 border-t">
					<Button variant="outline" onClick={onClose} className="mt-3 sm:mt-0">
						{BUTTONS.CANCEL}
					</Button>

					<Form method="post" action={location.pathname}>
						<input type="hidden" name="intent" value="delete-user" />
						<input type="hidden" name="id" value={user.id} />
						<Button type="submit" variant="destructive" onClick={onClose}>
							削除する
						</Button>
					</Form>
				</div>
			</div>
		</Dialog>
	);
};
