import { AdminLayout } from "~/client/components/layout/AdminLayout";
import {
	Button,
	Badge,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	SuccessMessage,
	ErrorMessage,
} from "~/client/components/ui";
import type { FileWithJob } from "~/shared/core/database/types/file-with-jobs";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "~/client/constants/messages";
import { formatFileSize } from "~/shared/utils/utils";
import type { Route } from "./+types/admin.files";
import {
	success,
	error,
	handleApiError,
	getFormIntent,
	getFormNumber,
} from "~/shared/utils/api-helpers";
import { useState, useEffect } from "react";
import { DeleteFileDialog } from "~/client/components/files/DeleteFileDialog";
import { useFileSSE, useJobSSE } from "~/client/hooks/useSSE";
import { EVENT_TYPES } from "~/server/services/sse/sse-schemas";

// Simple loader
export async function loader() {
	try {
		const { findAllFilesWithJobs } = await import(
			"~/shared/core/database/index.server"
		);
		const { getLogger } = await import("~/shared/core/logger/logger.server");

		const files = findAllFilesWithJobs();
		getLogger().info("Routes: Files admin data loaded", {
			filesCount: files.length,
			totalJobReferences: files.reduce(
				(sum: number, file: any) => sum + (file.referencingJob ? 1 : 0),
				0,
			),
		});
		return { files };
	} catch (error) {
		const { getLogger } = await import("~/shared/core/logger/logger.server");
		getLogger().error("Routes: Failed to load files", { error });
		return { files: [] };
	}
}

// Simple action handler
export async function action({ request }: Route.ActionArgs): Promise<Response> {
	try {
		const formData = await request.formData();
		const intent = getFormIntent(formData);
		const { getLogger } = await import("~/shared/core/logger/logger.server");

		getLogger().info("Routes: Files admin action called", {
			intent,
			method: request.method,
			url: request.url,
		});

		if (intent === "delete-file") {
			const { fileRepository } = await import(
				"~/shared/core/database/index.server"
			);

			const fileId = getFormNumber(formData, "fileId");

			getLogger().info("Routes: Deleting file", { fileId });

			// Check if file exists
			const existingFile = fileRepository.findFileById(fileId);
			if (!existingFile) {
				return error("File not found");
			}

			// Delete file from database
			const deleteSuccess = fileRepository.deleteFile(fileId);
			if (!deleteSuccess) {
				return error("Failed to delete file from database");
			}

			// TODO: Also delete the physical file from filesystem

			// File deleted successfully

			getLogger().info("Routes: File deleted successfully", { fileId });
			return Response.json({
				success: SUCCESS_MESSAGES.FILE_DELETED,
				intent: "delete-file",
				fileId,
			});
		}

		return error(ERROR_MESSAGES.INVALID_ACTION);
	} catch (error) {
		return handleApiError(error, "Files Admin");
	}
}

export default function FilesAdmin({
	loaderData: { files: initialFiles },
	actionData,
}: Route.ComponentProps) {
	// Dialog states
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [selectedFile, setSelectedFile] = useState<FileWithJob | null>(null);

	// Real-time file data state
	const [files, setFiles] = useState<FileWithJob[]>(initialFiles);

	// Update files when loader data changes
	useEffect(() => {
		setFiles(initialFiles);
	}, [initialFiles]);

	// SSE connection for real-time file updates
	const fileSSEResult = useFileSSE((event) => {
		if (!event.data) return;

		const eventData = event.data as any;

		switch (event.type) {
			case EVENT_TYPES.FILE_CREATED:
				// For new files, we might need to reload the full file list
				// For now, we'll just reload the page to get the new file
				window.location.reload();
				break;

			case EVENT_TYPES.FILE_UPDATED:
				if (eventData.fileId) {
					setFiles((prevFiles) =>
						prevFiles.map((file) =>
							file.id === eventData.fileId
								? {
										...file,
										original_name: eventData.fileName || file.original_name,
										file_size: eventData.fileSize || file.file_size,
										mime_type: eventData.mimeType || file.mime_type,
										uploaded_by: eventData.uploadedBy || file.uploaded_by,
									}
								: file,
						),
					);
				}
				break;

			case EVENT_TYPES.FILE_DELETED:
				if (eventData.fileId) {
					setFiles((prevFiles) =>
						prevFiles.filter((file) => file.id !== eventData.fileId),
					);
				}
				break;
		}
	});

	// SSE connection for real-time job updates (affects job status in file references)
	const jobSSEResult = useJobSSE((event) => {
		if (!event.data) return;

		const eventData = event.data as any;

		switch (event.type) {
			case EVENT_TYPES.JOB_STATUS_CHANGED:
			case EVENT_TYPES.JOB_UPDATED:
				if (eventData.jobId) {
					setFiles((prevFiles) =>
						prevFiles.map((file) => {
							if (
								file.referencingJob?.jobId === eventData.jobId &&
								file.referencingJob
							) {
								return {
									...file,
									referencingJob: {
										jobId: file.referencingJob.jobId,
										jobName:
											eventData.name ||
											eventData.jobName ||
											file.referencingJob.jobName,
										jobStatus:
											eventData.status ||
											eventData.jobStatus ||
											file.referencingJob.jobStatus,
										jobOwner:
											eventData.owner ||
											eventData.jobOwner ||
											file.referencingJob.jobOwner,
										createdAt: file.referencingJob.createdAt,
									},
								};
							}
							return file;
						}),
					);
				}
				break;

			case EVENT_TYPES.JOB_DELETED:
				if (eventData.jobId) {
					setFiles((prevFiles) =>
						prevFiles.map((file) =>
							file.referencingJob?.jobId === eventData.jobId
								? {
										...file,
										referencingJob: null,
									}
								: file,
						),
					);
				}
				break;

			case EVENT_TYPES.JOB_CREATED:
				// If a new job references a file, we should update the file's job references
				if (eventData.fileId) {
					setFiles((prevFiles) =>
						prevFiles.map((file) =>
							file.id === eventData.fileId
								? {
										...file,
										referencingJob: {
											jobId: eventData.jobId,
											jobName: eventData.name || eventData.jobName,
											jobStatus:
												eventData.status || eventData.jobStatus || "pending",
											jobOwner: eventData.owner || eventData.jobOwner,
											createdAt:
												eventData.createdAt || new Date().toISOString(),
										},
									}
								: file,
						),
					);
				}
				break;
		}
	});

	// Handle action results - type as any for React Router v7 compatibility
	const actionResult = actionData as any;
	const isSuccess = actionResult?.success === true;
	const isError = actionResult?.success === false;

	// Calculate file statistics
	const totalFiles = files.length;
	const totalSize = files.reduce((sum, file) => sum + file.file_size, 0);
	const totalJobReferences = files.reduce(
		(sum, file) => sum + (file.referencingJob ? 1 : 0),
		0,
	);

	// Handle delete file dialog
	const handleDeleteFile = (file: FileWithJob) => {
		setSelectedFile(file);
		setShowDeleteDialog(true);
	};

	return (
		<AdminLayout title="File Management">
			<div className="flex justify-between items-center mb-6">
				<div>
					<h1 className="text-3xl font-bold">File Management</h1>
					<p className="text-gray-600 mt-2">
						{totalFiles} files • {formatFileSize(totalSize)} total •{" "}
						{totalJobReferences} job references
					</p>
				</div>
			</div>

			{isSuccess && actionResult.message && (
				<SuccessMessage message={actionResult.message} className="mb-4" />
			)}

			{isError && (
				<ErrorMessage message={actionResult.error} className="mb-4" />
			)}

			<div className="bg-white rounded-lg shadow">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>File Name</TableHead>
							<TableHead>Size</TableHead>
							<TableHead>Type</TableHead>
							<TableHead>Uploaded By</TableHead>
							<TableHead>Job References</TableHead>
							<TableHead>Created</TableHead>
							<TableHead>Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{files.map((file) => (
							<TableRow key={file.id}>
								<TableCell className="font-medium">
									{file.original_name}
								</TableCell>
								<TableCell>{formatFileSize(file.file_size)}</TableCell>
								<TableCell>
									<Badge variant="secondary">
										{file.mime_type || "Unknown"}
									</Badge>
								</TableCell>
								<TableCell>{file.uploaded_by || "Unknown"}</TableCell>
								<TableCell>
									{file.referencingJob ? (
										<div className="text-xs">
											<div className="flex items-center gap-2">
												<Badge
													variant={
														file.referencingJob.jobStatus === "completed"
															? "default"
															: file.referencingJob.jobStatus === "running"
																? "secondary"
																: file.referencingJob.jobStatus === "failed"
																	? "destructive"
																	: "outline"
													}
													className="text-xs"
												>
													{file.referencingJob.jobStatus}
												</Badge>
												<span className="font-medium">
													{file.referencingJob.jobName}
												</span>
											</div>
											<div className="text-gray-500 mt-1">
												Owner: {file.referencingJob.jobOwner}
											</div>
										</div>
									) : (
										<span className="text-gray-400 text-sm">No references</span>
									)}
								</TableCell>
								<TableCell>
									{file.created_at
										? new Date(file.created_at).toLocaleDateString()
										: "Unknown"}
								</TableCell>
								<TableCell>
									<Button
										variant="destructive"
										size="sm"
										onClick={() => handleDeleteFile(file)}
									>
										Delete
									</Button>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			{files.length === 0 && (
				<div className="text-center py-12 text-gray-500">
					<p>No files found.</p>
				</div>
			)}

			{/* SSE Connection Status */}
			<div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
				<div className="flex items-center gap-2">
					<div
						className={`w-2 h-2 rounded-full ${fileSSEResult.isConnected ? "bg-green-500" : "bg-red-500"}`}
					></div>
					<span>
						Files: {fileSSEResult.isConnected ? "Connected" : "Disconnected"}
					</span>
				</div>
				<div className="flex items-center gap-2">
					<div
						className={`w-2 h-2 rounded-full ${jobSSEResult.isConnected ? "bg-green-500" : "bg-red-500"}`}
					></div>
					<span>
						Jobs: {jobSSEResult.isConnected ? "Connected" : "Disconnected"}
					</span>
				</div>
			</div>

			{/* Delete File Dialog */}
			<DeleteFileDialog
				isOpen={showDeleteDialog}
				onClose={() => setShowDeleteDialog(false)}
				file={selectedFile}
				actionData={actionData}
			/>
		</AdminLayout>
	);
}
