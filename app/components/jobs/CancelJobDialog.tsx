import { Form, useNavigation } from "react-router";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "~/components/ui/dialog";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { BUTTONS, CONFIRM_MESSAGES, INFO_MESSAGES } from "~/lib/messages";
import type { Job } from "~/lib/core/database";

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

export function CancelJobDialog({ isOpen, onClose, job, actionData }: CancelJobDialogProps) {
  const navigation = useNavigation();
  
  // Check if form is being submitted
  const isSubmitting = navigation.state === "submitting" && 
    navigation.formMethod === "POST" &&
    navigation.formData?.get("intent") === "cancel-job";

  if (!job) return null;

  const canCancel = ['waiting', 'starting', 'running'].includes(job.status);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel Job</DialogTitle>
          <DialogDescription>
            {CONFIRM_MESSAGES.CANCEL_JOB}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Job Information */}
          <Alert>
            <AlertDescription>
              <div className="space-y-1">
                <p><strong>Job Name:</strong> {job.name}</p>
                <p><strong>Status:</strong> {job.status}</p>
                <p><strong>Node:</strong> {job.node_id ? `Node ${job.node_id}` : 'Unassigned'}</p>
                <p><strong>CPU Cores:</strong> {job.cpu_cores}</p>
              </div>
            </AlertDescription>
          </Alert>

          {/* Status-specific warnings */}
          {job.status === 'running' && (
            <Alert variant="destructive">
              <AlertDescription>
                {INFO_MESSAGES.CANCEL_RUNNING_JOB_WARNING}
              </AlertDescription>
            </Alert>
          )}

          {/* Validation Warning */}
          {!canCancel && (
            <Alert variant="destructive">
              <AlertDescription>
                {INFO_MESSAGES.CANNOT_CANCEL_JOB}
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
            {BUTTONS.KEEP_JOB}
          </Button>
          {canCancel && (
            <Form method="post" action="?index" style={{ display: 'inline' }}>
              <input type="hidden" name="intent" value="cancel-job" />
              <input type="hidden" name="job_id" value={job.id} />
              <Button 
                type="submit"
                variant="destructive"
                disabled={isSubmitting}
              >
                {isSubmitting ? BUTTONS.CANCELLING : BUTTONS.CANCEL_JOB}
              </Button>
            </Form>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}