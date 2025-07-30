/**
 * Custom hook for job form state management
 * Extracted from NewJobModal and EditJobModal to eliminate code duplication
 */

import { useState, useEffect } from "react";
import type { Node } from "~/shared/core/types/database";

interface UseJobFormOptions {
	isModalOpen: boolean;
	initialJobName?: string;
	initialUserId?: string;
	initialNodeId?: string;
	initialCores?: string;
	initialPriority?: string;
	onClose?: () => void;
	actionData?: {
		error?: string;
		message?: string;
		success?: boolean;
		intent?: string;
	};
	expectedIntent?: string;
}

export function useJobForm({
	isModalOpen,
	initialJobName = "",
	initialUserId = "",
	initialNodeId = "",
	initialCores = "2",
	initialPriority = "normal",
	onClose,
	actionData,
}: UseJobFormOptions) {
	const [selectedUserId, setSelectedUserId] = useState<string>(initialUserId);
	const [selectedNodeId, setSelectedNodeId] = useState<string>(initialNodeId);
	const [selectedCores, setSelectedCores] = useState<string>(initialCores);
	const [selectedPriority, setSelectedPriority] =
		useState<string>(initialPriority);
	const [jobName, setJobName] = useState<string>(initialJobName);
	const [formError, setFormError] = useState<string>("");

	// Initialize form with initial data when modal opens
	useEffect(() => {
		if (isModalOpen) {
			setJobName(initialJobName);
			setSelectedUserId(initialUserId);
			setSelectedNodeId(initialNodeId);
			setSelectedCores(initialCores);
			setSelectedPriority(initialPriority);
			setFormError("");
		}
	}, [
		isModalOpen,
		initialJobName,
		initialUserId,
		initialNodeId,
		initialCores,
		initialPriority,
	]);

	// Update form error from action result and close on success
	useEffect(() => {
		if (actionData?.error || (actionData && !actionData.success)) {
			setFormError(
				actionData?.error || actionData?.message || "An error occurred",
			);
		} else if (isModalOpen && actionData?.success && onClose) {
			// For job forms, close on exact job-related intent match (create-job, edit-job)
			if (
				actionData?.intent === "create-job" ||
				actionData?.intent === "edit-job"
			) {
				onClose();
			}
		}
	}, [isModalOpen, actionData, onClose]);

	// Reset form when modal closes
	useEffect(() => {
		if (!isModalOpen) {
			setSelectedUserId("");
			setSelectedNodeId("");
			setSelectedCores("2");
			setSelectedPriority("normal");
			setJobName("");
			setFormError("");
		}
	}, [isModalOpen]);

	// Validation helper
	const validateForm = (
		nodes: Node[],
		requiresFile: boolean = false,
		selectedFile?: File | null,
		canEdit: boolean = true,
	) => {
		const selectedNode = nodes.find(
			(node) => node.id === parseInt(selectedNodeId),
		);
		const coresNumber = parseInt(selectedCores) || 2;
		const isValidCores =
			selectedNodeId &&
			selectedNode &&
			coresNumber >= 1 &&
			coresNumber <= selectedNode.cpu_cores_limit;

		let isFormValid =
			jobName.trim().length >= 3 &&
			selectedUserId &&
			selectedNodeId &&
			isValidCores &&
			canEdit;

		if (requiresFile) {
			isFormValid = isFormValid && !!selectedFile;
		}

		return {
			isFormValid,
			isValidCores,
			selectedNode,
			coresNumber,
		};
	};

	return {
		// State
		selectedUserId,
		selectedNodeId,
		selectedCores,
		selectedPriority,
		jobName,
		formError,

		// Setters
		setSelectedUserId,
		setSelectedNodeId,
		setSelectedCores,
		setSelectedPriority,
		setJobName,
		setFormError,

		// Helpers
		validateForm,
	};
}
