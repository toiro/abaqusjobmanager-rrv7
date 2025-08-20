/**
 * NewJobModal - New Job Creation Form Dialog
 * FormDialog component for creating new jobs
 */

import { FormDialog } from "~/client/components/dialog";
import { FileUpload, Input, Label, Select } from "~/client/components/ui";
import { SYSTEM_MESSAGES } from "~/client/constants/messages";
import type { Node, User } from "~/shared/core/types/database";

export interface NewJobModalProps {
	/** Dialog open/close state */
	isOpen: boolean;
	/** Dialog close callback */
	onClose: () => void;
	/** List of users */
	users: User[];
	/** List of nodes */
	nodes: Node[];
}

/**
 * New Job Creation Form Dialog
 *
 * Features:
 * - INP file upload
 * - Job name input
 * - User selection
 * - Node selection
 * - Priority setting
 * - Auto-close after form submission
 */
export const NewJobModal = ({
	isOpen,
	onClose,
	users,
	nodes,
}: NewJobModalProps) => {
	return (
		<FormDialog
			isOpen={isOpen}
			title="Create New Job"
			onClose={onClose}
			intent="create-job"
			submitText={SYSTEM_MESSAGES.CREATE}
			encType="multipart/form-data"
			maxWidth="max-w-lg"
		>
			<div className="space-y-4">
				{/* Job Name */}
				<div>
					<Label htmlFor="job-name">Job Name</Label>
					<Input
						id="job-name"
						name="name"
						placeholder="Enter job name"
						required
					/>
				</div>

				{/* INP File Upload */}
				<div>
					<Label htmlFor="inp-file">INP File</Label>
					<FileUpload id="inp-file" name="file" accept=".inp" required />
				</div>

				{/* User Selection */}
				<div>
					<Label htmlFor="job-user">Assigned User</Label>
					<Select id="job-user" name="user_id" required>
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
					<Label htmlFor="job-node">Execution Node</Label>
					<Select id="job-node" name="node_id" required>
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
					<Label htmlFor="job-priority">Priority</Label>
					<Select id="job-priority" name="priority" defaultValue="normal">
						<option value="low">Low</option>
						<option value="normal">Normal</option>
						<option value="high">High</option>
					</Select>
				</div>
			</div>
		</FormDialog>
	);
};
