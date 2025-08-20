/**
 * EditJobModal - Job Edit Form Dialog
 * FormDialog component for editing jobs
 */

import type { Job, User, Node } from "~/shared/core/types/database";
import { FormDialog } from "~/client/components/dialog";
import { Input, Label, Select } from "~/client/components/ui";
import { BUTTONS } from "~/client/constants/messages";

export interface EditJobModalProps {
	/** Dialog open/close state */
	isOpen: boolean;
	/** Dialog close callback */
	onClose: () => void;
	/** Job to edit */
	job: Job;
	/** List of users */
	users: User[];
	/** List of nodes */
	nodes: Node[];
}

/**
 * Job Edit Form Dialog
 *
 * Features:
 * - Job name editing
 * - User change
 * - Node change
 * - Priority change
 * - Auto-close after form submission
 */
export const EditJobModal = ({
	isOpen,
	onClose,
	job,
	users,
	nodes,
}: EditJobModalProps) => {
	return (
		<FormDialog
			isOpen={isOpen}
			title="Edit Job"
			onClose={onClose}
			intent="edit-job"
			submitText={BUTTONS.SAVE}
			maxWidth="max-w-lg"
			hiddenFields={{ id: job.id || 0 }}
		>
			<div className="space-y-4">
				{/* Job Name */}
				<div>
					<Label htmlFor="edit-job-name">Job Name</Label>
					<Input
						id="edit-job-name"
						name="name"
						defaultValue={job.name}
						placeholder="Enter job name"
						required
					/>
				</div>

				{/* User Selection */}
				<div>
					<Label htmlFor="edit-job-user">Assigned User</Label>
					<Select
						id="edit-job-user"
						name="user_id"
						defaultValue={job.user_id?.toString() || ""}
						required
					>
						<option value="">Select User</option>
						{users.map((user) => (
							<option key={user.id} value={user.id}>
								{user.id}
							</option>
						))}
					</Select>
				</div>

				{/* Node Selection */}
				<div>
					<Label htmlFor="edit-job-node">Execution Node</Label>
					<Select
						id="edit-job-node"
						name="node_id"
						defaultValue={job.node_id?.toString() || ""}
						required
					>
						<option value="">Select Node</option>
						{nodes.map((node) => (
							<option key={node.id} value={node.id}>
								{node.name} ({node.hostname})
							</option>
						))}
					</Select>
				</div>

				{/* Priority */}
				<div>
					<Label htmlFor="edit-job-priority">Priority</Label>
					<Select
						id="edit-job-priority"
						name="priority"
						defaultValue={job.priority || "normal"}
					>
						<option value="low">Low</option>
						<option value="normal">Normal</option>
						<option value="high">High</option>
					</Select>
				</div>

				{/* Current Status Display */}
				<div className="p-3 bg-gray-50 rounded-lg">
					<div className="text-sm text-gray-600">
						<p>
							<strong>Current Status:</strong> {job.status}
						</p>
						{job.created_at && (
							<p>
								<strong>Created:</strong>{" "}
								{new Date(job.created_at).toLocaleString("en-US")}
							</p>
						)}
					</div>
				</div>
			</div>
		</FormDialog>
	);
};
