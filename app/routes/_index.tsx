import { MainLayout } from "~/components/layout/MainLayout";
import { Button } from "~/components/ui";
import { JobTable } from "~/components/jobs/JobTable";
import type { Job } from "~/lib/core/types/database";
import { PAGE_TITLES, BUTTONS, SUCCESS_MESSAGES, ERROR_MESSAGES, VALIDATION_MESSAGES } from "~/lib/messages";
import type { Route } from "./+types/_index";
import { useState } from "react";
import { NewJobModal, EditJobModal } from "~/components/jobs/JobModal";
import { DeleteJobDialog } from "~/components/jobs/DeleteJobDialog";
import { CancelJobDialog } from "~/components/jobs/CancelJobDialog";
import { 
  success,
  error,
  errorWithIntent,
  handleApiError,
  getFormIntent,
  getFormString,
  getFormNumber,
  ValidationError
} from "~/lib/helpers/api-helpers";

// Simple loader - no complex type abstractions
export async function loader() {
  // サーバー専用のデータベース操作をインポート
  const { 
    jobRepository, 
    userRepository, 
    nodeRepository 
  } = await import("~/lib/core/database/server-operations");
  const { getLogger } = await import("~/lib/core/logger/logger.server");
  
  const jobs = jobRepository.findAllJobs();
  const users = userRepository.findActiveUsers();
  const nodes = nodeRepository.findActiveNodes();
  
  getLogger().info('Jobs page data loaded', 'Routes', { 
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
  // サーバー専用の操作をインポート
  const { jobRepository, fileRepository } = await import("~/lib/core/database/server-operations");
  const { getLogger } = await import("~/lib/core/logger/logger.server");
  const { emitFileCreated } = await import("~/lib/services/sse/sse.server");
  const { onJobCreated } = await import("~/lib/services/license/license-usage-service.server");
  const { promises: fs } = await import("fs");
  const path = await import("path");

  // Handle file upload
  const inpFile = formData.get("inp_file") as File;
  if (!inpFile || inpFile.size === 0) {
    return errorWithIntent(ERROR_MESSAGES.FILE_REQUIRED, 'create-job');
  }

  // Simple file validation
  if (!inpFile.name.toLowerCase().endsWith('.inp')) {
    return errorWithIntent(ERROR_MESSAGES.INVALID_FILE_TYPE, 'create-job');
  }
  if (inpFile.size > 100 * 1024 * 1024) {
    return errorWithIntent(ERROR_MESSAGES.FILE_SIZE_EXCEEDED, 'create-job');
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
  const fileId = fileRepository.createFile({
    original_name: inpFile.name,
    stored_name: storedName,
    file_path: filePath,
    mime_type: inpFile.type || "application/octet-stream",
    file_size: inpFile.size,
    uploaded_by: "system"
  });
  
  // Emit file event
  const fileEventData = {
    fileId,
    fileName: inpFile.name,
    fileSize: inpFile.size,
    mimeType: inpFile.type || "application/octet-stream",
    uploadedBy: "system"
  };
  emitFileCreated(fileEventData);
  
  // Create job
  const jobId = jobRepository.createJob({
    name: jobData.name,
    status: "waiting" as const,
    file_id: fileId,
    user_id: jobData.user_id,
    node_id: jobData.node_id,
    cpu_cores: jobData.cpu_cores,
    priority: jobData.priority
  });
  
  // Emit license usage update
  onJobCreated(jobId);

  getLogger().info('Job created successfully', 'Routes', { jobId, jobName: jobData.name });
  return success({ jobId, intent: 'create-job' }, SUCCESS_MESSAGES.JOB_CREATED);
}

async function handleEditJob(formData: FormData): Promise<Response> {
  // サーバー専用の操作をインポート
  const { jobRepository } = await import("~/lib/core/database/server-operations");
  const { getLogger } = await import("~/lib/core/logger/logger.server");

  const job_id = getFormNumber(formData, "job_id");
  const jobData = validateJobData(formData);
  
  const existingJob = jobRepository.findJobById(job_id);
  if (!existingJob) {
    return errorWithIntent(VALIDATION_MESSAGES.JOB_NOT_FOUND, 'edit-job');
  }
  
  validateJobStatus(existingJob, ['waiting'], 'edit');
  
  const updateResult = jobRepository.updateJob({
    id: job_id,
    name: jobData.name,
    user_id: jobData.user_id,
    node_id: jobData.node_id,
    cpu_cores: jobData.cpu_cores,
    priority: jobData.priority
  });
  
  if (!updateResult) {
    return errorWithIntent('Failed to update job', 'edit-job');
  }
  
  getLogger().info('Job updated successfully', 'Routes', { jobId: job_id, jobName: jobData.name });
  return success({ message: 'Job updated successfully', intent: 'edit-job' }, SUCCESS_MESSAGES.JOB_UPDATED);
}

async function handleDeleteJob(formData: FormData): Promise<Response> {
  // サーバー専用の操作をインポート
  const { jobRepository } = await import("~/lib/core/database/server-operations");
  const { getLogger } = await import("~/lib/core/logger/logger.server");
  const { onJobDeleted } = await import("~/lib/services/license/license-usage-service.server");

  const job_id = getFormNumber(formData, "job_id");
  
  const existingJob = jobRepository.findJobById(job_id);
  if (!existingJob) {
    return errorWithIntent(VALIDATION_MESSAGES.JOB_NOT_FOUND, 'delete-job');
  }
  
  validateJobStatus(existingJob, ['completed', 'failed', 'missing'], 'delete');
  
  const deleteResult = jobRepository.deleteJob(job_id);
  if (!deleteResult) {
    return errorWithIntent('Failed to delete job', 'delete-job');
  }
  
  // Emit license usage update
  onJobDeleted(job_id);
  
  getLogger().info('Job deleted successfully', 'Routes', { jobId: job_id, jobName: existingJob.name });
  return success({ message: 'Job deleted successfully', intent: 'delete-job' }, SUCCESS_MESSAGES.JOB_DELETED);
}

async function handleCancelJob(formData: FormData): Promise<Response> {
  // サーバー専用の操作をインポート
  const { jobRepository } = await import("~/lib/core/database/server-operations");
  const { getLogger } = await import("~/lib/core/logger/logger.server");
  const { onJobStatusChanged } = await import("~/lib/services/license/license-usage-service.server");

  const job_id = getFormNumber(formData, "job_id");
  
  const existingJob = jobRepository.findJobById(job_id);
  if (!existingJob) {
    return errorWithIntent(VALIDATION_MESSAGES.JOB_NOT_FOUND, 'cancel-job');
  }
  
  validateJobStatus(existingJob, ['waiting', 'starting', 'running'], 'cancel');
  
  const cancelResult = jobRepository.updateJobStatus(job_id, "failed", "Cancelled by user");
  if (!cancelResult) {
    return errorWithIntent('Failed to cancel job', 'cancel-job');
  }
  
  // Emit license usage update for status change
  onJobStatusChanged(job_id, existingJob.status, "failed");
  
  getLogger().info('Job cancelled successfully', 'Routes', { jobId: job_id, jobName: existingJob.name });
  return success({ message: 'Job cancelled successfully', intent: 'cancel-job' }, SUCCESS_MESSAGES.JOB_CANCELLED);
}

// Simple action handler - no complex type abstractions
export async function action({ request }: Route.ActionArgs): Promise<Response> {
  let intent: string | undefined;
  try {
    const formData = await request.formData();
    intent = getFormIntent(formData);
    
    const { getLogger } = await import("~/lib/core/logger/logger.server");
    getLogger().info('Job action called', 'Routes', { intent, method: request.method });
    
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
    return handleApiError(error, 'Job Action', intent);
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
    <MainLayout title={PAGE_TITLES.JOBS} showSystemStatus={true}>
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