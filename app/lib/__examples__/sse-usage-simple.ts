/**
 * SSE Usage Examples - Simplified Version
 * Practical examples for the new simplified SSE system
 */

import { 
  emitJobEvent, 
  emitFileEvent, 
  emitJobCreated,
  emitFileDeleted,
  emitSSE
} from '../services/sse/sse.server';

import { 
  createJobEvent,
  createFileEvent,
  type SSEEvent,
  type JobEventData,
  type FileEventData,
  EVENT_TYPES,
  SSE_CHANNELS
} from '../services/sse/sse-schemas';

// Example 1: Basic event emission
export function emitBasicJobEvent() {
  emitJobEvent('job_created', {
    jobId: 123,
    jobName: 'My Analysis Job',
    status: 'waiting'
  });
}

// Example 2: Using typed helpers
export function emitTypedFileEvent() {
  emitFileDeleted({
    fileId: 456,
    fileName: 'analysis.inp',
    fileSize: 1024
  });
}

// Example 3: Generic SSE emission
export function emitCustomEvent() {
  emitSSE('custom-channel', 'custom-event', {
    message: 'Hello World',
    timestamp: new Date().toISOString()
  });
}

// Example 4: Creating events manually
export function createCustomEvents() {
  const jobEvent = createJobEvent('job_status_changed', {
    jobId: 789,
    status: 'running'
  });
  
  const fileEvent = createFileEvent('file_uploaded', {
    fileId: 101,
    fileName: 'new-file.inp'
  });
  
  console.log('Created events:', { jobEvent, fileEvent });
}

// Example 5: Event type constants usage
export function useEventConstants() {
  emitJobEvent(EVENT_TYPES.JOB_CREATED, {
    jobId: 999,
    jobName: 'Constant Event Job'
  });
  
  emitSSE(SSE_CHANNELS.SYSTEM, EVENT_TYPES.PING, {
    message: 'System health check'
  });
}

// Example 6: Component usage pattern
export function componentUsageExample() {
  /*
  In a React component:
  
  import { useSSE } from '~/hooks/useSSE';
  import { type SSEEvent, type JobEventData } from '~/lib/services/sse/sse-schemas';
  
  function MyComponent() {
    const handleJobEvent = (event: SSEEvent<JobEventData>) => {
      console.log('Job event received:', event.type, event.data);
      
      if (event.type === 'job_created') {
        // Handle job creation
      } else if (event.type === 'job_status_changed') {
        // Handle status change
      }
    };
    
    useSSE('jobs', handleJobEvent, {
      onConnect: () => console.log('Connected to job events'),
      onDisconnect: () => console.log('Disconnected from job events')
    });
    
    return <div>My Component</div>;
  }
  */
}