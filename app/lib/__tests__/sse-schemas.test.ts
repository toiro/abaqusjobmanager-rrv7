import { describe, it, expect } from 'bun:test';
import {
  validateSSEEvent,
  createSSEEvent,
  createJobEvent,
  createFileEvent,
  createNodeEvent,
  createUserEvent,
  createSystemEvent,
  isValidChannel,
  SSE_CHANNELS,
  EVENT_TYPES,
  type SSEEvent,
  type JobEventData,
  type FileEventData
} from '../sse-schemas';

describe('Simplified SSE Schema System', () => {
  describe('validateSSEEvent', () => {
    it('should validate a proper SSE event', () => {
      const validEvent = {
        type: 'test_event',
        channel: 'test',
        data: { message: 'hello' },
        timestamp: '2025-07-01T13:00:00.000Z'
      };

      const result = validateSSEEvent(validEvent);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('test_event');
      expect(result?.channel).toBe('test');
    });

    it('should add timestamp if missing', () => {
      const eventWithoutTimestamp = {
        type: 'test_event',
        channel: 'test',
        data: { message: 'hello' }
      };

      const result = validateSSEEvent(eventWithoutTimestamp);
      expect(result).not.toBeNull();
      expect(result?.timestamp).toBeDefined();
    });

    it('should reject invalid events', () => {
      const invalidEvents = [
        null,
        undefined,
        'string',
        123,
        {},
        { type: 'test' }, // missing channel
        { channel: 'test' }, // missing type
        { type: 123, channel: 'test' }, // invalid type
        { type: 'test', channel: 123 } // invalid channel
      ];

      invalidEvents.forEach(event => {
        const result = validateSSEEvent(event);
        expect(result).toBeNull();
      });
    });
  });

  describe('createSSEEvent', () => {
    it('should create a proper SSE event', () => {
      const event = createSSEEvent('jobs', 'job_created', { jobId: 123 });
      
      expect(event.type).toBe('job_created');
      expect(event.channel).toBe('jobs');
      expect(event.data).toEqual({ jobId: 123 });
      expect(event.timestamp).toBeDefined();
    });

    it('should work without data', () => {
      const event = createSSEEvent('system', 'ping');
      
      expect(event.type).toBe('ping');
      expect(event.channel).toBe('system');
      expect(event.data).toBeUndefined();
      expect(event.timestamp).toBeDefined();
    });
  });

  describe('Specific event creators', () => {
    it('should create job events', () => {
      const jobData: JobEventData = {
        jobId: 123,
        jobName: 'Test Job',
        status: 'waiting'
      };

      const event = createJobEvent('job_created', jobData);
      
      expect(event.type).toBe('job_created');
      expect(event.channel).toBe('jobs');
      expect(event.data).toEqual(jobData);
    });

    it('should create file events', () => {
      const fileData: FileEventData = {
        fileId: 456,
        fileName: 'test.inp',
        fileSize: 1024
      };

      const event = createFileEvent('file_uploaded', fileData);
      
      expect(event.type).toBe('file_uploaded');
      expect(event.channel).toBe('files');
      expect(event.data).toEqual(fileData);
    });

    it('should create events without data', () => {
      const events = [
        createJobEvent('job_ping'),
        createFileEvent('file_ping'),
        createNodeEvent('node_ping'),
        createUserEvent('user_ping'),
        createSystemEvent('system_ping')
      ];

      events.forEach(event => {
        expect(event.type).toContain('ping');
        expect(event.timestamp).toBeDefined();
        expect(event.data).toBeUndefined();
      });
    });
  });

  describe('Channel validation', () => {
    it('should validate known channels', () => {
      const validChannels = Object.values(SSE_CHANNELS);
      
      validChannels.forEach(channel => {
        expect(isValidChannel(channel)).toBe(true);
      });
    });

    it('should reject unknown channels', () => {
      const invalidChannels = ['unknown', 'invalid', '', 123, null, undefined];
      
      invalidChannels.forEach(channel => {
        expect(isValidChannel(channel as any)).toBe(false);
      });
    });
  });

  describe('Event type constants', () => {
    it('should have all expected job event types', () => {
      expect(EVENT_TYPES.JOB_CREATED).toBe('job_created');
      expect(EVENT_TYPES.JOB_UPDATED).toBe('job_updated');
      expect(EVENT_TYPES.JOB_DELETED).toBe('job_deleted');
      expect(EVENT_TYPES.JOB_STATUS_CHANGED).toBe('job_status_changed');
    });

    it('should have all expected file event types', () => {
      expect(EVENT_TYPES.FILE_CREATED).toBe('file_created');
      expect(EVENT_TYPES.FILE_UPDATED).toBe('file_updated');
      expect(EVENT_TYPES.FILE_DELETED).toBe('file_deleted');
    });

    it('should have all expected system event types', () => {
      expect(EVENT_TYPES.PING).toBe('ping');
      expect(EVENT_TYPES.CONNECTED).toBe('connected');
      expect(EVENT_TYPES.DISCONNECTED).toBe('disconnected');
      expect(EVENT_TYPES.ERROR).toBe('error');
    });
  });

  describe('Channel constants', () => {
    it('should have all expected channels', () => {
      expect(SSE_CHANNELS.JOBS).toBe('jobs');
      expect(SSE_CHANNELS.FILES).toBe('files');
      expect(SSE_CHANNELS.NODES).toBe('nodes');
      expect(SSE_CHANNELS.USERS).toBe('users');
      expect(SSE_CHANNELS.SYSTEM).toBe('system');
    });
  });
});