/**
 * DeleteFileDialog - ファイル削除確認ダイアログ
 * Dialogを使用したファイル削除確認UI
 */

import type { FileWithJob } from "~/shared/core/database/types/file-with-jobs";
import { Dialog } from "~/client/components/dialog";
import { Button } from "~/client/components/ui";
import { BUTTONS } from "~/client/constants/messages";
import { Form, useLocation } from "react-router";
import { formatFileSize } from "~/shared/utils/utils";

export interface DeleteFileDialogProps {
	/** ダイアログの開閉状態 */
	isOpen: boolean;
	/** ダイアログを閉じるコールバック */
	onClose: () => void;
	/** 削除対象のファイル */
	file: FileWithJob | null;
	/** アクションデータ */
	actionData?: any;
}

/**
 * ファイル削除確認ダイアログ
 *
 * 機能：
 * - ファイル情報表示
 * - 関連ジョブ情報表示
 * - 削除確認
 * - 削除処理実行
 */
export const DeleteFileDialog = ({
	isOpen,
	onClose,
	file,
	actionData,
}: DeleteFileDialogProps) => {
	const location = useLocation();

	if (!file) return null;

	return (
		<Dialog
			isOpen={isOpen}
			title="ファイル削除の確認"
			onClose={onClose}
			maxWidth="max-w-md"
		>
			<div className="space-y-4">
				<p>以下のファイルを削除してもよろしいですか？</p>

				{/* ファイル情報表示 */}
				<div className="p-3 bg-gray-50 rounded-lg">
					<div className="text-sm">
						<p>
							<strong>ファイル名:</strong> {file.original_name}
						</p>
						<p>
							<strong>ファイルID:</strong> #{file.id}
						</p>
						<p>
							<strong>ファイルサイズ:</strong> {formatFileSize(file.file_size)}
						</p>
						<p>
							<strong>ファイルタイプ:</strong> {file.mime_type}
						</p>
						{file.created_at && (
							<p>
								<strong>作成日時:</strong>{" "}
								{new Date(file.created_at).toLocaleString("ja-JP")}
							</p>
						)}
					</div>
				</div>

				{/* 関連ジョブ情報 */}
				{file.referencingJob && (
					<div className="p-3 bg-blue-50 rounded-lg">
						<p className="text-sm text-blue-800">
							<strong>関連ジョブ:</strong> {file.referencingJob.jobName} (ID: #
							{file.referencingJob.jobId})
						</p>
						<p className="text-sm text-blue-700 mt-1">
							このファイルは上記のジョブで使用されています。
						</p>
					</div>
				)}

				{/* 警告メッセージ */}
				<div className="p-3 bg-red-50 rounded-lg">
					<p className="text-sm text-red-800">
						<strong>注意:</strong>{" "}
						この操作は取り消すことができません。物理ファイルも削除されます。
						{file.referencingJob &&
							" 関連するジョブに影響する可能性があります。"}
					</p>
				</div>

				{/* アクションボタン */}
				<div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4 border-t">
					<Button variant="outline" onClick={onClose} className="mt-3 sm:mt-0">
						{BUTTONS.CANCEL}
					</Button>

					<Form method="post" action={location.pathname}>
						<input type="hidden" name="intent" value="delete-file" />
						<input type="hidden" name="id" value={file.id} />
						<Button type="submit" variant="destructive" onClick={onClose}>
							削除する
						</Button>
					</Form>
				</div>
			</div>
		</Dialog>
	);
};
