import { AdminLayout } from "~/components/layout/AdminLayout";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { SuccessMessage, ErrorMessage } from "~/components/ui/message";
import { fileOps, type FileRecord } from "~/lib/dbOperations";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "~/lib/messages";
import { formatFileSize } from "~/lib/utils";
import { useSSE } from "~/hooks/useSSE";
import { emitFileEvent } from "~/lib/sse";
import { type FileEvent } from "~/lib/sse-schemas";
import { useState, useCallback } from "react";
import type { Route } from "./+types/admin.files";
import { 
  validateFormData,
  type ApiResult,
  createSuccessResponse,
  createErrorResponse
} from "~/lib/types/api-routes";
import { z } from "zod";
import { logger } from "~/lib/logger/logger";

// Type-safe loader
export function loader() {
  // Auth is handled by parent route (admin.tsx)
  const files = fileOps.findAll();
  logger.route('Files admin data loaded', 'admin.files', { filesCount: files.length });
  return { files };
}

// File deletion schema validation
const FileActionSchema = z.object({
  intent: z.literal("delete-file"),
  fileId: z.number().min(1, "File ID is required")
});

type FileActionResult = ApiResult<{ fileId: number }, string>;

export async function action({ request }: Route.ActionArgs): Promise<FileActionResult> {
  logger.route('Files admin action called', 'admin.files', { 
    method: request.method,
    url: request.url 
  });
  
  try {
    // Validate form data with type safety
    const validationResult = await validateFormData(request, FileActionSchema);
    
    if (!validationResult.success) {
      logger.error('File action validation failed', 'admin.files', validationResult.error);
      return createErrorResponse(validationResult.error, validationResult.details);
    }
    
    const actionData = validationResult.data;
    
    if (actionData.intent === "delete-file") {
      logger.userAction('Deleting file', { fileId: actionData.fileId });
      
      // Check if file exists
      const existingFile = fileOps.findById(actionData.fileId);
      if (!existingFile) {
        return createErrorResponse('File not found');
      }
      
      // Delete file from database
      const deleteSuccess = fileOps.delete(actionData.fileId);
      if (!deleteSuccess) {
        return createErrorResponse('Failed to delete file from database');
      }
      
      // TODO: Also delete the physical file from filesystem
      
      // Emit SSE event for real-time updates
      emitFileEvent('deleted', { 
        fileId: actionData.fileId, 
        fileName: existingFile.original_name 
      });
      
      logger.userAction('File deleted successfully', { fileId: actionData.fileId });
      return createSuccessResponse(
        { fileId: actionData.fileId },
        SUCCESS_MESSAGES.FILE_DELETED
      );
    }
    
    return createErrorResponse(ERROR_MESSAGES.INVALID_ACTION);
  } catch (error) {
    logger.error('Failed to process file action', 'admin.files', error);
    return createErrorResponse(
      ERROR_MESSAGES.UNKNOWN_ERROR,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

export default function FilesAdmin({ loaderData, actionData }: Route.ComponentProps) {
  const [files, setFiles] = useState<FileRecord[]>(loaderData.files);
  const [isConnected, setIsConnected] = useState(false);

  // Handle SSE events for real-time updates
  const handleSSEEvent = useCallback((_event: FileEvent) => {
    // Type guard ensures we only receive file events
    // Refresh files data
    setFiles(fileOps.findAll());
  }, []);

  // Setup SSE connection with strict channel validation
  useSSE({
    channel: 'files' as const,
    onEvent: handleSSEEvent,
    onConnect: () => setIsConnected(true),
    onDisconnect: () => setIsConnected(false),
    enabled: true,
    strictChannelValidation: true
  });

  const connectionStatus = (
    <div className="flex items-center gap-2">
      <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
      <span className="text-sm text-gray-600">
        {isConnected ? 'Live Updates' : 'Disconnected'}
      </span>
    </div>
  );

  return (
    <AdminLayout
      title="File Management"
      description="Manage uploaded INP files and results"
      actions={connectionStatus}
    >
      <div className="space-y-6">
        {/* Messages */}
        {actionData && 'success' in actionData && actionData.success && actionData.message && (
          <SuccessMessage message={actionData.message} />
        )}
        {actionData && 'error' in actionData && !actionData.success && (
          <ErrorMessage message={typeof actionData.error === 'string' ? actionData.error : 'An error occurred'} />
        )}

        {/* File Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm font-medium text-blue-900">Total Files</span>
            </div>
            <p className="text-2xl font-bold text-blue-900 mt-2">{files.length}</p>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              <span className="text-sm font-medium text-green-900">Total Size</span>
            </div>
            <p className="text-2xl font-bold text-green-900 mt-2">
              {formatFileSize(files.reduce((total, file) => total + file.file_size, 0))}
            </p>
          </div>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              <span className="text-sm font-medium text-purple-900">INP Files</span>
            </div>
            <p className="text-2xl font-bold text-purple-900 mt-2">
              {files.filter(f => f.original_name.toLowerCase().endsWith('.inp')).length}
            </p>
          </div>
          
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <svg className="h-5 w-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-orange-900">Recent</span>
            </div>
            <p className="text-2xl font-bold text-orange-900 mt-2">
              {files.filter(f => {
                const uploadDate = new Date(f.created_at || '');
                const now = new Date();
                const daysDiff = (now.getTime() - uploadDate.getTime()) / (1000 * 3600 * 24);
                return daysDiff <= 7;
              }).length}
            </p>
          </div>
        </div>

        {/* Files Table */}
        {files.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-600 mb-4">No files uploaded yet</p>
            <p className="text-sm text-gray-500">Files will appear here when users upload INP files</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Original Name</TableHead>
                  <TableHead>File Size</TableHead>
                  <TableHead>MIME Type</TableHead>
                  <TableHead>Uploaded By</TableHead>
                  <TableHead>Upload Date</TableHead>
                  <TableHead>Storage Path</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <svg className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>{file.original_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {formatFileSize(file.file_size)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-gray-500">
                      {file.mime_type || 'unknown'}
                    </TableCell>
                    <TableCell>{file.uploaded_by || 'system'}</TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {file.created_at ? new Date(file.created_at).toLocaleString() : "-"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-gray-500 max-w-xs truncate">
                      {file.file_path}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button variant="ghost" size="sm">
                          Download
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}