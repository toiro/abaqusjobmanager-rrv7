/**
 * Simple, direct API helpers - replacing complex TypedRouteHandler abstractions
 * Focuses on essential functionality without over-engineering
 */

import { logger } from "./logger/logger";
import type { ZodSchema } from "zod";

/**
 * Simple API result type
 */
export type ApiResponse<T> = {
  success: true;
  data: T;
  message?: string;
} | {
  success: false;
  error: string;
  details?: any;
};

/**
 * Create success response
 */
export function success<T>(data: T, message?: string): Response {
  return Response.json({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  });
}

/**
 * Create error response
 */
export function error(message: string, details?: any, status = 400): Response {
  logger.error('API error response', 'Routes', { message, details, status });
  return Response.json({
    success: false,
    error: message,
    details,
    timestamp: new Date().toISOString()
  }, { status });
}

/**
 * Common HTTP error responses
 */
export const httpError = {
  badRequest: (message = 'Bad Request', details?: any) => error(message, details, 400),
  unauthorized: (message = 'Unauthorized') => error(message, undefined, 401),
  forbidden: (message = 'Forbidden') => error(message, undefined, 403),
  notFound: (message = 'Not Found') => error(message, undefined, 404),
  conflict: (message = 'Conflict', details?: any) => error(message, details, 409),
  validation: (message = 'Validation Error', details?: any) => error(message, details, 422),
  serverError: (message = 'Internal Server Error', details?: any) => error(message, details, 500)
};

/**
 * Parse and validate form data
 */
export async function parseFormData<T>(
  request: Request, 
  schema: ZodSchema<T>
): Promise<T> {
  try {
    const formData = await request.formData();
    const data = Object.fromEntries(formData.entries());
    
    // Convert common form data types
    const processed = Object.entries(data).reduce((acc, [key, value]) => {
      if (typeof value === 'string') {
        // Convert numbers
        if (/^\d+$/.test(value)) {
          acc[key] = parseInt(value, 10);
        } else if (/^\d*\.\d+$/.test(value)) {
          acc[key] = parseFloat(value);
        } else if (value === 'true' || value === 'false') {
          acc[key] = value === 'true';
        } else {
          acc[key] = value;
        }
      } else {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);
    
    const result = schema.parse(processed);
    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw new ValidationError('Form validation failed', error.message);
    }
    throw new ValidationError('Form validation failed', 'Unknown validation error');
  }
}

/**
 * Parse and validate JSON body
 */
export async function parseJsonBody<T>(
  request: Request, 
  schema: ZodSchema<T>
): Promise<T> {
  try {
    const body = await request.json();
    const result = schema.parse(body);
    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw new ValidationError('JSON validation failed', error.message);
    }
    throw new ValidationError('JSON validation failed', 'Unknown validation error');
  }
}

/**
 * Parse and validate URL search params
 */
export function parseSearchParams<T>(
  url: URL, 
  schema: ZodSchema<T>
): T {
  try {
    const params = Object.fromEntries(url.searchParams.entries());
    
    // Convert query param types
    const processed = Object.entries(params).reduce((acc, [key, value]) => {
      if (/^\d+$/.test(value)) {
        acc[key] = parseInt(value, 10);
      } else if (/^\d*\.\d+$/.test(value)) {
        acc[key] = parseFloat(value);
      } else if (value === 'true' || value === 'false') {
        acc[key] = value === 'true';
      } else {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);
    
    const result = schema.parse(processed);
    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw new ValidationError('Query params validation failed', error.message);
    }
    throw new ValidationError('Query params validation failed', 'Unknown validation error');
  }
}

/**
 * Custom validation error
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public details?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Handle API errors with proper logging and response
 */
export function handleApiError(error: unknown, context = 'API'): Response {
  if (error instanceof ValidationError) {
    return httpError.validation(error.message, error.details);
  }
  
  if (error instanceof Error) {
    logger.error(`${context} error`, 'Routes', { 
      error: error.message, 
      stack: error.stack 
    });
    
    // Don't expose internal errors in production
    const message = process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message;
      
    return httpError.serverError(message);
  }
  
  logger.error(`${context} unknown error`, 'Routes', { error });
  return httpError.serverError();
}

/**
 * Safe API handler wrapper
 */
export function safeApiHandler<T>(
  handler: () => Promise<T> | T,
  context = 'API'
): Promise<Response> {
  return Promise.resolve()
    .then(() => handler())
    .then(result => success(result))
    .catch(error => handleApiError(error, context));
}

/**
 * Extract form intent (action type)
 */
export function getFormIntent(formData: FormData): string {
  const intent = formData.get('intent');
  if (typeof intent !== 'string' || !intent) {
    throw new ValidationError('Missing or invalid intent');
  }
  return intent;
}

/**
 * Get form value as string
 */
export function getFormString(formData: FormData, key: string, required = true): string {
  const value = formData.get(key);
  if (typeof value !== 'string') {
    if (required) {
      throw new ValidationError(`Missing or invalid ${key}`);
    }
    return '';
  }
  return value;
}

/**
 * Get form value as number
 */
export function getFormNumber(formData: FormData, key: string, required = true): number {
  const value = formData.get(key);
  if (typeof value !== 'string' || !value) {
    if (required) {
      throw new ValidationError(`Missing ${key}`);
    }
    return 0;
  }
  
  const num = parseInt(value, 10);
  if (isNaN(num)) {
    throw new ValidationError(`Invalid ${key}: must be a number`);
  }
  
  return num;
}

/**
 * Get form value as boolean
 */
export function getFormBoolean(formData: FormData, key: string, defaultValue = false): boolean {
  const value = formData.get(key);
  if (typeof value !== 'string') {
    return defaultValue;
  }
  return value === 'true' || value === 'on' || value === '1';
}