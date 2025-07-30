/**
 * Delete Node Confirmation Dialog
 * Handles safe deletion of compute nodes with validation
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
} from "~/client/components/ui";
import { BUTTONS } from "~/client/constants/messages";
import type { Node } from "~/shared/core/types/database";

interface DeleteNodeDialogProps {
	isOpen: boolean;
	onClose: () => void;
	node: Node | null;
	isSubmitting?: boolean;
	actionData?: {
		success?: boolean | string;
		error?: string;
		intent?: string;
	};
}

export function DeleteNodeDialog({
	isOpen,
	onClose,
	node,
	isSubmitting = false,
	actionData,
}: DeleteNodeDialogProps) {
	if (!node) return null;

	// Auto-close on successful deletion
	useEffect(() => {
		if (isOpen && actionData?.success && actionData?.intent === "delete-node") {
			onClose();
		}
	}, [isOpen, actionData, onClose]);

	// Check if node can be safely deleted
	const canDelete = !node.is_active; // Only inactive nodes can be deleted
	const hasActiveJobs = false; // TODO: Check for active jobs on this node

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Delete Node</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					<p className="text-sm text-muted-foreground">
						Are you sure you want to permanently delete this compute node?
					</p>

					{/* Node Information */}
					<Alert>
						<AlertDescription>
							<div className="space-y-1">
								<p>
									<strong>Node Name:</strong> {node.name}
								</p>
								<p>
									<strong>Hostname:</strong> {node.hostname}
								</p>
								<p>
									<strong>CPU Cores:</strong> {node.cpu_cores_limit}
								</p>
								<p>
									<strong>Status:</strong>{" "}
									{node.is_active ? "Active" : "Inactive"}
								</p>
								<p>
									<strong>Created:</strong>{" "}
									{node.created_at
										? new Date(node.created_at).toLocaleString()
										: "-"}
								</p>
							</div>
						</AlertDescription>
					</Alert>

					{/* Validation Warnings */}
					{!canDelete && (
						<Alert variant="destructive">
							<AlertDescription>
								Cannot delete an active node. Please deactivate the node first.
							</AlertDescription>
						</Alert>
					)}

					{hasActiveJobs && (
						<Alert variant="destructive">
							<AlertDescription>
								This node has active jobs running. Please wait for jobs to
								complete or cancel them before deletion.
							</AlertDescription>
						</Alert>
					)}

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
									: "Node deleted successfully"}
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
							<input type="hidden" name="intent" value="delete-node" />
							<input type="hidden" name="node_id" value={node.id} />
							<Button
								type="submit"
								variant="destructive"
								disabled={isSubmitting}
							>
								{isSubmitting ? BUTTONS.SAVING : "Delete Node"}
							</Button>
						</Form>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
