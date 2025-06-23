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
import { calculateLicenseTokens } from "~/lib/licenseCalculator";

interface NewJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  nodes: Node[];
  actionData?: { success?: string; error?: string; jobId?: number } | null;
}

export function NewJobModal({ isOpen, onClose, users, nodes, actionData }: NewJobModalProps) {
  const navigation = useNavigation();
  const [selectedNodeId, setSelectedNodeId] = useState<string>("");
  const [selectedCores, setSelectedCores] = useState<string>("1");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jobName, setJobName] = useState<string>("");
  const [formError, setFormError] = useState<string>("");
  
  // Check if form is being submitted
  const isSubmitting = navigation.state === "submitting" && 
    navigation.formMethod === "POST" &&
    navigation.formData?.get("intent") === "create-job";
  
  
  // Update form error from action result
  useEffect(() => {
    if (actionData?.error) {
      setFormError(actionData.error);
    }
  }, [actionData]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      // Reset form state when modal closes
      setSelectedNodeId("");
      setSelectedCores("1");
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


  const selectedNode = nodes.find(node => node.id === parseInt(selectedNodeId));
  const maxCores = selectedNode?.max_cpu_cores || 1;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    // Validate file selection
    if (!selectedFile) {
      setFormError(ERROR_MESSAGES.FILE_REQUIRED);
      event.preventDefault();
      return;
    }
    
    setFormError("");
    // Form will be submitted normally
  };

  return (
    <Dialog open={isOpen} onOpenChange={isSubmitting ? undefined : onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Job</DialogTitle>
        </DialogHeader>
        
        <div className="relative">
          {isSubmitting && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
              <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg shadow-lg border">
                <svg 
                  className="h-5 w-5 animate-spin text-blue-600" 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24"
                >
                  <circle 
                    className="opacity-25" 
                    cx="12" 
                    cy="12" 
                    r="10" 
                    stroke="currentColor" 
                    strokeWidth="4"
                  />
                  <path 
                    className="opacity-75" 
                    fill="currentColor" 
                    d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span className="text-sm font-medium text-gray-700">Creating job...</span>
              </div>
            </div>
          )}
          <Form method="post" onSubmit={handleSubmit} encType="multipart/form-data">
          <input type="hidden" name="intent" value="create-job" />
          
          <div className="grid gap-4 py-4">
            {/* INP File Upload - First */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">
                {FORM_LABELS.INP_FILE}
              </Label>
              <div className="col-span-3">
                <FileUpload
                  name="inp_file"
                  onFileSelect={handleFileSelect}
                  acceptedTypes={['.inp']}
                  maxSize={100 * 1024 * 1024} // 100MB
                />
              </div>
            </div>

            {/* Job Name - Auto-filled from file */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                {FORM_LABELS.JOB_NAME}
              </Label>
              <Input
                id="name"
                name="name"
                value={jobName}
                onChange={(e) => setJobName(e.target.value)}
                placeholder={PLACEHOLDERS.ENTER_JOB_NAME}
                className="col-span-3"
                required
                minLength={3}
                maxLength={50}
              />
            </div>

            {/* User Selection */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="user_id" className="text-right">
                User
              </Label>
              <Select 
                id="user_id"
                name="user_id" 
                className="col-span-3"
                placeholder={PLACEHOLDERS.SELECT_USER}
                required
              >
                {users.map(user => (
                  <option key={user.id} value={user.id!.toString()}>
                    {user.display_name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Node Selection */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="node_id" className="text-right">
                {FORM_LABELS.EXECUTION_NODE}
              </Label>
              <Select 
                id="node_id"
                name="node_id" 
                className="col-span-3"
                placeholder={PLACEHOLDERS.SELECT_NODE}
                value={selectedNodeId}
                onChange={(e) => setSelectedNodeId(e.target.value)}
                required
              >
                {nodes.filter(node => node.status === 'available').map(node => (
                  <option key={node.id} value={node.id!.toString()}>
                    {node.name} ({node.max_cpu_cores} cores)
                  </option>
                ))}
              </Select>
            </div>

            {/* CPU Cores */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cpu_cores" className="text-right">
                {FORM_LABELS.CPU_CORES}
              </Label>
              <Select 
                id="cpu_cores"
                name="cpu_cores"
                className="col-span-3"
                value={selectedCores}
                onChange={(e) => setSelectedCores(e.target.value)}
                required
              >
                {Array.from({ length: maxCores }, (_, i) => i + 1).map(cores => (
                  <option key={cores} value={cores.toString()}>
                    {cores} core{cores > 1 ? 's' : ''}
                  </option>
                ))}
              </Select>
            </div>

            {/* License Tokens (Display only) */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                License Tokens
              </Label>
              <div className="col-span-3 px-3 py-2 bg-muted rounded-md text-sm">
                {calculateLicenseTokens(parseInt(selectedCores) || 1)} token{calculateLicenseTokens(parseInt(selectedCores) || 1) > 1 ? 's' : ''} (auto-calculated)
              </div>
            </div>

            {/* Priority */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="priority" className="text-right">
                {FORM_LABELS.PRIORITY}
              </Label>
              <Select 
                id="priority"
                name="priority" 
                className="col-span-3"
                defaultValue="normal"
              >
                <option value="low">{PRIORITY_LEVELS.LOW}</option>
                <option value="normal">{PRIORITY_LEVELS.NORMAL}</option>
                <option value="high">{PRIORITY_LEVELS.HIGH}</option>
                <option value="urgent">{PRIORITY_LEVELS.URGENT}</option>
              </Select>
            </div>
          </div>

          {formError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{formError}</p>
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
              disabled={!selectedFile || isSubmitting}
              className="flex items-center gap-2"
            >
              {isSubmitting && (
                <svg 
                  className="h-4 w-4 animate-spin" 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24"
                >
                  <circle 
                    className="opacity-25" 
                    cx="12" 
                    cy="12" 
                    r="10" 
                    stroke="currentColor" 
                    strokeWidth="4"
                  />
                  <path 
                    className="opacity-75" 
                    fill="currentColor" 
                    d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              )}
              {isSubmitting ? "Creating..." : BUTTONS.CREATE_JOB}
            </Button>
          </DialogFooter>
        </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}