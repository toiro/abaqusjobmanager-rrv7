/**
 * Type-safe API Routes with enhanced validation and error handling
 */

import { z } from "zod";
// Note: Using generic route handler interface instead of specific RouteConfig import
import { getLogger } from "../logger/logger.server";

// Generic API result type
export type ApiResult<TData, TError = string> =
	| {
			success: true;
			data: TData;
			message?: string;
			timestamp: string;
	  }
	| {
			success: false;
			error: TError;
			details?: unknown;
			timestamp: string;
	  };

// Create success response helper
export function createSuccessResponse<TData>(
	data: TData,
	message?: string,
): ApiResult<TData, never> {
	return {
		success: true,
		data,
		message,
		timestamp: new Date().toISOString(),
	};
}

// Create error response helper
export function createErrorResponse<TError = string>(
	error: TError,
	details?: unknown,
): ApiResult<never, TError> {
	return {
		success: false,
		error,
		details,
		timestamp: new Date().toISOString(),
	};
}

// Base typed route handler interface
export interface TypedRouteHandler<
	TLoaderData = unknown,
	TActionData = unknown,
	TParams = Record<string, string>,
> {
	// Schema definitions for validation
	loaderSchema?: z.ZodSchema<unknown>;
	actionSchema?: z.ZodSchema<unknown>;
	paramsSchema?: z.ZodSchema<TParams>;

	// Route handlers with generic signatures
	loader?(args: {
		request: Request;
		params: TParams;
	}): Promise<TLoaderData> | TLoaderData;
	action?(args: {
		request: Request;
		params: TParams;
	}): Promise<TActionData> | TActionData;

	// Validation helpers
	validateParams?(params: unknown): TParams | null;
	validateLoaderInput?(input: unknown): boolean;
	validateActionInput?(input: unknown): boolean;
}

// Enhanced form data validation
export async function validateFormData<T>(
	request: Request,
	schema: z.ZodSchema<T>,
): Promise<ApiResult<T, string>> {
	try {
		const formData = await request.formData();
		const data = Object.fromEntries(formData.entries());

		// Convert string values to appropriate types
		const processedData = Object.entries(data).reduce(
			(acc, [key, value]) => {
				// Handle common form data conversions
				if (typeof value === "string") {
					// Try to parse numbers
					if (/^\d+$/.test(value)) {
						acc[key] = parseInt(value, 10);
					} else if (/^\d*\.\d+$/.test(value)) {
						acc[key] = parseFloat(value);
					} else if (value === "true" || value === "false") {
						acc[key] = value === "true";
					} else {
						acc[key] = value;
					}
				} else {
					acc[key] = value;
				}
				return acc;
			},
			{} as Record<string, unknown>,
		);

		const result = schema.safeParse(processedData);

		if (result.success) {
			return createSuccessResponse(result.data);
		} else {
			return createErrorResponse("Validation failed", result.error.flatten());
		}
	} catch (error) {
		getLogger().error("Failed to validate form data", "Routes", error);
		return createErrorResponse(
			"Failed to parse form data",
			error instanceof Error ? error.message : "Unknown error",
		);
	}
}

// Enhanced JSON validation
export async function validateJsonBody<T>(
	request: Request,
	schema: z.ZodSchema<T>,
): Promise<ApiResult<T, string>> {
	try {
		const body = await request.json();
		const result = schema.safeParse(body);

		if (result.success) {
			return createSuccessResponse(result.data);
		} else {
			return createErrorResponse("Validation failed", result.error.flatten());
		}
	} catch (error) {
		getLogger().error("Failed to validate JSON body", "Routes", error);
		return createErrorResponse(
			"Failed to parse JSON body",
			error instanceof Error ? error.message : "Unknown error",
		);
	}
}

// URL search params validation
export function validateSearchParams<T>(
	url: URL,
	schema: z.ZodSchema<T>,
): ApiResult<T, string> {
	try {
		const params = Object.fromEntries(url.searchParams.entries());

		// Convert string values to appropriate types
		const processedParams = Object.entries(params).reduce(
			(acc, [key, value]) => {
				// Handle common query param conversions
				if (/^\d+$/.test(value)) {
					acc[key] = parseInt(value, 10);
				} else if (/^\d*\.\d+$/.test(value)) {
					acc[key] = parseFloat(value);
				} else if (value === "true" || value === "false") {
					acc[key] = value === "true";
				} else {
					acc[key] = value;
				}
				return acc;
			},
			{} as Record<string, unknown>,
		);

		const result = schema.safeParse(processedParams);

		if (result.success) {
			return createSuccessResponse(result.data);
		} else {
			return createErrorResponse(
				"Invalid query parameters",
				result.error.flatten(),
			);
		}
	} catch (error) {
		getLogger().error("Failed to validate search params", "Routes", error);
		return createErrorResponse(
			"Failed to parse query parameters",
			error instanceof Error ? error.message : "Unknown error",
		);
	}
}

// Type-safe response builder
export class TypedApiResponse {
	static success<TData>(data: TData, message?: string, status = 200): Response {
		return new Response(JSON.stringify(createSuccessResponse(data, message)), {
			status,
			headers: {
				"Content-Type": "application/json",
			},
		});
	}

	static error<TError = string>(
		error: TError,
		details?: unknown,
		status = 400,
	): Response {
		return new Response(JSON.stringify(createErrorResponse(error, details)), {
			status,
			headers: {
				"Content-Type": "application/json",
			},
		});
	}

	static validation(
		errors: z.ZodFormattedError<unknown>,
		status = 422,
	): Response {
		return TypedApiResponse.error("Validation failed", errors, status);
	}

	static notFound(message = "Resource not found"): Response {
		return TypedApiResponse.error(message, undefined, 404);
	}

	static unauthorized(message = "Unauthorized"): Response {
		return TypedApiResponse.error(message, undefined, 401);
	}

	static forbidden(message = "Forbidden"): Response {
		return TypedApiResponse.error(message, undefined, 403);
	}

	static serverError(
		message = "Internal server error",
		details?: unknown,
	): Response {
		getLogger().error("Server error in API response", "Routes", {
			message,
			details,
		});
		return TypedApiResponse.error(message, details, 500);
	}
}

// Helper for extracting typed data from API results
export function extractApiData<TData, TError>(
	result: ApiResult<TData, TError>,
): TData {
	if (result.success) {
		return result.data;
	}
	throw new Error(`API Error: ${result.error}`);
}

// Type guard for API result success
export function isApiSuccess<TData, TError>(
	result: ApiResult<TData, TError>,
): result is Extract<ApiResult<TData, TError>, { success: true }> {
	return result.success;
}

// Type guard for API result failure
export function isApiError<TData, TError>(
	result: ApiResult<TData, TError>,
): result is Extract<ApiResult<TData, TError>, { success: false }> {
	return !result.success;
}

// Type-safe API client result mapping
export function mapApiResult<TData, TError, TNewData>(
	result: ApiResult<TData, TError>,
	mapper: (data: TData) => TNewData,
): ApiResult<TNewData, TError> {
	if (isApiSuccess(result)) {
		return createSuccessResponse(mapper(result.data), result.message);
	}
	return result;
}
