// YAGNI violation removed: This file was just a thin wrapper around JobActionDialog
// Use JobActionDialog directly instead of this wrapper

import type { Job } from "~/lib/core/types/database";
import { JobActionDialog } from "./shared/JobActionDialog";
import { useJobDeleteSubmission } from "./shared/useFormSubmission";
import { JobStatusRules } from "./shared/JobStatusUtils";

interface DeleteJobDialogProps {
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
export function DeleteJobDialog({ isOpen, onClose, job, actionData }: DeleteJobDialogProps) {
  const { isSubmitting } = useJobDeleteSubmission();

  if (!job) return null;

  const canDelete = JobStatusRules.canDelete(job.status);

  return (
    <JobActionDialog
      isOpen={isOpen}
      onClose={onClose}
      job={job}
      actionType="delete"
      isSubmitting={isSubmitting}
      canPerformAction={canDelete}
      actionData={actionData}
    />
  );
}