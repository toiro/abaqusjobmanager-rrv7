/**
 * DeleteNodeDialog - ノード削除確認ダイアログ
 * Dialogを使用したノード削除確認UI
 */

import type { Node } from "~/shared/core/types/database";
import { Dialog } from "~/client/components/dialog";
import { Button } from "~/client/components/ui";
import { BUTTONS } from "~/client/constants/messages";
import { Form, useLocation } from "react-router";

export interface DeleteNodeDialogProps {
	/** ダイアログの開閉状態 */
	isOpen: boolean;
	/** ダイアログを閉じるコールバック */
	onClose: () => void;
	/** 削除対象のノード */
	node: Node | null;
	/** アクションデータ */
	actionData?: any;
}

/**
 * ノード削除確認ダイアログ
 *
 * 機能：
 * - ノード情報表示
 * - 削除確認
 * - 削除処理実行
 */
export const DeleteNodeDialog = ({
	isOpen,
	onClose,
	node,
	actionData,
}: DeleteNodeDialogProps) => {
	const location = useLocation();

	if (!node) return null;

	return (
		<Dialog
			isOpen={isOpen}
			title="ノード削除の確認"
			onClose={onClose}
			maxWidth="max-w-md"
		>
			<div className="space-y-4">
				<p>以下のノードを削除してもよろしいですか？</p>

				{/* ノード情報表示 */}
				<div className="p-3 bg-gray-50 rounded-lg">
					<div className="text-sm">
						<p>
							<strong>ノード名:</strong> {node.name}
						</p>
						<p>
							<strong>ホスト名:</strong> {node.hostname}
						</p>
						<p>
							<strong>ノードID:</strong> #{node.id}
						</p>
						<p>
							<strong>CPUコア数:</strong> {node.cpu_cores_limit || "不明"}
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

				{/* 警告メッセージ */}
				<div className="p-3 bg-red-50 rounded-lg">
					<p className="text-sm text-red-800">
						<strong>注意:</strong>{" "}
						この操作は取り消すことができません。このノードで実行中のジョブがある場合、処理が中断される可能性があります。
					</p>
				</div>

				{/* アクションボタン */}
				<div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4 border-t">
					<Button variant="outline" onClick={onClose} className="mt-3 sm:mt-0">
						{BUTTONS.CANCEL}
					</Button>

					<Form method="post" action={location.pathname}>
						<input type="hidden" name="intent" value="delete-node" />
						<input type="hidden" name="id" value={node.id} />
						<Button type="submit" variant="destructive" onClick={onClose}>
							削除する
						</Button>
					</Form>
				</div>
			</div>
		</Dialog>
	);
};
