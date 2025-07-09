import { Badge } from "~/components/ui/badge";
import type { Job } from "~/lib/core/database";

interface JobStatusBadgeProps {
  status: Job['status'];
}

export function JobStatusBadge({ status }: JobStatusBadgeProps) {
  const getStatusVariant = (status: Job['status']) => {
    switch (status) {
      case 'waiting':
        return 'waiting';
      case 'starting':
        return 'warning';
      case 'running':
        return 'running';
      case 'completed':
        return 'success';
      case 'failed':
        return 'destructive';
      case 'missing':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getStatusText = (status: Job['status']) => {
    switch (status) {
      case 'waiting':
        return 'Waiting';
      case 'starting':
        return 'Starting';
      case 'running':
        return 'Running';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'missing':
        return 'Missing';
      default:
        return 'Unknown';
    }
  };

  return (
    <Badge variant={getStatusVariant(status)}>
      {getStatusText(status)}
    </Badge>
  );
}