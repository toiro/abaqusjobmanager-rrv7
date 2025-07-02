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
import type { Job } from "~/lib/db";
import { calculateLicenseTokens } from "~/lib/licenseCalculator";

interface JobTableProps {
  jobs: Job[];
  onJobAction?: (jobId: number, action: 'view' | 'edit' | 'delete' | 'cancel') => void;
  loading?: boolean;
}

export function JobTable({ jobs, onJobAction, loading }: JobTableProps) {
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

  if (jobs.length === 0) {
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
          {jobs.map((job) => (
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