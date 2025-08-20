/**
 * Shared Job Form Field Components
 * Extracted from NewJobModal and EditJobModal to eliminate code duplication
 */

import { Label, Select, Input } from "~/client/components/ui";
import { FORM_LABELS, PLACEHOLDERS } from "~/client/constants/messages";
import { calculateLicenseTokens } from "~/server/services/license";
import { formatCpuCoresError } from "~/client/utils/formatting";
import type { User, Node } from "~/shared/core/types/database";

interface UserSelectionFieldProps {
	value: string;
	onChange: (value: string) => void;
	users: User[];
	disabled?: boolean;
	required?: boolean;
}

export function UserSelectionField({
	value,
	onChange,
	users,
	disabled = false,
	required = false,
}: UserSelectionFieldProps) {
	return (
		<div className="space-y-2">
			<Label htmlFor="user-select">{FORM_LABELS.USER}</Label>
			<Select
				id="user-select"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				name="user_id"
				disabled={disabled}
				required={required}
			>
				<option value="">{PLACEHOLDERS.SELECT_USER}</option>
				{users.map((user) => (
					<option key={user.id} value={user.id}>
						{user.id}
					</option>
				))}
			</Select>
		</div>
	);
}

interface NodeSelectionFieldProps {
	value: string;
	onChange: (value: string) => void;
	nodes: Node[];
	disabled?: boolean;
	required?: boolean;
}

export function NodeSelectionField({
	value,
	onChange,
	nodes,
	disabled = false,
	required = false,
}: NodeSelectionFieldProps) {
	const selectedNode = nodes.find((node) => node.id?.toString() === value);
	const isSelectedNodeUnavailable = selectedNode?.status === "unavailable";

	return (
		<div className="space-y-2">
			<Label htmlFor="node-select">{FORM_LABELS.NODE}</Label>
			<Select
				id="node-select"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				name="node_id"
				disabled={disabled}
				required={required}
			>
				<option value="">{PLACEHOLDERS.SELECT_NODE}</option>
				{nodes.map((node) => (
					<option key={node.id} value={node.id || ""}>
						{node.name} ({node.cpu_cores_limit} cores max) -{" "}
						{node.status === "available" ? "✅ Available" : "⚠️ Unavailable"}
					</option>
				))}
			</Select>

			{/* Warning for unavailable node selection */}
			{isSelectedNodeUnavailable && (
				<div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
					<div className="flex items-center">
						<div className="flex-shrink-0">
							<svg
								className="h-4 w-4 text-yellow-400"
								fill="currentColor"
								viewBox="0 0 20 20"
								aria-label="Warning"
							>
								<path
									fillRule="evenodd"
									d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
									clipRule="evenodd"
								/>
							</svg>
						</div>
						<div className="ml-3">
							<p className="text-sm text-yellow-800">
								<strong>Warning:</strong> The selected node &quot;
								{selectedNode?.name}&quot; is currently unavailable. The job
								will be queued until the node becomes available.
							</p>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

interface CpuCoresFieldProps {
	value: string;
	onChange: (value: string) => void;
	selectedNode?: Node;
	disabled?: boolean;
	required?: boolean;
	showLicenseInfo?: boolean;
}

export function CpuCoresField({
	value,
	onChange,
	selectedNode,
	disabled = false,
	required = false,
	showLicenseInfo = true,
}: CpuCoresFieldProps) {
	const maxCores = selectedNode?.cpu_cores_limit || 1;
	const coresNumber = parseInt(value) || 1;
	const licenseTokens = calculateLicenseTokens(coresNumber);
	const isValidCores =
		selectedNode && coresNumber >= 1 && coresNumber <= maxCores;

	return (
		<div className="space-y-2">
			<Label htmlFor="cpu-cores">{FORM_LABELS.CPU_CORES}</Label>
			<Input
				id="cpu-cores"
				name="cpu_cores"
				type="number"
				min="1"
				max={maxCores}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				disabled={disabled || !selectedNode}
				required={required}
			/>

			{!selectedNode && (
				<p className="text-sm text-muted-foreground">
					Please select a node first
				</p>
			)}

			{selectedNode && showLicenseInfo && (
				<p className="text-sm text-muted-foreground">
					Max {maxCores} cores available on {selectedNode.name}
					{` • ${licenseTokens} license tokens required`}
				</p>
			)}

			{!isValidCores && value && selectedNode && (
				<p className="text-sm text-destructive">
					{formatCpuCoresError(maxCores)}
				</p>
			)}
		</div>
	);
}

interface PrioritySelectionFieldProps {
	value: string;
	onChange: (value: string) => void;
	options: Record<string, string>;
	disabled?: boolean;
	required?: boolean;
}

export function PrioritySelectionField({
	value,
	onChange,
	options,
	disabled = false,
	required = false,
}: PrioritySelectionFieldProps) {
	return (
		<div className="space-y-2">
			<Label htmlFor="priority-select">{FORM_LABELS.PRIORITY}</Label>
			<Select
				id="priority-select"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				name="priority"
				disabled={disabled}
				required={required}
			>
				{Object.entries(options).map(([key, label]) => (
					<option key={key} value={key}>
						{label}
					</option>
				))}
			</Select>
		</div>
	);
}

interface JobNameFieldProps {
	value: string;
	onChange: (value: string) => void;
	disabled?: boolean;
	required?: boolean;
	placeholder?: string;
	minLength?: number;
}

export function JobNameField({
	value,
	onChange,
	disabled = false,
	required = false,
	placeholder,
	minLength = 3,
}: JobNameFieldProps) {
	return (
		<div className="space-y-2">
			<Label htmlFor="job-name">{FORM_LABELS.JOB_NAME}</Label>
			<Input
				id="job-name"
				name="name"
				type="text"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				required={required}
				minLength={minLength}
				disabled={disabled}
			/>
		</div>
	);
}
