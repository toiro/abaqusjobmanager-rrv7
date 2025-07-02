import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  parseBearerAuth,
  validateAdminToken,
  createAuthError,
  requireAdminAuth,
  generateAdminToken
} from '../auth';

describe('Authentication System', () => {
  let originalEnv: typeof process.env;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('parseBearerAuth', () => {
    it('should extract token from valid Bearer header', () => {
      const token = parseBearerAuth('Bearer abc123token');
      expect(token).toBe('abc123token');
    });

    it('should return null for missing header', () => {
      const token = parseBearerAuth('');
      expect(token).toBeNull();
    });

    it('should return null for invalid header format', () => {
      const token = parseBearerAuth('Basic abc123');
      expect(token).toBeNull();
    });

    it('should return null for Bearer without token', () => {
      const token = parseBearerAuth('Bearer ');
      expect(token).toBeNull();
    });

    it('should handle Bearer with whitespace', () => {
      const token = parseBearerAuth('Bearer   ');
      expect(token).toBeNull();
    });
  });

  describe('validateAdminToken', () => {
    it('should return true for valid token', () => {
      process.env.ADMIN_TOKEN = 'valid-admin-token';
      const isValid = validateAdminToken('valid-admin-token');
      expect(isValid).toBe(true);
    });

    it('should return false for invalid token', () => {
      process.env.ADMIN_TOKEN = 'valid-admin-token';
      const isValid = validateAdminToken('invalid-token');
      expect(isValid).toBe(false);
    });

    it('should return false when ADMIN_TOKEN not configured', () => {
      delete process.env.ADMIN_TOKEN;
      const isValid = validateAdminToken('any-token');
      expect(isValid).toBe(false);
    });

    it('should return false for empty token', () => {
      process.env.ADMIN_TOKEN = 'valid-admin-token';
      const isValid = validateAdminToken('');
      expect(isValid).toBe(false);
    });
  });

  describe('createAuthError', () => {
    it('should create 401 response with JSON error', () => {
      const response = createAuthError();
      expect(response.status).toBe(401);
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('should contain error message in response body', async () => {
      const response = createAuthError();
      const body = await response.json();
      expect(body).toEqual({ error: 'Unauthorized access' });
    });
  });

  describe('generateAdminToken', () => {
    it('should generate token with admin_ prefix', () => {
      const token = generateAdminToken();
      expect(token).toMatch(/^admin_/);
    });

    it('should generate different tokens on multiple calls', () => {
      const token1 = generateAdminToken();
      const token2 = generateAdminToken();
      expect(token1).not.toBe(token2);
    });

    it('should generate token of reasonable length', () => {
      const token = generateAdminToken();
      // admin_ (6) + variable random characters (usually 11-13)
      expect(token.length).toBeGreaterThanOrEqual(12);
      expect(token.length).toBeLessThanOrEqual(20);
    });
  });

  describe('requireAdminAuth', () => {
    beforeEach(() => {
      process.env.ADMIN_TOKEN = 'test-admin-token';
      process.env.NODE_ENV = 'test'; // Disable debug logging
    });

    it('should allow access with valid Authorization header', () => {
      const request = new Request('http://localhost/admin/files', {
        headers: {
          'Authorization': 'Bearer test-admin-token'
        }
      });
      
      const response = requireAdminAuth(request);
      expect(response).toBeNull(); // null means authentication passed
    });

    it('should allow access with valid token in URL parameter', () => {
      const request = new Request('http://localhost/admin/files?token=test-admin-token');
      
      const response = requireAdminAuth(request);
      expect(response).toBeNull(); // null means authentication passed
    });

    it('should redirect to login for missing token', () => {
      const request = new Request('http://localhost/admin/files');
      
      const response = requireAdminAuth(request);
      expect(response).toBeInstanceOf(Response);
      expect(response?.status).toBe(302); // Redirect status
    });

    it('should allow access to login page without token', () => {
      const request = new Request('http://localhost/admin/login');
      
      const response = requireAdminAuth(request);
      expect(response).toBeNull(); // null means access allowed
    });

    it('should redirect to login with error for invalid token', () => {
      const request = new Request('http://localhost/admin/files?token=invalid-token');
      
      const response = requireAdminAuth(request);
      expect(response).toBeInstanceOf(Response);
      expect(response?.status).toBe(302);
    });

    it('should prioritize Authorization header over URL parameter', () => {
      const request = new Request('http://localhost/admin/files?token=invalid-token', {
        headers: {
          'Authorization': 'Bearer test-admin-token'
        }
      });
      
      const response = requireAdminAuth(request);
      expect(response).toBeNull(); // Should succeed with valid header token
    });

    it('should handle missing ADMIN_TOKEN environment variable', () => {
      delete process.env.ADMIN_TOKEN;
      
      const request = new Request('http://localhost/admin/files?token=any-token');
      
      const response = requireAdminAuth(request);
      expect(response).toBeInstanceOf(Response);
      expect(response?.status).toBe(302);
    });
  });
});