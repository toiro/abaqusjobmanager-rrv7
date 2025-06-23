import { describe, it, expect } from 'bun:test';
import {
  FileEventSchema,
  JobEventSchema,
  NodeEventSchema,
  UserEventSchema,
  SystemEventSchema,
  SSEEventUnionSchema,
  SSEChannelSchema,
  validateFileEvent,
  validateJobEvent,
  validateSSEEventUnion,
  validateEventForChannel,
  isFileEvent,
  isJobEvent,
  isSystemEvent,
  validateSSEEvent,
  isValidChannel,
  type SSEChannel
} from '../sse-schemas';

describe('SSE Schema Validation', () => {
  describe('SSEChannelSchema', () => {
    it('should validate valid channel names', () => {
      const validChannels: SSEChannel[] = ['files', 'jobs', 'nodes', 'users', 'system'];
      
      validChannels.forEach(channel => {
        const result = SSEChannelSchema.safeParse(channel);
        expect(result.success).toBe(true);
        expect(isValidChannel(channel)).toBe(true);
      });
    });

    it('should reject invalid channel names', () => {
      const invalidChannels = ['invalid', 'test', '', null, undefined, 123];
      
      invalidChannels.forEach(channel => {
        const result = SSEChannelSchema.safeParse(channel);
        expect(result.success).toBe(false);
        expect(isValidChannel(channel as any)).toBe(false);
      });
    });
  });

  describe('FileEventSchema', () => {
    it('should validate valid file events', () => {
      const validFileEvent = {
        type: 'file_created',
        data: {
          fileId: 123,
          fileName: 'test.inp',
          fileSize: 1024,
          mimeType: 'application/octet-stream',
          uploadedBy: 'testuser'
        },
        timestamp: '2024-01-01T00:00:00.000Z'
      };

      const result = FileEventSchema.safeParse(validFileEvent);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('file_created');
        expect(result.data.data?.fileId).toBe(123);
      }
    });

    it('should reject invalid file event types', () => {
      const invalidFileEvent = {
        type: 'invalid_type',
        data: { fileId: 123 }
      };

      const result = FileEventSchema.safeParse(invalidFileEvent);
      expect(result.success).toBe(false);
    });

    it('should validate file event without data', () => {
      const minimalFileEvent = {
        type: 'file_deleted'
      };

      const result = FileEventSchema.safeParse(minimalFileEvent);
      expect(result.success).toBe(true);
    });
  });

  describe('JobEventSchema', () => {
    it('should validate valid job events', () => {
      const validJobEvent = {
        type: 'job_created',
        data: {
          jobId: 456,
          jobName: 'Test Job',
          status: 'waiting',
          nodeId: 1,
          userId: 1,
          cpuCores: 4,
          priority: 'normal'
        }
      };

      const result = JobEventSchema.safeParse(validJobEvent);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('job_created');
        expect(result.data.data?.status).toBe('waiting');
      }
    });

    it('should reject invalid job status', () => {
      const invalidJobEvent = {
        type: 'job_updated',
        data: {
          jobId: 456,
          status: 'invalid_status'
        }
      };

      const result = JobEventSchema.safeParse(invalidJobEvent);
      expect(result.success).toBe(false);
    });
  });

  describe('SystemEventSchema', () => {
    it('should validate ping events', () => {
      const pingEvent = {
        type: 'ping',
        timestamp: '2024-01-01T00:00:00.000Z'
      };

      const result = SystemEventSchema.safeParse(pingEvent);
      expect(result.success).toBe(true);
    });

    it('should validate connection events', () => {
      const connectedEvent = {
        type: 'connected',
        data: {
          channel: 'files',
          message: 'Connected to files channel'
        }
      };

      const result = SystemEventSchema.safeParse(connectedEvent);
      expect(result.success).toBe(true);
    });
  });

  describe('SSEEventUnionSchema', () => {
    it('should validate any valid SSE event type', () => {
      const events = [
        { type: 'file_created', data: { fileId: 1 } },
        { type: 'job_updated', data: { jobId: 2, status: 'running' } },
        { type: 'node_deleted', data: { nodeId: 3 } },
        { type: 'user_created', data: { userId: 4 } },
        { type: 'ping' }
      ];

      events.forEach(event => {
        const result = SSEEventUnionSchema.safeParse(event);
        expect(result.success).toBe(true);
      });
    });

    it('should reject completely invalid events', () => {
      const invalidEvents = [
        { type: 'invalid_event_type' },
        { invalidField: 'test' },
        null,
        undefined,
        'string'
      ];

      invalidEvents.forEach(event => {
        const result = SSEEventUnionSchema.safeParse(event);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Validation Helper Functions', () => {
    it('should return valid events when validation succeeds', () => {
      const validFileEvent = {
        type: 'file_created',
        data: { fileId: 123, fileName: 'test.inp' }
      };

      const result = validateFileEvent(validFileEvent);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('file_created');
    });

    it('should return null when validation fails', () => {
      const invalidEvent = {
        type: 'invalid_type',
        data: { fileId: 123 }
      };

      const result = validateFileEvent(invalidEvent);
      expect(result).toBeNull();
    });

    it('should validate any SSE event correctly', () => {
      const validEvent = {
        type: 'job_status_changed',
        data: { jobId: 456, status: 'completed' }
      };

      const result = validateSSEEventUnion(validEvent);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('job_status_changed');
    });

    it('should validate events for specific channels', () => {
      const fileEvent = {
        type: 'file_created',
        data: { fileId: 123, fileName: 'test.inp' }
      };

      const result = validateEventForChannel(fileEvent, 'files');
      expect(result).not.toBeNull();
      expect(result?.type).toBe('file_created');

      // Wrong channel should return null
      const wrongChannelResult = validateEventForChannel(fileEvent, 'jobs');
      expect(wrongChannelResult).toBeNull();
    });

    it('should use generic validation helper', () => {
      const fileEvent = { type: 'file_created', data: { fileId: 123 } };
      
      const result = validateSSEEvent(fileEvent, FileEventSchema);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('file_created');
    });

    it('should validate type guards correctly', () => {
      const fileEvent = { type: 'file_created', data: { fileId: 123 } };
      const jobEvent = { type: 'job_updated', data: { jobId: 456 } };
      const systemEvent = { type: 'ping' };

      expect(isFileEvent(fileEvent as any)).toBe(true);
      expect(isJobEvent(jobEvent as any)).toBe(true);
      expect(isSystemEvent(systemEvent as any)).toBe(true);
      
      // Cross-type validation should fail
      expect(isFileEvent(jobEvent as any)).toBe(false);
      expect(isJobEvent(systemEvent as any)).toBe(false);
    });
  });
});