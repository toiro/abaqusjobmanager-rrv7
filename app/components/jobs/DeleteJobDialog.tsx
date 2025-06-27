import { Form, useNavigation } from "react-router";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "~/components/ui/dialog";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { BUTTONS, CONFIRM_MESSAGES, INFO_MESSAGES } from "~/lib/messages";
import type { Job } from "~/lib/dbOperations";

interface DeleteJobDialogProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job | null;
  actionData?: any;
}

export function DeleteJobDialog({ isOpen, onClose, job, actionData }: DeleteJobDialogProps) {
  const navigation = useNavigation();
  
  // Check if form is being submitted
  const isSubmitting = navigation.state === "submitting" && 
    navigation.formMethod === "POST" &&
    navigation.formData?.get("intent") === "delete-job";

  if (!job) return null;

  const canDelete = ['completed', 'failed', 'missing'].includes(job.status);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Job</DialogTitle>
          <DialogDescription>
            {CONFIRM_MESSAGES.DELETE_JOB}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Job Information */}
          <Alert>
            <AlertDescription>
              <div className="space-y-1">
                <p><strong>Job Name:</strong> {job.name}</p>
                <p><strong>Status:</strong> {job.status}</p>
                <p><strong>Created:</strong> {job.created_at ? new Date(job.created_at).toLocaleString() : '-'}</p>
              </div>
            </AlertDescription>
          </Alert>

          {/* Validation Warning */}
          {!canDelete && (
            <Alert variant="destructive">
              <AlertDescription>
                {INFO_MESSAGES.CANNOT_DELETE_ACTIVE_JOB}
              </AlertDescription>
            </Alert>
          )}

          {/* Error Display */}
          {actionData?.error && (
            <Alert variant="destructive">
              <AlertDescription>
                {actionData.error}
              </AlertDescription>
            </Alert>
          )}

          {/* Success Display */}
          {actionData?.success && (
            <Alert>
              <AlertDescription>
                {actionData.success}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isSubmitting}
          >
            {BUTTONS.CANCEL}
          </Button>
          {canDelete && (
            <Form method="post" action="?index" style={{ display: 'inline' }}>
              <input type="hidden" name="intent" value="delete-job" />
              <input type="hidden" name="job_id" value={job.id} />
              <Button 
                type="submit"
                variant="destructive"
                disabled={isSubmitting}
              >
                {isSubmitting ? BUTTONS.DELETING : BUTTONS.DELETE}
              </Button>
            </Form>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}