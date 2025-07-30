/**
 * Shared Job Action Dialog Component
 * Extracted from CancelJobDialog and DeleteJobDialog to eliminate code duplication
 */

import { Form } from "react-router";
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
import { BUTTONS, INFO_MESSAGES } from "~/client/constants/messages";
import type { Job } from "~/shared/core/types/database";

type ActionType = "cancel" | "delete";

interface JobActionDialogProps {
	isOpen: boolean;
	onClose: () => void;
	job: Job;
	actionType: ActionType;
	isSubmitting: boolean;
	canPerformAction: boolean;
	actionData?: {
		success?: boolean | string;
		error?: string;
	};
}

const ACTION_CONFIG = {
	cancel: {
		title: "Cancel Job",
		intent: "cancel-job",
		confirmText: "Cancel Job",
		description: "Are you sure you want to cancel this job?",
		confirmButtonVariant: "destructive" as const,
		warningMessage: (status: string) =>
			status === "running" ? INFO_MESSAGES.CANCEL_RUNNING_JOB_WARNING : null,
		cannotPerformMessage: INFO_MESSAGES.CANNOT_CANCEL_JOB,
	},
	delete: {
		title: "Delete Job",
		intent: "delete-job",
		confirmText: "Delete Job",
		description: "Are you sure you want to permanently delete this job?",
		confirmButtonVariant: "destructive" as const,
		warningMessage: () => null,
		cannotPerformMessage: INFO_MESSAGES.CANNOT_DELETE_ACTIVE_JOB,
	},
};

function JobInfoSection({
	job,
	actionType,
}: {
	job: Job;
	actionType: ActionType;
}) {
	return (
		<Alert>
			<AlertDescription>
				<div className="space-y-1">
					<p>
						<strong>Job Name:</strong> {job.name}
					</p>
					<p>
						<strong>Status:</strong> {job.status}
					</p>
					{actionType === "cancel" && (
						<>
							<p>
								<strong>Node:</strong>{" "}
								{job.node_id ? `Node ${job.node_id}` : "Unassigned"}
							</p>
							<p>
								<strong>CPU Cores:</strong> {job.cpu_cores}
							</p>
						</>
					)}
					{actionType === "delete" && (
						<p>
							<strong>Created:</strong>{" "}
							{job.created_at ? new Date(job.created_at).toLocaleString() : "-"}
						</p>
					)}
				</div>
			</AlertDescription>
		</Alert>
	);
}

function StatusWarning({
	job,
	actionType,
}: {
	job: Job;
	actionType: ActionType;
}) {
	const config = ACTION_CONFIG[actionType];
	const warningMessage = config.warningMessage(job.status);

	if (!warningMessage) return null;

	return (
		<Alert variant="destructive">
			<AlertDescription>{warningMessage}</AlertDescription>
		</Alert>
	);
}

function ValidationWarning({
	canPerformAction,
	actionType,
}: {
	canPerformAction: boolean;
	actionType: ActionType;
}) {
	if (canPerformAction) return null;

	const config = ACTION_CONFIG[actionType];

	return (
		<Alert variant="destructive">
			<AlertDescription>{config.cannotPerformMessage}</AlertDescription>
		</Alert>
	);
}

function ActionDataDisplay({
	actionData,
}: {
	actionData?: JobActionDialogProps["actionData"];
}) {
	if (!actionData) return null;

	return (
		<>
			{/* Error Display */}
			{actionData.error && (
				<Alert variant="destructive">
					<AlertDescription>{actionData.error}</AlertDescription>
				</Alert>
			)}

			{/* Success Display */}
			{actionData.success && (
				<Alert>
					<AlertDescription>
						{typeof actionData.success === "string"
							? actionData.success
							: "Action completed successfully"}
					</AlertDescription>
				</Alert>
			)}
		</>
	);
}

export function JobActionDialog({
	isOpen,
	onClose,
	job,
	actionType,
	isSubmitting,
	canPerformAction,
	actionData,
}: JobActionDialogProps) {
	const config = ACTION_CONFIG[actionType];

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{config.title}</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					<p className="text-sm text-muted-foreground">{config.description}</p>

					<JobInfoSection job={job} actionType={actionType} />

					<StatusWarning job={job} actionType={actionType} />

					<ValidationWarning
						canPerformAction={canPerformAction}
						actionType={actionType}
					/>

					<ActionDataDisplay actionData={actionData} />
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onClose} disabled={isSubmitting}>
						{BUTTONS.CANCEL}
					</Button>
					{canPerformAction && (
						<Form method="post" action="?index" style={{ display: "inline" }}>
							<input type="hidden" name="intent" value={config.intent} />
							<input type="hidden" name="job_id" value={job.id} />
							<Button
								type="submit"
								variant={config.confirmButtonVariant}
								disabled={isSubmitting}
							>
								{isSubmitting ? BUTTONS.SAVING : config.confirmText}
							</Button>
						</Form>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
