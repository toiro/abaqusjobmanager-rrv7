import { Form, useNavigation } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Select } from "~/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "~/components/ui/dialog";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Label } from "~/components/ui/label";
import { FORM_LABELS, BUTTONS, PLACEHOLDERS, PRIORITY_LEVELS, ERROR_MESSAGES, INFO_MESSAGES } from "~/lib/messages";
import type { User, Node, Job } from "~/lib/core/database";
import { useState, useEffect } from "react";
import { calculateLicenseTokens } from "~/lib/services/license/license-calculator";

interface EditJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job | null;
  users: User[];
  nodes: Node[];
  actionData?: {
    success?: boolean;
    message?: string;
    error?: string;
  };
}

export function EditJobModal({ isOpen, onClose, job, users, nodes, actionData }: EditJobModalProps) {
  const navigation = useNavigation();
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedNodeId, setSelectedNodeId] = useState<string>("");
  const [selectedCores, setSelectedCores] = useState<string>("2");
  const [selectedPriority, setSelectedPriority] = useState<string>("normal");
  const [jobName, setJobName] = useState<string>("");
  const [formError, setFormError] = useState<string>("");
  
  // Check if form is being submitted
  const isSubmitting = navigation.state === "submitting" && 
    navigation.formMethod === "POST" &&
    navigation.formData?.get("intent") === "edit-job";

  // Initialize form with job data
  useEffect(() => {
    if (job && isOpen) {
      setJobName(job.name);
      setSelectedUserId(job.user_id?.toString() || "");
      setSelectedNodeId(job.node_id?.toString() || "");
      setSelectedCores(job.cpu_cores?.toString() || "2");
      setSelectedPriority(job.priority || "normal");
      setFormError("");
    }
  }, [job, isOpen]);

  // Update form error from action result
  useEffect(() => {
    if (actionData?.error || (actionData && !actionData.success)) {
      setFormError(actionData?.error || actionData?.message || 'An error occurred');
    }
  }, [actionData]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedUserId("");
      setSelectedNodeId("");
      setSelectedCores("2");
      setSelectedPriority("normal");
      setJobName("");
      setFormError("");
    }
  }, [isOpen]);

  if (!job) return null;

  // Check if job can be edited
  const canEdit = job.status === 'waiting';

  // Get selected node for core validation
  const selectedNode = nodes.find(node => node.id === parseInt(selectedNodeId));
  const maxCores = selectedNode?.max_cpu_cores || 1;
  const coresNumber = parseInt(selectedCores) || 2;
  const licenseTokens = calculateLicenseTokens(coresNumber);

  // Validation
  const isValidCores = selectedNodeId && coresNumber >= 1 && coresNumber <= maxCores;
  const isFormValid = jobName.trim().length >= 3 && 
                     selectedUserId && 
                     selectedNodeId && 
                     isValidCores &&
                     canEdit;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Job: {job.name}</DialogTitle>
        </DialogHeader>
        
        {/* Status validation warning */}
        {!canEdit && (
          <Alert variant="destructive">
            <AlertDescription>
              {INFO_MESSAGES.CANNOT_EDIT_NON_WAITING_JOB}. Current status: {job.status}
            </AlertDescription>
          </Alert>
        )}
        
        <Form 
          method="post" 
          action="?index"
          className="space-y-4" 
          id="edit-job-form"
        >
          <input type="hidden" name="intent" value="edit-job" />
          <input type="hidden" name="job_id" value={job.id} />
          
          {/* Job Name */}
          <div className="space-y-2">
            <Label htmlFor="job-name">{FORM_LABELS.JOB_NAME}</Label>
            <Input
              id="job-name"
              name="name"
              type="text"
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              placeholder={PLACEHOLDERS.JOB_NAME}
              required
              minLength={3}
              disabled={isSubmitting || !canEdit}
            />
          </div>

          {/* User Selection */}
          <div className="space-y-2">
            <Label htmlFor="user-select">{FORM_LABELS.USER}</Label>
            <Select
              id="user-select"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              name="user_id"
              disabled={isSubmitting || !canEdit}
            >
              <option value="">{PLACEHOLDERS.SELECT_USER}</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.display_name}
                </option>
              ))}
            </Select>
          </div>

          {/* Node Selection */}
          <div className="space-y-2">
            <Label htmlFor="node-select">{FORM_LABELS.NODE}</Label>
            <Select
              id="node-select"
              value={selectedNodeId}
              onChange={(e) => setSelectedNodeId(e.target.value)}
              name="node_id"
              disabled={isSubmitting || !canEdit}
            >
              <option value="">{PLACEHOLDERS.SELECT_NODE}</option>
              {nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.name} ({node.max_cpu_cores} cores max)
                </option>
              ))}
            </Select>
          </div>

          {/* CPU Cores */}
          <div className="space-y-2">
            <Label htmlFor="cpu-cores">{FORM_LABELS.CPU_CORES}</Label>
            <Input
              id="cpu-cores"
              name="cpu_cores"
              type="number"
              min="1"
              max={maxCores}
              value={selectedCores}
              onChange={(e) => setSelectedCores(e.target.value)}
              disabled={isSubmitting || !canEdit || !selectedNodeId}
              required
            />
            {!selectedNodeId && canEdit && (
              <p className="text-sm text-muted-foreground">
                Please select a node first
              </p>
            )}
            {selectedNode && (
              <p className="text-sm text-muted-foreground">
                Max {maxCores} cores available on {selectedNode.name}
                {` • ${licenseTokens} license tokens required`}
              </p>
            )}
            {!isValidCores && selectedCores && selectedNodeId && (
              <p className="text-sm text-destructive">
                {ERROR_MESSAGES.INVALID_CPU_CORES.replace('{max}', maxCores.toString())}
              </p>
            )}
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority-select">{FORM_LABELS.PRIORITY}</Label>
            <Select
              id="priority-select"
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              name="priority"
              disabled={isSubmitting || !canEdit}
            >
              {Object.entries(PRIORITY_LEVELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          </div>

          {/* Error Display */}
          {formError && (
            <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
              {formError}
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={onClose}
              disabled={isSubmitting}
            >
              {BUTTONS.CANCEL}
            </Button>
            <Button 
              type="submit" 
              disabled={!isFormValid || isSubmitting}
            >
              {isSubmitting ? BUTTONS.SAVING : BUTTONS.SAVE_CHANGES}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}