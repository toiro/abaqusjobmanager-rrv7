/**
 * Delete File Dialog Component
 * BaseDialog pattern implementation for file deletion confirmation
 */

import { BaseDialog } from "~/components/shared/BaseDialog";
import type { BaseDialogConfig } from "~/components/shared/BaseDialog";
import { Badge } from "~/components/ui";
import type { FileRecord, FileWithJobs } from "~/lib/core/database";

interface DeleteFileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileWithJobs | null;
  actionData?: {
    success?: string;
    error?: string;
    intent?: string;
  };
}

export function DeleteFileDialog({ 
  isOpen, 
  onClose, 
  file, 
  actionData 
}: DeleteFileDialogProps) {
  
  if (!file) return null;

  const config: BaseDialogConfig = {
    title: "Delete File",
    intent: "delete-file",
    submitText: "Delete File",
    submittingText: "Deleting...",
    cancelText: "Cancel"
  };

  const hiddenFields = {
    fileId: file.id?.toString() || ""
  };

  const isFormValid = true; // Always valid for deletion

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      config={config}
      isFormValid={isFormValid}
      actionData={actionData}
      hiddenFields={hiddenFields}
    >
      <div className="space-y-4">
        {/* File Information */}
        <div className="bg-gray-50 rounded-lg p-4 border">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-600">File Name:</span>
              <span className="text-sm text-gray-900">{file.original_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-600">Size:</span>
              <span className="text-sm text-gray-900">
                {(file.file_size / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-600">Uploaded By:</span>
              <span className="text-sm text-gray-900">{file.uploaded_by || "Unknown"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-600">Upload Date:</span>
              <span className="text-sm text-gray-900">
                {file.created_at 
                  ? new Date(file.created_at).toLocaleDateString() 
                  : "Unknown"}
              </span>
            </div>
          </div>
        </div>

        {/* Job References */}
        {file.referencingJobs && file.referencingJobs.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <svg className="h-4 w-4 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium text-blue-800">
                Referenced by {file.referencingJobs.length} job{file.referencingJobs.length !== 1 ? 's' : ''}:
              </span>
            </div>
            <div className="space-y-2">
              {file.referencingJobs.map((job: any, index: number) => (
                <div key={job.jobId} className="flex items-center justify-between bg-white rounded p-2 border">
                  <div>
                    <div className="font-medium text-sm">{job.jobName}</div>
                    <div className="text-xs text-gray-600">Owner: {job.jobOwner}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={
                        job.jobStatus === 'completed' ? 'default' :
                        job.jobStatus === 'running' ? 'secondary' :
                        job.jobStatus === 'failed' ? 'destructive' :
                        'outline'
                      }
                      className="text-xs"
                    >
                      {job.jobStatus}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warning Message */}
        <div className={`border-l-4 p-3 rounded ${
          file.referencingJobs && file.referencingJobs.length > 0 
            ? 'bg-red-50 border-red-400' 
            : 'bg-yellow-50 border-yellow-400'
        }`}>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className={`h-4 w-4 ${
                file.referencingJobs && file.referencingJobs.length > 0 
                  ? 'text-red-400' 
                  : 'text-yellow-400'
              }`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className={`text-sm ${
                file.referencingJobs && file.referencingJobs.length > 0 
                  ? 'text-red-800' 
                  : 'text-yellow-800'
              }`}>
                <strong>Warning:</strong> {
                  file.referencingJobs && file.referencingJobs.length > 0 
                    ? `This file is actively referenced by ${file.referencingJobs.length} job${file.referencingJobs.length !== 1 ? 's' : ''}. Deleting it will affect those jobs and may cause execution failures.`
                    : 'This file may be referenced by existing jobs. Deleting it could affect job execution and results.'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </BaseDialog>
  );
}