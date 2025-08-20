/**
 * DeleteJobDialog - Job Delete Confirmation Dialog
 * Dialog component for job deletion confirmation
 */

import type { Job } from "~/shared/core/types/database";
import { Dialog, useDialog } from "~/client/components/dialog";
import { Button } from "~/client/components/ui";
import { BUTTONS } from "~/client/constants/messages";
import { Form, useLocation } from "react-router";

export interface DeleteJobDialogProps {
	/** Dialog open/close state */
	isOpen: boolean;
	/** Dialog close callback */
	onClose: () => void;
	/** Job to delete */
	job: Job | null;
}

/**
 * Job Delete Confirmation Dialog
 *
 * Features:
 * - Job information display
 * - Delete confirmation
 * - Delete execution
 */
export const DeleteJobDialog = ({
	isOpen,
	onClose,
	job,
}: DeleteJobDialogProps) => {
	const location = useLocation();

	if (!job) return null;

	return (
		<Dialog
			isOpen={isOpen}
			title="Confirm Job Deletion"
			onClose={onClose}
			maxWidth="max-w-md"
		>
			<div className="space-y-4">
				<p>Are you sure you want to delete the following job?</p>

				{/* Job Information Display */}
				<div className="p-3 bg-gray-50 rounded-lg">
					<div className="text-sm">
						<p>
							<strong>Job Name:</strong> {job.name}
						</p>
						<p>
							<strong>ID:</strong> #{job.id}
						</p>
						<p>
							<strong>Status:</strong> {job.status}
						</p>
						{job.created_at && (
							<p>
								<strong>Created:</strong>{" "}
								{new Date(job.created_at).toLocaleString("en-US")}
							</p>
						)}
					</div>
				</div>

				{/* Warning Message */}
				<div className="p-3 bg-red-50 rounded-lg">
					<p className="text-sm text-red-800">
						<strong>Warning:</strong> This action cannot be undone. Associated
						files and logs may also be deleted.
					</p>
				</div>

				{/* アクションボタン */}
				<div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4 border-t">
					<Button variant="outline" onClick={onClose} className="mt-3 sm:mt-0">
						{BUTTONS.CANCEL}
					</Button>

					<Form method="post" action={location.pathname}>
						<input type="hidden" name="intent" value="delete-job" />
						<input type="hidden" name="id" value={job.id} />
						<Button type="submit" variant="destructive" onClick={onClose}>
							Delete Job
						</Button>
					</Form>
				</div>
			</div>
		</Dialog>
	);
};
