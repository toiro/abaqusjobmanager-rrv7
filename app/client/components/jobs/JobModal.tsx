/**
 * Unified Job Modal Component
 * Consolidates NewJobModal and EditJobModal to eliminate 90% code duplication
 * Extracted following Kent Beck's "Tidy First" approach
 */

import { Form } from "react-router";
import { useState, useEffect } from "react";
import {
	Button,
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	Label,
	FileUpload,
	Alert,
	AlertDescription,
} from "~/client/components/ui";
import {
	BUTTONS,
	PLACEHOLDERS,
	PRIORITY_LEVELS,
	INFO_MESSAGES,
	FORM_LABELS,
} from "~/client/constants/messages";
import type { User, Node, Job } from "~/shared/core/types/database";
import {
	UserSelectionField,
	NodeSelectionField,
	CpuCoresField,
	PrioritySelectionField,
	JobNameField,
} from "./shared/JobFormFields";
import { useJobForm } from "./shared/useJobForm";
import {
	useJobCreateSubmission,
	useJobEditSubmission,
} from "./shared/useFormSubmission";
import { removeFileExtension } from "~/client/utils/formatting";
import { useNodeSSE } from "~/client/hooks/useSSE";
import { EVENT_TYPES } from "~/server/services/sse/sse-schemas";

type JobModalMode = "create" | "edit";

interface JobModalProps {
	mode: JobModalMode;
	isOpen: boolean;
	onClose: () => void;
	users: User[];
	nodes: Node[];
	job?: Job | null; // Required for edit mode
	actionData?: {
		success?: boolean;
		message?: string;
		error?: string;
		intent?: string;
	};
}

export function JobModal({
	mode,
	isOpen,
	onClose,
	users,
	nodes: initialNodes,
	job,
	actionData,
}: JobModalProps) {
	// Mode-specific hooks
	const { isSubmitting: isCreating } = useJobCreateSubmission();
	const { isSubmitting: isEditing } = useJobEditSubmission();
	const isSubmitting = mode === "create" ? isCreating : isEditing;

	// File upload state (only for create mode)
	const [selectedFile, setSelectedFile] = useState<File | null>(null);

	// Real-time node data state
	const [nodes, setNodes] = useState<Node[]>(initialNodes);

	// Update nodes when props change
	useEffect(() => {
		setNodes(initialNodes);
	}, [initialNodes]);

	// SSE connection for real-time node updates
	useNodeSSE((event) => {
		if (!event.data) return;

		const eventData = event.data as any;

		switch (event.type) {
			case EVENT_TYPES.NODE_UPDATED:
			case EVENT_TYPES.NODE_STATUS_CHANGED:
				if (eventData.nodeId) {
					setNodes((prevNodes) =>
						prevNodes.map((node) =>
							node.id === eventData.nodeId
								? {
										...node,
										status: eventData.status || node.status,
										name: eventData.nodeName || node.name,
										hostname: eventData.hostname || node.hostname,
										ssh_port: eventData.sshPort || node.ssh_port,
										cpu_cores_limit:
											eventData.cpuCoresLimit || node.cpu_cores_limit,
										license_token_limit:
											eventData.licenseTokenLimit || node.license_token_limit,
										is_active:
											eventData.isActive !== undefined
												? eventData.isActive
												: node.is_active,
									}
								: node,
						),
					);
				}
				break;

			case EVENT_TYPES.NODE_CREATED:
				// For new nodes, we might need to reload the full node list
				// For now, we'll just ignore creation events in the modal
				break;

			case EVENT_TYPES.NODE_DELETED:
				if (eventData.nodeId) {
					setNodes((prevNodes) =>
						prevNodes.filter((node) => node.id !== eventData.nodeId),
					);
				}
				break;
		}
	});

	// Form management
	const {
		selectedUserId,
		selectedNodeId,
		selectedCores,
		selectedPriority,
		jobName,
		formError,
		setSelectedUserId,
		setSelectedNodeId,
		setSelectedCores,
		setSelectedPriority,
		setJobName,
		validateForm,
	} = useJobForm({
		isModalOpen: isOpen,
		initialJobName: mode === "edit" ? job?.name || "" : "",
		initialUserId: mode === "edit" ? job?.user_id?.toString() || "" : "",
		initialNodeId: mode === "edit" ? job?.node_id?.toString() || "" : "",
		initialCores: mode === "edit" ? job?.cpu_cores?.toString() || "2" : "2",
		initialPriority: mode === "edit" ? job?.priority || "normal" : "normal",
		onClose,
		actionData,
	});

	// Mode-specific logic
	const isCreateMode = mode === "create";
	const isEditMode = mode === "edit";
	const canEdit = isEditMode ? job?.status === "waiting" : true;

	// Handle file selection (create mode only)
	const handleFileSelect = (file: File | null) => {
		setSelectedFile(file);

		// Auto-set job name if it's empty and a file is selected
		if (file && !jobName.trim()) {
			const nameWithoutExtension = removeFileExtension(file.name);
			setJobName(nameWithoutExtension);
		}
	};

	// Validation
	const { isFormValid, selectedNode } = validateForm(
		nodes,
		isCreateMode, // requiresFile
		selectedFile,
		canEdit,
	);

	// Mode-specific configurations
	const modalConfig = {
		title: isCreateMode ? "Create New Job" : `Edit Job: ${job?.name || ""}`,
		formAction: "?index",
		intent: isCreateMode ? "create-job" : "edit-job",
		submitButton: isCreateMode ? BUTTONS.CREATE_JOB : BUTTONS.SAVE_CHANGES,
		submittingButton: BUTTONS.SAVING,
		encType: isCreateMode ? ("multipart/form-data" as const) : undefined,
	};

	// Early return for edit mode without job
	if (isEditMode && !job) return null;

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{modalConfig.title}</DialogTitle>
				</DialogHeader>

				{/* Status validation warning (edit mode only) */}
				{isEditMode && !canEdit && (
					<Alert variant="destructive">
						<AlertDescription>
							{INFO_MESSAGES.CANNOT_EDIT_NON_WAITING_JOB}. Current status:{" "}
							{job?.status}
						</AlertDescription>
					</Alert>
				)}

				<Form
					method="post"
					action={modalConfig.formAction}
					className="space-y-4"
					id={`${mode}-job-form`}
					encType={modalConfig.encType}
				>
					<input type="hidden" name="intent" value={modalConfig.intent} />
					{isEditMode && <input type="hidden" name="job_id" value={job?.id} />}

					<div className="space-y-4">
						{/* INP File Upload (create mode only) */}
						{isCreateMode && (
							<div className="space-y-2">
								<Label>{FORM_LABELS.INP_FILE}</Label>
								<FileUpload
									name="inp_file"
									onFileSelect={handleFileSelect}
									acceptedTypes={[".inp"]}
									maxSize={100 * 1024 * 1024} // 100MB
								/>
							</div>
						)}

						{/* Job Name */}
						<JobNameField
							value={jobName}
							onChange={setJobName}
							placeholder={PLACEHOLDERS.JOB_NAME}
							disabled={isSubmitting || (isEditMode && !canEdit)}
							required
						/>

						{/* User Selection */}
						<UserSelectionField
							value={selectedUserId}
							onChange={setSelectedUserId}
							users={users}
							disabled={isSubmitting || (isEditMode && !canEdit)}
							required
						/>

						{/* Node Selection */}
						<NodeSelectionField
							value={selectedNodeId}
							onChange={setSelectedNodeId}
							nodes={nodes}
							disabled={isSubmitting || (isEditMode && !canEdit)}
							required
						/>

						{/* CPU Cores */}
						<CpuCoresField
							value={selectedCores}
							onChange={setSelectedCores}
							selectedNode={selectedNode}
							disabled={isSubmitting || (isEditMode && !canEdit)}
							required
						/>

						{/* Priority */}
						<PrioritySelectionField
							value={selectedPriority}
							onChange={setSelectedPriority}
							options={PRIORITY_LEVELS}
							disabled={isSubmitting || (isEditMode && !canEdit)}
							required
						/>
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
						<Button type="submit" disabled={!isFormValid || isSubmitting}>
							{isSubmitting
								? modalConfig.submittingButton
								: modalConfig.submitButton}
						</Button>
					</DialogFooter>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

// Convenience wrapper components for backward compatibility
export function NewJobModal(props: Omit<JobModalProps, "mode">) {
	return <JobModal {...props} mode="create" />;
}

export function EditJobModal(props: Omit<JobModalProps, "mode">) {
	return <JobModal {...props} mode="edit" />;
}
