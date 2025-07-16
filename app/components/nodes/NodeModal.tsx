/**
 * Unified Node Modal Component
 * Handles both create and edit operations for compute nodes
 * Now using BaseDialog for consistent behavior
 */

import { Input, Label, Select } from "~/components/ui";
import { BaseDialog, type BaseDialogConfig } from "~/components/shared/BaseDialog";
import type { Node } from "~/lib/core/types/database";
import { useState, useEffect } from "react";

type NodeModalMode = 'create' | 'edit';

interface NodeModalProps {
  mode: NodeModalMode;
  isOpen: boolean;
  onClose: () => void;
  node?: Node | null; // Required for edit mode
  actionData?: {
    success?: boolean | string;
    error?: string;
    message?: string;
  };
}

export function NodeModal({ 
  mode, 
  isOpen, 
  onClose, 
  node, 
  actionData 
}: NodeModalProps) {

  // Form state
  const [name, setName] = useState("");
  const [hostname, setHostname] = useState("");
  const [sshPort, setSshPort] = useState("22");
  const [maxCpuCores, setMaxCpuCores] = useState("4");
  const [isActive, setIsActive] = useState(true);

  // Mode-specific logic
  const isCreateMode = mode === 'create';
  const isEditMode = mode === 'edit';

  // Initialize form with node data when editing
  useEffect(() => {
    if (isOpen) {
      if (isEditMode && node) {
        setName(node.name);
        setHostname(node.hostname);
        setSshPort(node.ssh_port?.toString() || "22");
        setMaxCpuCores(node.cpu_cores_limit?.toString() || "4");
        setIsActive(node.is_active ?? true);
      } else {
        // Reset for create mode
        setName("");
        setHostname("");
        setSshPort("22");
        setMaxCpuCores("4");
        setIsActive(true);
      }
    }
  }, [isOpen, mode, node]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setName("");
      setHostname("");
      setSshPort("22");
      setMaxCpuCores("4");
      setIsActive(true);
    }
  }, [isOpen]);


  // Validation
  const isFormValid = name.trim().length >= 2 && 
                     hostname.trim().length >= 3 && 
                     parseInt(sshPort) > 0 && parseInt(sshPort) <= 65535 &&
                     parseInt(maxCpuCores) >= 1 && parseInt(maxCpuCores) <= 128;

  // Dialog configuration
  const config: BaseDialogConfig = {
    title: isCreateMode ? "Add New Node" : `Edit Node: ${node?.name || ''}`,
    intent: isCreateMode ? "create-node" : "edit-node",
    submitText: isCreateMode ? "Add Node" : "Save Changes",
    submittingText: "Saving..."
  };

  // Hidden fields for edit mode
  const hiddenFields = isEditMode && node?.id ? { node_id: node.id } : undefined;

  // Early return for edit mode without node
  if (isEditMode && !node) return null;

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      config={config}
      isFormValid={isFormValid}
      actionData={actionData}
      hiddenFields={hiddenFields}
    >
      {/* Node Name */}
      <div className="space-y-2">
        <Label htmlFor="node-name">Node Name</Label>
        <Input
          id="node-name"
          name="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., compute-01"
          required
          minLength={2}
        />
      </div>

      {/* Hostname */}
      <div className="space-y-2">
        <Label htmlFor="hostname">Hostname</Label>
        <Input
          id="hostname"
          name="hostname"
          type="text"
          value={hostname}
          onChange={(e) => setHostname(e.target.value)}
          placeholder="e.g., 192.168.1.100 or server.domain.com"
          required
          minLength={3}
        />
      </div>

      {/* SSH Port */}
      <div className="space-y-2">
        <Label htmlFor="ssh-port">SSH Port</Label>
        <Input
          id="ssh-port"
          name="ssh_port"
          type="number"
          min="1"
          max="65535"
          value={sshPort}
          onChange={(e) => setSshPort(e.target.value)}
          required
        />
      </div>

      {/* Max CPU Cores */}
      <div className="space-y-2">
        <Label htmlFor="max-cpu-cores">Maximum CPU Cores</Label>
        <Input
          id="max-cpu-cores"
          name="cpu_cores_limit"
          type="number"
          min="1"
          max="128"
          value={maxCpuCores}
          onChange={(e) => setMaxCpuCores(e.target.value)}
          required
        />
        <p className="text-sm text-muted-foreground">
          Number of CPU cores available for job execution
        </p>
      </div>

      {/* Active Status */}
      <div className="space-y-2">
        <Label htmlFor="is-active">Status</Label>
        <Select
          id="is-active"
          name="is_active"
          value={isActive ? "true" : "false"}
          onChange={(e) => setIsActive(e.target.value === "true")}
        >
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </Select>
        <p className="text-sm text-muted-foreground">
          Only active nodes can accept new jobs
        </p>
      </div>
    </BaseDialog>
  );
}

// Convenience wrapper components for backward compatibility
export function NewNodeModal(props: Omit<NodeModalProps, 'mode'>) {
  return <NodeModal {...props} mode="create" />;
}

export function EditNodeModal(props: Omit<NodeModalProps, 'mode'>) {
  return <NodeModal {...props} mode="edit" />;
}