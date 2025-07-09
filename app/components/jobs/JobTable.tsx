import { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { JobStatusBadge } from "./JobStatusBadge";
import { TABLE_HEADERS, BUTTONS, INFO_MESSAGES } from "~/lib/messages";
import type { Job } from "~/lib/core/types/database";
import { calculateLicenseTokens } from "~/lib/services/license/license-calculator";
import { useJobSSE } from "~/hooks/useSSE";
import type { SSEEvent } from "~/lib/services/sse/sse-schemas";

interface JobTableProps {
  jobs: Job[];
  onJobAction?: (jobId: number, action: 'view' | 'edit' | 'delete' | 'cancel') => void;
  loading?: boolean;
  enableRealTimeUpdates?: boolean;
}

export function JobTable({ jobs, onJobAction, loading, enableRealTimeUpdates = true }: JobTableProps) {
  // Local state for real-time job updates
  const [currentJobs, setCurrentJobs] = useState<Job[]>(jobs);
  const [isMounted, setIsMounted] = useState(false);

  // Client-side mounting detection
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Update local jobs when props change
  useEffect(() => {
    setCurrentJobs(jobs);
  }, [jobs]);

  // SSE connection for real-time job updates (only on client-side)
  const { connectionState } = useJobSSE((event: SSEEvent) => {
    if (!enableRealTimeUpdates || !isMounted) return;

    // Handle job-specific events
    switch (event.type) {
      case 'job_created':
      case 'job_updated': {
        const updatedJob = event.data as Job;
        setCurrentJobs(prevJobs => {
          const existingIndex = prevJobs.findIndex(job => job.id === updatedJob.id);
          if (existingIndex >= 0) {
            // Update existing job
            const newJobs = [...prevJobs];
            newJobs[existingIndex] = updatedJob;
            return newJobs;
          } else {
            // Add new job
            return [updatedJob, ...prevJobs];
          }
        });
        break;
      }

      case 'job_deleted': {
        const deletedJobId = event.data as { id: number };
        setCurrentJobs(prevJobs => prevJobs.filter(job => job.id !== deletedJobId.id));
        break;
      }

      case 'job_status_changed': {
        const statusUpdate = event.data as { id: number; status: Job['status']; updated_at?: string };
        setCurrentJobs(prevJobs => 
          prevJobs.map(job => 
            job.id === statusUpdate.id 
              ? { ...job, status: statusUpdate.status, updated_at: statusUpdate.updated_at }
              : job
          )
        );
        break;
      }
    }
  }, {
    autoReconnect: true,
    reconnectDelay: 2000,
    maxReconnectAttempts: 5
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      // Use consistent format that doesn't depend on locale
      return date.toISOString().replace('T', ' ').substring(0, 19);
    } catch {
      return dateString;
    }
  };

  const handleAction = (jobId: number, action: 'view' | 'edit' | 'delete' | 'cancel') => {
    onJobAction?.(jobId, action);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">{INFO_MESSAGES.LOADING}</p>
        </div>
      </div>
    );
  }

  if (currentJobs.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-muted-foreground mb-4">
          <svg
            className="h-12 w-12 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <p>{INFO_MESSAGES.NO_JOBS}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      {/* Real-time connection indicator (only show on client-side) */}
      {isMounted && enableRealTimeUpdates && (
        <div className="px-4 py-2 bg-muted/30 border-b text-xs flex items-center justify-between">
          <span className="text-muted-foreground">Job Table</span>
          <div className="flex items-center space-x-2">
            <div className={`h-2 w-2 rounded-full ${
              connectionState === 'connected' ? 'bg-green-500' : 
              connectionState === 'connecting' ? 'bg-yellow-500' :
              connectionState === 'error' ? 'bg-orange-500' :
              'bg-red-500'
            }`}></div>
            <span className="text-muted-foreground">
              {connectionState === 'connected' ? 'Real-time updates' : 
               connectionState === 'connecting' ? 'Connecting...' :
               connectionState === 'error' ? 'Connection error' :
               'Offline mode'}
            </span>
          </div>
        </div>
      )}
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{TABLE_HEADERS.ID}</TableHead>
            <TableHead>{TABLE_HEADERS.JOB_NAME}</TableHead>
            <TableHead>{TABLE_HEADERS.STATUS}</TableHead>
            <TableHead>{TABLE_HEADERS.NODE}</TableHead>
            <TableHead>{TABLE_HEADERS.CPU}</TableHead>
            <TableHead>{TABLE_HEADERS.LICENSE}</TableHead>
            <TableHead>{TABLE_HEADERS.USER}</TableHead>
            <TableHead>{TABLE_HEADERS.CREATED}</TableHead>
            <TableHead className="text-right">{TABLE_HEADERS.ACTIONS}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentJobs.map((job) => (
            <TableRow key={job.id}>
              <TableCell className="font-mono text-sm">
                #{job.id?.toString().padStart(4, '0') || '-'}
              </TableCell>
              <TableCell className="font-medium">
                {job.name}
              </TableCell>
              <TableCell>
                <JobStatusBadge status={job.status} />
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {job.node_id ? `Node ${job.node_id}` : "Unassigned"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-1">
                  <svg
                    className="h-3 w-3 text-muted-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                    />
                  </svg>
                  <span className="text-sm">{job.cpu_cores}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-1">
                  <svg
                    className="h-3 w-3 text-muted-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                    />
                  </svg>
                  <span className="text-sm">{calculateLicenseTokens(job.cpu_cores)}</span>
                </div>
              </TableCell>
              <TableCell className="text-sm">
                {job.user_id || "-"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(job.created_at)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => job.id && handleAction(job.id, 'view')}
                  >
                    {BUTTONS.VIEW_DETAILS}
                  </Button>
                  {job.status === 'waiting' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => job.id && handleAction(job.id, 'edit')}
                    >
                      {BUTTONS.EDIT}
                    </Button>
                  )}
                  {(job.status === 'waiting' || job.status === 'starting' || job.status === 'running') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => job.id && handleAction(job.id, 'cancel')}
                      className="text-destructive hover:text-destructive"
                    >
                      {BUTTONS.CANCEL_JOB}
                    </Button>
                  )}
                  {(job.status === 'completed' || job.status === 'failed' || job.status === 'missing') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => job.id && handleAction(job.id, 'delete')}
                      className="text-destructive hover:text-destructive"
                    >
                      {BUTTONS.DELETE}
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}