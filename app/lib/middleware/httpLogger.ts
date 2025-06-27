/**
 * HTTP Request/Response Logging Middleware for Hono
 * Integrates with LogTape structured logging system
 */

import type { MiddlewareHandler } from 'hono';
import { logger } from '~/lib/logger/logger';

export interface HttpLogData {
  method: string;
  url: string;
  status: number;
  duration: number;
  userAgent?: string;
  ip?: string;
  requestId?: string;
}

/**
 * HTTP logging middleware that integrates with LogTape
 */
export const httpLogger = (): MiddlewareHandler => {
  return async (c, next) => {
    const start = Date.now();
    const method = c.req.method;
    const url = c.req.url;
    const userAgent = c.req.header('User-Agent');
    const ip = c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP') || 'unknown';
    const requestId = c.req.header('X-Request-ID') || crypto.randomUUID();

    // Log request start
    logger.info('HTTP Request started', 'HTTP_REQUEST', {
      method,
      url,
      userAgent,
      ip,
      requestId
    });

    await next();

    const end = Date.now();
    const duration = end - start;
    const status = c.res.status;

    // Determine log level based on status code
    const logLevel = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
    
    const logData: HttpLogData = {
      method,
      url,
      status,
      duration,
      userAgent,
      ip,
      requestId
    };

    // Log response completion
    logger.structuredLog(logLevel, 'HTTP Request completed', {
      type: 'HTTP_RESPONSE',
      ...logData
    });

    // Performance logging for slow requests (>1000ms)
    if (duration > 1000) {
      logger.performance('Slow HTTP request detected', duration, 'HTTP_PERFORMANCE', {
        method,
        url,
        status,
        requestId
      });
    }
  };
};

/**
 * Simple HTTP logger for basic access logging
 */
export const simpleHttpLogger = (): MiddlewareHandler => {
  return async (c, next) => {
    const start = Date.now();
    
    await next();
    
    const duration = Date.now() - start;
    const status = c.res.status;
    
    logger.info(`${c.req.method} ${c.req.url} ${status} ${duration}ms`, 'HTTP_ACCESS');
  };
};