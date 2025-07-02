import { MainLayout } from "~/components/layout/MainLayout";
import { Button } from "~/components/ui/button";
import { JobTable } from "~/components/jobs/JobTable";
import { 
  findAllJobs, createJob, findJobById, updateJob, deleteJob, updateJobStatus,
  findActiveUsers, findActiveNodes, createFileRecord,
  type Job 
} from "~/lib/db";
import { PAGE_TITLES, BUTTONS, SUCCESS_MESSAGES, ERROR_MESSAGES, VALIDATION_MESSAGES } from "~/lib/messages";
import type { Route } from "./+types/_index";
import { useState } from "react";
import { NewJobModal } from "~/components/jobs/NewJobModal";
import { EditJobModal } from "~/components/jobs/EditJobModal";
import { DeleteJobDialog } from "~/components/jobs/DeleteJobDialog";
import { CancelJobDialog } from "~/components/jobs/CancelJobDialog";
import { promises as fs } from "fs";
import path from "path";
import { logger } from "~/lib/logger/logger";
import { emitFileCreated } from "~/lib/sse";
import { type FileEventData } from "~/lib/sse-schemas";
import { 
  success,
  error,
  handleApiError,
  getFormIntent,
  getFormString,
  getFormNumber,
  ValidationError
} from "~/lib/apiHelpers";

// Simple loader - no complex type abstractions
export function loader() {
  const jobs = findAllJobs();
  const users = findActiveUsers();
  const nodes = findActiveNodes();
  
  logger.info('Jobs page data loaded', 'Routes', { 
    jobsCount: jobs.length, 
    usersCount: users.length, 
    nodesCount: nodes.length
  });
  
  return { jobs, users, nodes };
}

// Simple validation helpers - no complex schemas
function validateJobData(formData: FormData) {
  const name = getFormString(formData, "name");
  const user_id = getFormNumber(formData, "user_id");
  const node_id = getFormNumber(formData, "node_id");
  const cpu_cores = getFormNumber(formData, "cpu_cores");
  const priority = getFormString(formData, "priority", false) || "normal";

  // Simple validation
  if (name.length < 3) {
    throw new ValidationError(VALIDATION_MESSAGES.JOB_NAME_TOO_SHORT);
  }
  
  if (cpu_cores < 1) {
    throw new ValidationError(VALIDATION_MESSAGES.INVALID_CPU_CORES);
  }
  
  const validPriorities = ['low', 'normal', 'high', 'urgent'];
  if (!validPriorities.includes(priority)) {
    throw new ValidationError(`Invalid priority: ${priority}`);
  }

  return {
    name,
    user_id,
    node_id, 
    cpu_cores,
    priority: priority as "low" | "normal" | "high" | "urgent"
  };
}

function validateJobStatus(job: Job, allowedStatuses: string[], action: string) {
  if (!allowedStatuses.includes(job.status)) {
    throw new ValidationError(`Cannot ${action} job with status: ${job.status}`);
  }
}

// Simple action handlers
async function handleCreateJob(formData: FormData): Promise<Response> {
  // Handle file upload
  const inpFile = formData.get("inp_file") as File;
  if (!inpFile || inpFile.size === 0) {
    return error(ERROR_MESSAGES.FILE_REQUIRED);
  }

  // Simple file validation
  if (!inpFile.name.toLowerCase().endsWith('.inp')) {
    return error(ERROR_MESSAGES.INVALID_FILE_TYPE);
  }
  if (inpFile.size > 100 * 1024 * 1024) {
    return error(ERROR_MESSAGES.FILE_SIZE_EXCEEDED);
  }

  // Validate job data
  const jobData = validateJobData(formData);

  // Save file
  const fileBuffer = Buffer.from(await inpFile.arrayBuffer());
  const storedName = `${Date.now()}_${inpFile.name}`;
  const uploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads");
  const filePath = path.join(uploadsDir, storedName);

  await fs.mkdir(uploadsDir, { recursive: true });
  await fs.writeFile(filePath, fileBuffer);

  // Create file record
  const fileId = createFileRecord({
    original_name: inpFile.name,
    stored_name: storedName,
    file_path: filePath,
    mime_type: inpFile.type || "application/octet-stream",
    file_size: inpFile.size,
    uploaded_by: "system"
  });
  
  // Emit file event
  const fileEventData: FileEventData = {
    fileId,
    fileName: inpFile.name,
    fileSize: inpFile.size,
    mimeType: inpFile.type || "application/octet-stream",
    uploadedBy: "system"
  };
  emitFileCreated(fileEventData);
  
  // Create job
  const jobId = createJob({
    name: jobData.name,
    status: "waiting" as const,
    file_id: fileId,
    user_id: jobData.user_id,
    node_id: jobData.node_id,
    cpu_cores: jobData.cpu_cores,
    priority: jobData.priority
  });

  logger.info('Job created successfully', 'Routes', { jobId, jobName: jobData.name });
  return success({ jobId }, SUCCESS_MESSAGES.JOB_CREATED);
}

async function handleEditJob(formData: FormData): Promise<Response> {
  const job_id = getFormNumber(formData, "job_id");
  const jobData = validateJobData(formData);
  
  const existingJob = findJobById(job_id);
  if (!existingJob) {
    return error(VALIDATION_MESSAGES.JOB_NOT_FOUND);
  }
  
  validateJobStatus(existingJob, ['waiting'], 'edit');
  
  const updateResult = updateJob(job_id, {
    name: jobData.name,
    user_id: jobData.user_id,
    node_id: jobData.node_id,
    cpu_cores: jobData.cpu_cores,
    priority: jobData.priority
  });
  
  if (!updateResult) {
    return error('Failed to update job');
  }
  
  logger.info('Job updated successfully', 'Routes', { jobId: job_id, jobName: jobData.name });
  return success({ message: 'Job updated successfully' }, SUCCESS_MESSAGES.JOB_UPDATED);
}

async function handleDeleteJob(formData: FormData): Promise<Response> {
  const job_id = getFormNumber(formData, "job_id");
  
  const existingJob = findJobById(job_id);
  if (!existingJob) {
    return error(VALIDATION_MESSAGES.JOB_NOT_FOUND);
  }
  
  validateJobStatus(existingJob, ['completed', 'failed', 'missing'], 'delete');
  
  const deleteResult = deleteJob(job_id);
  if (!deleteResult) {
    return error('Failed to delete job');
  }
  
  logger.info('Job deleted successfully', 'Routes', { jobId: job_id, jobName: existingJob.name });
  return success({ message: 'Job deleted successfully' }, SUCCESS_MESSAGES.JOB_DELETED);
}

async function handleCancelJob(formData: FormData): Promise<Response> {
  const job_id = getFormNumber(formData, "job_id");
  
  const existingJob = findJobById(job_id);
  if (!existingJob) {
    return error(VALIDATION_MESSAGES.JOB_NOT_FOUND);
  }
  
  validateJobStatus(existingJob, ['waiting', 'starting', 'running'], 'cancel');
  
  const cancelResult = updateJobStatus(job_id, "failed", "Cancelled by user");
  if (!cancelResult) {
    return error('Failed to cancel job');
  }
  
  logger.info('Job cancelled successfully', 'Routes', { jobId: job_id, jobName: existingJob.name });
  return success({ message: 'Job cancelled successfully' }, SUCCESS_MESSAGES.JOB_CANCELLED);
}

// Simple action handler - no complex type abstractions
export async function action({ request }: Route.ActionArgs): Promise<Response> {
  try {
    const formData = await request.formData();
    const intent = getFormIntent(formData);
    
    logger.info('Job action called', 'Routes', { intent, method: request.method });
    
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
        return error(ERROR_MESSAGES.INVALID_ACTION);
    }
  } catch (error) {
    return handleApiError(error, 'Job Action');
  }
}

export default function Index({ loaderData, actionData }: Route.ComponentProps) {
  const [showNewJobModal, setShowNewJobModal] = useState(false);
  const [showEditJobModal, setShowEditJobModal] = useState(false);
  const [showDeleteJobDialog, setShowDeleteJobDialog] = useState(false);
  const [showCancelJobDialog, setShowCancelJobDialog] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Handle action results - type the response as any for now since React Router v7 types are complex
  const actionResult = actionData as any;
  const isSuccess = actionResult?.success === true;
  const isError = actionResult?.success === false;

  const handleEditJob = (job: Job) => {
    setSelectedJob(job);
    setShowEditJobModal(true);
  };

  const handleDeleteJob = (job: Job) => {
    setSelectedJob(job);
    setShowDeleteJobDialog(true);
  };

  const handleCancelJob = (job: Job) => {
    setSelectedJob(job);
    setShowCancelJobDialog(true);
  };

  return (
    <MainLayout title={PAGE_TITLES.JOBS}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{PAGE_TITLES.JOBS}</h1>
        <Button onClick={() => setShowNewJobModal(true)}>
          {BUTTONS.NEW_JOB}
        </Button>
      </div>

      {isSuccess && actionResult.message && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          {actionResult.message}
        </div>
      )}

      {isError && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {actionResult.error}
        </div>
      )}

      <JobTable
        jobs={loaderData.jobs}
        onJobAction={(jobId, action) => {
          const job = loaderData.jobs.find(j => j.id === jobId);
          if (!job) return;
          
          switch (action) {
            case 'edit':
              handleEditJob(job);
              break;
            case 'delete':
              handleDeleteJob(job);
              break;
            case 'cancel':
              handleCancelJob(job);
              break;
          }
        }}
      />

      <NewJobModal
        isOpen={showNewJobModal}
        onClose={() => setShowNewJobModal(false)}
        users={loaderData.users}
        nodes={loaderData.nodes}
      />

      {selectedJob && (
        <>
          <EditJobModal
            isOpen={showEditJobModal}
            onClose={() => setShowEditJobModal(false)}
            job={selectedJob}
            users={loaderData.users}
            nodes={loaderData.nodes}
          />

          <DeleteJobDialog
            isOpen={showDeleteJobDialog}
            onClose={() => setShowDeleteJobDialog(false)}
            job={selectedJob}
          />

          <CancelJobDialog
            isOpen={showCancelJobDialog}
            onClose={() => setShowCancelJobDialog(false)}
            job={selectedJob}
          />
        </>
      )}
    </MainLayout>
  );
}