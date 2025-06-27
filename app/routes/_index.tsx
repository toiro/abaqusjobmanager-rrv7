import { MainLayout } from "~/components/layout/MainLayout";
import { Button } from "~/components/ui/button";
import { JobTable } from "~/components/jobs/JobTable";
import { jobOps, userOps, nodeOps, fileOps, type Job } from "~/lib/dbOperations";
import { PAGE_TITLES, BUTTONS, SUCCESS_MESSAGES, ERROR_MESSAGES, VALIDATION_MESSAGES } from "~/lib/messages";
import type { Route } from "./+types/_index";
import { useState } from "react";
import * as React from "react";
import { NewJobModal } from "~/components/jobs/NewJobModal";
import { EditJobModal } from "~/components/jobs/EditJobModal";
import { DeleteJobDialog } from "~/components/jobs/DeleteJobDialog";
import { CancelJobDialog } from "~/components/jobs/CancelJobDialog";
import { promises as fs } from "fs";
import path from "path";
import { logger } from "~/lib/logger/logger";
import { emitFileEvent } from "~/lib/sse";
import { type FileEventData } from "~/lib/sse-schemas";
import { 
  validateFormData,
  type ApiResult,
  createSuccessResponse,
  createErrorResponse
} from "~/lib/types/api-routes";
import { z } from "zod";

// Type-safe loader
export function loader() {
  const jobs = jobOps.findAll();
  const users = userOps.findActive();
  const nodes = nodeOps.findActive();
  
  logger.route('Data loaded', '_index', { 
    jobsCount: jobs.length, 
    usersCount: users.length, 
    nodesCount: nodes.length
  });
  
  return {
    jobs,
    users,
    nodes,
  };
}

// Common validation functions
function validateJobId(formData: FormData): number {
  const job_id_str = formData.get("job_id") as string;
  const job_id = parseInt(job_id_str);
  if (!job_id || isNaN(job_id)) {
    throw new Error(VALIDATION_MESSAGES.INVALID_JOB_ID);
  }
  return job_id;
}

function validateJobFormData(formData: FormData) {
  const name = formData.get("name") as string;
  const user_id_str = formData.get("user_id") as string;
  const node_id_str = formData.get("node_id") as string;
  const cpu_cores_str = formData.get("cpu_cores") as string;
  const priority = (formData.get("priority") as string) || "normal";

  const user_id = parseInt(user_id_str);
  const node_id = parseInt(node_id_str);
  const cpu_cores = parseInt(cpu_cores_str);

  // Validate all fields
  if (!name || name.length < 3) {
    throw new Error(VALIDATION_MESSAGES.JOB_NAME_TOO_SHORT);
  }
  if (!user_id || isNaN(user_id)) {
    throw new Error(VALIDATION_MESSAGES.INVALID_USER_ID);
  }
  if (!node_id || isNaN(node_id)) {
    throw new Error(VALIDATION_MESSAGES.INVALID_NODE_ID);
  }
  if (!cpu_cores || isNaN(cpu_cores) || cpu_cores < 1) {
    throw new Error(VALIDATION_MESSAGES.INVALID_CPU_CORES);
  }
  
  // Validate priority
  const validPriorities = ['low', 'normal', 'high', 'urgent'];
  const normalizedPriority = priority.toLowerCase();
  if (!validPriorities.includes(normalizedPriority)) {
    throw new Error(`Invalid priority: ${priority}. Must be one of: ${validPriorities.join(', ')}`);
  }

  return {
    name,
    user_id,
    node_id, 
    cpu_cores,
    priority: normalizedPriority as "low" | "normal" | "high" | "urgent"
  };
}

function validateJobExists(job_id: number): Job {
  const existingJob = jobOps.findById(job_id);
  if (!existingJob) {
    throw new Error(VALIDATION_MESSAGES.JOB_NOT_FOUND);
  }
  return existingJob;
}

function validateJobEditable(job: Job): void {
  if (job.status !== 'waiting') {
    throw new Error(VALIDATION_MESSAGES.ONLY_WAITING_JOBS_EDITABLE);
  }
}

function validateJobDeletable(job: Job): void {
  if (!['completed', 'failed', 'missing'].includes(job.status)) {
    throw new Error(VALIDATION_MESSAGES.ONLY_COMPLETED_FAILED_MISSING_DELETABLE);
  }
}

function validateJobCancellable(job: Job): void {
  if (!['waiting', 'starting', 'running'].includes(job.status)) {
    throw new Error(VALIDATION_MESSAGES.ONLY_WAITING_STARTING_RUNNING_CANCELLABLE);
  }
}

// Separated action handlers
async function handleCreateJob(formData: FormData): Promise<JobActionResult> {
  try {
    // Handle file upload first
    const inpFile = formData.get("inp_file") as File;
    if (!inpFile || inpFile.size === 0) {
      return createErrorResponse(ERROR_MESSAGES.FILE_REQUIRED);
    }

    // Validate file type and size
    const fileName = inpFile.name.toLowerCase();
    if (!fileName.endsWith('.inp')) {
      return createErrorResponse(ERROR_MESSAGES.INVALID_FILE_TYPE);
    }
    if (inpFile.size > 100 * 1024 * 1024) {
      return createErrorResponse(ERROR_MESSAGES.FILE_SIZE_EXCEEDED);
    }

    // Validate form data
    const jobData = validateJobFormData(formData);
    

    // Save file to filesystem and database
    const fileBuffer = Buffer.from(await inpFile.arrayBuffer());
    const storedName = `${Date.now()}_${inpFile.name}`;
    const uploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads");
    const filePath = path.join(uploadsDir, storedName);

    // Ensure uploads directory exists
    try {
      await fs.mkdir(uploadsDir, { recursive: true });
    } catch (error) {
      console.error("Failed to create uploads directory:", error);
    }

    // Save file to filesystem
    try {
      await fs.writeFile(filePath, fileBuffer);
    } catch (error) {
      logger.error("Failed to save file", '_index', error);
      return createErrorResponse(ERROR_MESSAGES.UPLOAD_FAILED);
    }

    // Create file record
    const fileId = fileOps.create({
      original_name: inpFile.name,
      stored_name: storedName,
      file_path: filePath,
      mime_type: inpFile.type || "application/octet-stream",
      file_size: inpFile.size,
      uploaded_by: "system" // TODO: Get from user context
    });
    
    // Emit SSE event for real-time updates
    const fileEventData: FileEventData = {
      fileId,
      fileName: inpFile.name,
      fileSize: inpFile.size,
      mimeType: inpFile.type || "application/octet-stream",
      uploadedBy: "system"
    };
    emitFileEvent('created', fileEventData);
    
    // Create job with validated data
    const jobCreateData = {
      name: jobData.name,
      status: "waiting" as const,
      file_id: fileId,
      user_id: jobData.user_id,
      node_id: jobData.node_id,
      cpu_cores: jobData.cpu_cores,
      priority: jobData.priority || "normal" as const
    };

    const jobId = jobOps.create(jobCreateData);
    logger.userAction('Job created successfully', { jobId, jobName: jobData.name });
    return createSuccessResponse({ jobId }, SUCCESS_MESSAGES.JOB_CREATED);
  } catch (error) {
    if (error instanceof Error) {
      return createErrorResponse(error.message);
    }
    logger.error('Failed to create job', '_index', error);
    return createErrorResponse(ERROR_MESSAGES.JOB_CREATION_FAILED);
  }
}

async function handleEditJob(formData: FormData): Promise<JobActionResult> {
  try {
    const job_id = validateJobId(formData);
    const jobData = validateJobFormData(formData);
    const existingJob = validateJobExists(job_id);
    validateJobEditable(existingJob);
    
    // Update job with new data
    const updateData = {
      name: jobData.name,
      user_id: jobData.user_id,
      node_id: jobData.node_id,
      cpu_cores: jobData.cpu_cores,
      priority: jobData.priority
    };
    
    const updateResult = jobOps.update(job_id, updateData);
    
    if (!updateResult) {
      logger.error('Job update failed', '_index', { job_id, updateData });
      return createErrorResponse('Failed to update job in database');
    }
    
    logger.userAction('Job updated successfully', { jobId: job_id, jobName: jobData.name });
    return createSuccessResponse({ message: 'Job updated successfully' }, SUCCESS_MESSAGES.JOB_UPDATED);
  } catch (error) {
    logger.error('Failed to update job', '_index', error);
    if (error instanceof Error) {
      return createErrorResponse(error.message);
    }
    return createErrorResponse('Failed to update job');
  }
}

async function handleDeleteJob(formData: FormData): Promise<JobActionResult> {
  try {
    const job_id = validateJobId(formData);
    const existingJob = validateJobExists(job_id);
    validateJobDeletable(existingJob);
    
    jobOps.delete(job_id);
    logger.userAction('Job deleted successfully', { jobId: job_id, jobName: existingJob.name });
    return createSuccessResponse({ message: 'Job deleted successfully' }, SUCCESS_MESSAGES.JOB_DELETED);
  } catch (error) {
    if (error instanceof Error) {
      return createErrorResponse(error.message);
    }
    logger.error('Failed to delete job', '_index', error);
    return createErrorResponse('Failed to delete job');
  }
}

async function handleCancelJob(formData: FormData): Promise<JobActionResult> {
  try {
    const job_id = validateJobId(formData);
    const existingJob = validateJobExists(job_id);
    validateJobCancellable(existingJob);
    
    // Update job status to cancelled (we'll use 'failed' status for cancelled jobs)
    jobOps.update(job_id, { status: 'failed' });
    logger.userAction('Job cancelled successfully', { jobId: job_id, jobName: existingJob.name });
    return createSuccessResponse({ message: 'Job cancelled successfully' }, SUCCESS_MESSAGES.JOB_CANCELLED);
  } catch (error) {
    if (error instanceof Error) {
      return createErrorResponse(error.message);
    }
    logger.error('Failed to cancel job', '_index', error);
    return createErrorResponse('Failed to cancel job');
  }
}

type JobActionResult = ApiResult<{ jobId?: number; message?: string }, string>;

export async function action({ request }: Route.ActionArgs): Promise<JobActionResult> {
  try {
    // Get form data to determine intent
    const formData = await request.formData();
    const intent = formData.get("intent") as string;
    
    // Route to appropriate handler based on intent
    switch (intent) {
      case "create-job":
        return await handleCreateJob(formData);
      case "edit-job":
        return await handleEditJob(formData);
      case "delete-job":
        return await handleDeleteJob(formData);
      case "cancel-job":
        return await handleCancelJob(formData);
      default:
        return createErrorResponse(ERROR_MESSAGES.INVALID_ACTION);
    }
  } catch (error) {
    logger.error('Unexpected error in action handler', '_index', error);
    return createErrorResponse(
      'An unexpected error occurred',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

export default function Index({ loaderData, actionData }: Route.ComponentProps) {
  const { jobs, users, nodes } = loaderData;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  
  // Close modals on successful actions
  React.useEffect(() => {
    if (actionData && 'success' in actionData && actionData.success) {
      setIsModalOpen(false);
      setIsEditModalOpen(false);
      setIsDeleteDialogOpen(false);
      setIsCancelDialogOpen(false);
      setSelectedJob(null);
    }
  }, [actionData]);
  
  const handleJobAction = (jobId: number, action: 'view' | 'edit' | 'delete' | 'cancel') => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    
    setSelectedJob(job);
    
    switch (action) {
      case 'view':
        // TODO: Navigate to job details page
        break;
      case 'edit':
        setIsEditModalOpen(true);
        break;
      case 'delete':
        setIsDeleteDialogOpen(true);
        break;
      case 'cancel':
        setIsCancelDialogOpen(true);
        break;
    }
  };

  const handleCreateJob = () => {
    setIsModalOpen(true);
  };

  const createJobButton = (
    <Button onClick={handleCreateJob} className="flex items-center gap-2">
      <svg
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4v16m8-8H4"
        />
      </svg>
      {BUTTONS.NEW_JOB}
    </Button>
  );

  return (
    <MainLayout 
      title={PAGE_TITLES.JOBS}
      description="Manage and monitor your Abaqus job execution"
      actions={createJobButton}
      users={users}
      showSystemStatus={true}
    >
      <JobTable
        jobs={jobs}
        onJobAction={handleJobAction}
      />
      <NewJobModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        users={users}
        nodes={nodes}
        actionData={actionData}
      />
      <EditJobModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedJob(null);
        }}
        job={selectedJob}
        users={users}
        nodes={nodes}
        actionData={actionData}
      />
      <DeleteJobDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setSelectedJob(null);
        }}
        job={selectedJob}
        actionData={actionData}
      />
      <CancelJobDialog
        isOpen={isCancelDialogOpen}
        onClose={() => {
          setIsCancelDialogOpen(false);
          setSelectedJob(null);
        }}
        job={selectedJob}
        actionData={actionData}
      />
    </MainLayout>
  );
}
