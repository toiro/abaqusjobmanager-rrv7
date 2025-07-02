import { AdminLayout } from "~/components/layout/AdminLayout";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { SuccessMessage, ErrorMessage } from "~/components/ui/message";
import { findAllFiles, findFileById, deleteFileRecord, type FileRecord } from "~/lib/db";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "~/lib/messages";
import { formatFileSize } from "~/lib/utils";
import { useSSE } from "~/hooks/useSSE";
import { emitFileDeleted } from "~/lib/sse";
import { type SSEEvent, type FileEventData } from "~/lib/sse-schemas";
import { useState, useCallback } from "react";
import type { Route } from "./+types/admin.files";
import { 
  success,
  error,
  handleApiError,
  getFormIntent,
  getFormNumber
} from "~/lib/apiHelpers";
import { logger } from "~/lib/logger/logger";

// Simple loader
export function loader() {
  const files = findAllFiles();
  logger.info('Files admin data loaded', 'Routes', { filesCount: files.length });
  return { files };
}

// Simple action handler
export async function action({ request }: Route.ActionArgs): Promise<Response> {
  try {
    const formData = await request.formData();
    const intent = getFormIntent(formData);
    
    logger.info('Files admin action called', 'Routes', { 
      intent,
      method: request.method,
      url: request.url 
    });
    
    if (intent === "delete-file") {
      const fileId = getFormNumber(formData, "fileId");
      
      logger.info('Deleting file', 'Routes', { fileId });
      
      // Check if file exists
      const existingFile = findFileById(fileId);
      if (!existingFile) {
        return error('File not found');
      }
      
      // Delete file from database
      const deleteSuccess = deleteFileRecord(fileId);
      if (!deleteSuccess) {
        return error('Failed to delete file from database');
      }
      
      // TODO: Also delete the physical file from filesystem
      
      // Emit SSE event for real-time updates
      emitFileDeleted({ 
        fileId, 
        fileName: existingFile.original_name 
      });
      
      logger.info('File deleted successfully', 'Routes', { fileId });
      return success(
        { fileId },
        SUCCESS_MESSAGES.FILE_DELETED
      );
    }
    
    return error(ERROR_MESSAGES.INVALID_ACTION);
  } catch (error) {
    return handleApiError(error, 'Files Admin');
  }
}

export default function FilesAdmin({ loaderData, actionData }: Route.ComponentProps) {
  const [files, setFiles] = useState<FileRecord[]>(loaderData.files);
  const [isConnected, setIsConnected] = useState(false);

  // Handle SSE events for real-time updates
  const handleSSEEvent = useCallback((event: SSEEvent<FileEventData>) => {
    logger.debug('SSE file event received', 'Routes', { type: event.type });
    
    if (event.type === 'file_created' && event.data) {
      // File was added, refresh the list
      const updatedFiles = findAllFiles();
      setFiles(updatedFiles);
    } else if (event.type === 'file_deleted' && event.data) {
      // Remove deleted file from state
      setFiles(prevFiles => 
        prevFiles.filter(file => file.id !== event.data!.fileId)
      );
    }
  }, []);

  // Subscribe to file SSE events
  useSSE('files', handleSSEEvent, {
    onConnect: () => setIsConnected(true),
    onDisconnect: () => setIsConnected(false)
  });

  // Handle action results - type as any for React Router v7 compatibility
  const actionResult = actionData as any;
  const isSuccess = actionResult?.success === true;
  const isError = actionResult?.success === false;

  // Calculate file statistics
  const totalFiles = files.length;
  const totalSize = files.reduce((sum, file) => sum + file.file_size, 0);

  return (
    <AdminLayout title="File Management">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">File Management</h1>
          <p className="text-gray-600 mt-2">
            {totalFiles} files • {formatFileSize(totalSize)} total
            {isConnected && (
              <Badge variant="success" className="ml-2">Live</Badge>
            )}
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
                    {file.mime_type || 'Unknown'}
                  </Badge>
                </TableCell>
                <TableCell>{file.uploaded_by || 'Unknown'}</TableCell>
                <TableCell>
                  {file.created_at ? new Date(file.created_at).toLocaleDateString() : 'Unknown'}
                </TableCell>
                <TableCell>
                  <form method="post" className="inline">
                    <input type="hidden" name="intent" value="delete-file" />
                    <input type="hidden" name="fileId" value={file.id} />
                    <Button
                      type="submit"
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        if (!confirm(`Are you sure you want to delete "${file.original_name}"?`)) {
                          e.preventDefault();
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </form>
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
    </AdminLayout>
  );
}