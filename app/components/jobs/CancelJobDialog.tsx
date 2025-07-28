// YAGNI violation removed: This file was just a thin wrapper around JobActionDialog
// Use JobActionDialog directly instead of this wrapper

import type { Job } from "~/lib/core/types/database";
import { JobActionDialog } from "./shared/JobActionDialog";
import { useJobCancelSubmission } from "./shared/useFormSubmission";
import { JobStatusRules } from "./shared/JobStatusUtils";

interface CancelJobDialogProps {
	isOpen: boolean;
	onClose: () => void;
	job: Job | null;
	actionData?: {
		success?: boolean;
		message?: string;
		error?: string;
	};
}

// This component is kept for backward compatibility but should be replaced with direct JobActionDialog usage
export function CancelJobDialog({
	isOpen,
	onClose,
	job,
	actionData,
}: CancelJobDialogProps) {
	const { isSubmitting } = useJobCancelSubmission();

	if (!job) return null;

	const canCancel = JobStatusRules.canCancel(job.status);

	return (
		<JobActionDialog
			isOpen={isOpen}
			onClose={onClose}
			job={job}
			actionType="cancel"
			isSubmitting={isSubmitting}
			canPerformAction={canCancel}
			actionData={actionData}
		/>
	);
}
