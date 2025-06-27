import { Form, useNavigation } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Select } from "~/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import { FileUpload } from "~/components/ui/file-upload";
import { FORM_LABELS, BUTTONS, PLACEHOLDERS, PRIORITY_LEVELS, ERROR_MESSAGES } from "~/lib/messages";
import type { User, Node } from "~/lib/dbOperations";
import { useState, useEffect } from "react";
import * as React from "react";
import { calculateLicenseTokens } from "~/lib/licenseCalculator";

interface NewJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  nodes: Node[];
  actionData?: any;
}

export function NewJobModal({ isOpen, onClose, users, nodes, actionData }: NewJobModalProps) {
  const navigation = useNavigation();
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedNodeId, setSelectedNodeId] = useState<string>("");
  const [selectedCores, setSelectedCores] = useState<string>("2");
  const [selectedPriority, setSelectedPriority] = useState<string>("normal");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jobName, setJobName] = useState<string>("");
  const [formError, setFormError] = useState<string>("");
  
  // Check if form is being submitted
  const isSubmitting = navigation.state === "submitting" && 
    navigation.formMethod === "POST" &&
    navigation.formData?.get("intent") === "create-job";

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
      setSelectedFile(null);
      setJobName("");
      setFormError("");
    }
  }, [isOpen]);

  // Handle file selection and auto-set job name
  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file);
    
    // Auto-set job name if it's empty and a file is selected
    if (file && !jobName.trim()) {
      // Remove file extension from filename
      const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
      setJobName(nameWithoutExtension);
    }
  };

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
                     selectedFile &&
                     isValidCores;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Job</DialogTitle>
        </DialogHeader>
        
        <Form 
            method="post" 
            action="?index"
            className="space-y-4" 
            id="new-job-form"
            encType="multipart/form-data"
          >
          <input type="hidden" name="intent" value="create-job" />
          
          <div className="space-y-4">
            {/* INP File Upload */}
            <div className="space-y-2">
              <Label>{FORM_LABELS.INP_FILE}</Label>
              <FileUpload
                name="inp_file"
                onFileSelect={handleFileSelect}
                acceptedTypes={['.inp']}
                maxSize={100 * 1024 * 1024} // 100MB
              />
            </div>

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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
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
                disabled={isSubmitting || !selectedNodeId}
                required
              />
              {!selectedNodeId && (
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
                disabled={isSubmitting}
              >
                {Object.entries(PRIORITY_LEVELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Error Display */}
          {formError && (
            <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
              {formError}
            </div>
          )}


          <DialogFooter>
            <Button 
              type="button" 
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
              {isSubmitting ? BUTTONS.SAVING : BUTTONS.CREATE_JOB}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}