/**
 * Delete User Confirmation Dialog
 * Handles safe deletion of user accounts with validation
 */

import { Form } from "react-router";
import { useEffect } from "react";
import {
	Button,
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	Alert,
	AlertDescription,
} from "~/components/ui";
import { BUTTONS } from "~/lib/messages";
import type { User } from "~/lib/core/types/database";

interface DeleteUserDialogProps {
	isOpen: boolean;
	onClose: () => void;
	user: User | null;
	isSubmitting?: boolean;
	actionData?: {
		success?: boolean | string;
		error?: string;
		intent?: string;
	};
}

export function DeleteUserDialog({
	isOpen,
	onClose,
	user,
	isSubmitting = false,
	actionData,
}: DeleteUserDialogProps) {
	if (!user) return null;

	// Auto-close on successful deletion
	useEffect(() => {
		if (isOpen && actionData?.success && actionData?.intent === "delete-user") {
			onClose();
		}
	}, [isOpen, actionData, onClose]);

	// Check if user can be safely deleted
	const hasActiveJobs = false; // TODO: Check for active jobs by this user
	const canDelete = !hasActiveJobs;

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Delete User</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					<p className="text-sm text-muted-foreground">
						Are you sure you want to permanently delete this user account?
					</p>

					{/* User Information */}
					<Alert>
						<AlertDescription>
							<div className="space-y-1">
								<p>
									<strong>User ID:</strong> {user.id}
								</p>
								<p>
									<strong>Max Concurrent Jobs:</strong>{" "}
									{user.max_concurrent_jobs}
								</p>
								<p>
									<strong>Status:</strong>{" "}
									{user.is_active ? "Active" : "Inactive"}
								</p>
								<p>
									<strong>Created:</strong>{" "}
									{user.created_at
										? new Date(user.created_at).toLocaleString()
										: "-"}
								</p>
							</div>
						</AlertDescription>
					</Alert>

					{/* Validation Warnings */}
					{hasActiveJobs && (
						<Alert variant="destructive">
							<AlertDescription>
								This user has active jobs running. Please wait for jobs to
								complete or cancel them before deletion.
							</AlertDescription>
						</Alert>
					)}

					{/* Important Notice */}
					<Alert variant="destructive">
						<AlertDescription>
							<strong>Warning:</strong> This action cannot be undone. All job
							history associated with this user will remain but will show as
							&quot;Unknown User&quot;.
						</AlertDescription>
					</Alert>

					{/* Action Result Messages */}
					{actionData?.error && (
						<Alert variant="destructive">
							<AlertDescription>{actionData.error}</AlertDescription>
						</Alert>
					)}

					{actionData?.success && (
						<Alert>
							<AlertDescription>
								{typeof actionData.success === "string"
									? actionData.success
									: "User deleted successfully"}
							</AlertDescription>
						</Alert>
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onClose} disabled={isSubmitting}>
						{BUTTONS.CANCEL}
					</Button>
					{canDelete && (
						<Form method="post" style={{ display: "inline" }}>
							<input type="hidden" name="intent" value="delete-user" />
							<input type="hidden" name="user_id" value={user.id} />
							<Button
								type="submit"
								variant="destructive"
								disabled={isSubmitting}
							>
								{isSubmitting ? BUTTONS.SAVING : "Delete User"}
							</Button>
						</Form>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
