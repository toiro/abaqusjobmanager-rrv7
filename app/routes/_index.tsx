import { MainLayout } from "~/components/layout/MainLayout";
import { Button } from "~/components/ui/button";
import { JobTable } from "~/components/jobs/JobTable";
import { jobOps, userOps, nodeOps, fileOps } from "~/lib/dbOperations";
import { PAGE_TITLES, BUTTONS, SUCCESS_MESSAGES, ERROR_MESSAGES } from "~/lib/messages";
import type { Route } from "./+types/_index";
import { useState } from "react";
import * as React from "react";
import { NewJobModal } from "~/components/jobs/NewJobModal";
import { promises as fs } from "fs";
import path from "path";
import { logger } from "~/lib/logger";
import { emitFileEvent } from "~/lib/sse";
import { type FileEventData } from "~/lib/sse-schemas";

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

export async function action({ request }: Route.ActionArgs) {
  logger.route('Action called', '_index', { 
    method: request.method,
    url: request.url 
  });
  
  const formData = await request.formData();
  const intent = formData.get("intent");
  
  if (intent === "create-job") {
    logger.userAction('Creating new job', { intent });
    try {
      // Handle file upload
      const inpFile = formData.get("inp_file") as File;
      if (!inpFile || inpFile.size === 0) {
        return { error: ERROR_MESSAGES.FILE_REQUIRED };
      }

      // Validate file type
      const fileName = inpFile.name.toLowerCase();
      if (!fileName.endsWith('.inp')) {
        return { error: ERROR_MESSAGES.INVALID_FILE_TYPE };
      }

      // Validate file size (100MB limit)
      if (inpFile.size > 100 * 1024 * 1024) {
        return { error: ERROR_MESSAGES.FILE_SIZE_EXCEEDED };
      }

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
        console.error("Failed to save file:", error);
        return { error: ERROR_MESSAGES.UPLOAD_FAILED };
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
      
      const jobData = {
        name: formData.get("name") as string,
        status: "waiting" as const,
        file_id: fileId,
        user_id: Number(formData.get("user_id")),
        node_id: Number(formData.get("node_id")),
        cpu_cores: Number(formData.get("cpu_cores")),
        priority: (formData.get("priority") as "low" | "normal" | "high" | "urgent") || "normal",
        created_by: formData.get("created_by") as string || "system"
      };

      // Basic validation
      if (!jobData.name || jobData.name.length < 3) {
        return { error: ERROR_MESSAGES.JOB_NAME_REQUIRED };
      }
      if (!jobData.node_id || isNaN(jobData.node_id)) {
        return { error: ERROR_MESSAGES.NODE_REQUIRED };
      }
      if (!jobData.cpu_cores || jobData.cpu_cores < 1) {
        return { error: ERROR_MESSAGES.CPU_REQUIRED };
      }

      const jobId = jobOps.create(jobData);
      logger.userAction('Job created successfully', { jobId, jobName: jobData.name });
      return { success: SUCCESS_MESSAGES.JOB_CREATED, jobId };
    } catch (error) {
      logger.error("Job creation failed", 'ACTION:create-job', error);
      return { error: ERROR_MESSAGES.UNKNOWN_ERROR };
    }
  }

  return null;
}

export default function Index({ loaderData: { jobs, users, nodes }, actionData }: Route.ComponentProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Close modal on successful job creation
  React.useEffect(() => {
    if (actionData?.success) {
      setIsModalOpen(false);
    }
  }, [actionData]);
  const handleJobAction = (_jobId: number, action: 'view' | 'edit' | 'delete' | 'cancel') => {
    // TODO: Implement job actions
    switch (action) {
      case 'view':
        // Navigate to job details
        break;
      case 'edit':
        // Open edit modal
        break;
      case 'delete':
        // Show delete confirmation
        break;
      case 'cancel':
        // Cancel running job
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
    </MainLayout>
  );
}
