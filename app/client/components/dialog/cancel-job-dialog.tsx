/**
 * CancelJobDialog - ジョブキャンセル確認ダイアログ
 * Dialogを使用したジョブキャンセル確認UI
 */

import type { Job } from "~/shared/core/types/database";
import { Dialog } from "~/client/components/dialog";
import { Button } from "~/client/components/ui";
import { BUTTONS } from "~/client/constants/messages";
import { Form, useLocation } from "react-router";

export interface CancelJobDialogProps {
	/** ダイアログの開閉状態 */
	isOpen: boolean;
	/** ダイアログを閉じるコールバック */
	onClose: () => void;
	/** キャンセル対象のジョブ */
	job: Job | null;
}

/**
 * ジョブキャンセル確認ダイアログ
 *
 * 機能：
 * - ジョブ情報表示
 * - キャンセル確認
 * - キャンセル処理実行
 */
export const CancelJobDialog = ({
	isOpen,
	onClose,
	job,
}: CancelJobDialogProps) => {
	const location = useLocation();

	if (!job) return null;

	return (
		<Dialog
			isOpen={isOpen}
			title="Confirm Job Cancellation"
			onClose={onClose}
			maxWidth="max-w-md"
		>
			<div className="space-y-4">
				<p>Are you sure you want to cancel the following job?</p>

				{/* ジョブ情報表示 */}
				<div className="p-3 bg-gray-50 rounded-lg">
					<div className="text-sm">
						<p>
							<strong>ジョブ名:</strong> {job.name}
						</p>
						<p>
							<strong>ID:</strong> #{job.id}
						</p>
						<p>
							<strong>ステータス:</strong> {job.status}
						</p>
						{job.start_time && (
							<p>
								<strong>開始時刻:</strong>{" "}
								{new Date(job.start_time).toLocaleString("ja-JP")}
							</p>
						)}
					</div>
				</div>

				{/* 警告メッセージ */}
				<div className="p-3 bg-yellow-50 rounded-lg">
					<p className="text-sm text-yellow-800">
						<strong>注意:</strong>{" "}
						実行中のジョブをキャンセルすると、処理が中断され、結果ファイルが不完全になる可能性があります。
					</p>
				</div>

				{/* アクションボタン */}
				<div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4 border-t">
					<Button variant="outline" onClick={onClose} className="mt-3 sm:mt-0">
						{BUTTONS.CANCEL}
					</Button>

					<Form method="post" action={location.pathname}>
						<input type="hidden" name="intent" value="cancel-job" />
						<input type="hidden" name="id" value={job.id} />
						<Button type="submit" variant="destructive" onClick={onClose}>
							キャンセルする
						</Button>
					</Form>
				</div>
			</div>
		</Dialog>
	);
};
