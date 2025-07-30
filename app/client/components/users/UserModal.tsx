/**
 * Unified User Modal Component
 * Handles both create and edit operations for users
 * Uses BaseDialog for consistent behavior
 */

import {
	BaseDialog,
	type BaseDialogConfig,
} from "~/client/components/shared/BaseDialog";
import { Input, Label, Select } from "~/client/components/ui";
import type { User } from "~/shared/core/types/database";
import { useState, useEffect } from "react";

type UserModalMode = "create" | "edit";

interface UserModalProps {
	mode: UserModalMode;
	isOpen: boolean;
	onClose: () => void;
	user?: User | null; // Required for edit mode
	actionData?: {
		success?: boolean | string;
		error?: string;
		message?: string;
		intent?: string;
	};
}

export function UserModal({
	mode,
	isOpen,
	onClose,
	user,
	actionData,
}: UserModalProps) {
	// Form state
	const [displayName, setDisplayName] = useState("");
	const [maxConcurrentJobs, setMaxConcurrentJobs] = useState("3");
	const [isActive, setIsActive] = useState(true);

	// Mode-specific logic
	const isCreateMode = mode === "create";
	const isEditMode = mode === "edit";

	// Mode-specific configurations
	const config: BaseDialogConfig = {
		title: isCreateMode ? "Add New User" : `Edit User: ${user?.id || ""}`,
		intent: isCreateMode ? "create-user" : "edit-user",
		submitText: isCreateMode ? "Add User" : "Save Changes",
		submittingText: "Saving...",
	};

	// Initialize form with user data when editing
	useEffect(() => {
		if (isOpen) {
			if (isEditMode && user) {
				setDisplayName(user.id);
				setMaxConcurrentJobs(user.max_concurrent_jobs?.toString() || "3");
				setIsActive(user.is_active ?? true);
			} else {
				// Reset for create mode
				setDisplayName("");
				setMaxConcurrentJobs("3");
				setIsActive(true);
			}
		}
	}, [isOpen, mode, user]);

	// Reset form when modal closes
	useEffect(() => {
		if (!isOpen) {
			setDisplayName("");
			setMaxConcurrentJobs("3");
			setIsActive(true);
		}
	}, [isOpen]);

	// Validation
	const isFormValid =
		displayName.trim().length >= 2 &&
		parseInt(maxConcurrentJobs) >= 1 &&
		parseInt(maxConcurrentJobs) <= 50;

	// Hidden fields for edit mode
	const hiddenFields =
		isEditMode && user?.id ? { user_id: user.id } : undefined;

	// Early return for edit mode without user
	if (isEditMode && !user) return null;

	return (
		<BaseDialog
			isOpen={isOpen}
			onClose={onClose}
			config={config}
			isFormValid={isFormValid}
			actionData={actionData}
			hiddenFields={hiddenFields}
		>
			{/* Display Name */}
			<div className="space-y-2">
				<Label htmlFor="display-name">Display Name</Label>
				<Input
					id="display-name"
					name="display_name"
					type="text"
					value={displayName}
					onChange={(e) => setDisplayName(e.target.value)}
					placeholder="e.g., John Doe"
					required
					minLength={2}
				/>
			</div>

			{/* Max Concurrent Jobs */}
			<div className="space-y-2">
				<Label htmlFor="max-concurrent-jobs">Maximum Concurrent Jobs</Label>
				<Input
					id="max-concurrent-jobs"
					name="max_concurrent_jobs"
					type="number"
					min="1"
					max="50"
					value={maxConcurrentJobs}
					onChange={(e) => setMaxConcurrentJobs(e.target.value)}
					required
				/>
				<p className="text-sm text-muted-foreground">
					Number of jobs this user can run simultaneously
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
					Only active users can submit new jobs
				</p>
			</div>
		</BaseDialog>
	);
}

// Convenience wrapper components for backward compatibility
export function NewUserModal(props: Omit<UserModalProps, "mode">) {
	return <UserModal {...props} mode="create" />;
}

export function EditUserModal(props: Omit<UserModalProps, "mode">) {
	return <UserModal {...props} mode="edit" />;
}
