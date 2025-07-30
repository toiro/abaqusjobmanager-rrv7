/**
 * Custom hook for unified error state management
 * Provides consistent error handling across components
 */

import { useState } from "react";
import type { ErrorState, ErrorType } from "./ErrorState";
import {
	createErrorState,
	createLoadingState,
	createSuccessState,
} from "./ErrorState";

export function useErrorState() {
	const [errorState, setErrorState] = useState<ErrorState | null>(null);

	const setError = (
		error: string | Error,
		type: ErrorType = "error",
		options?: Partial<Pick<ErrorState, "details" | "recoverable">>,
	) => {
		setErrorState(createErrorState(error, type, options));
	};

	const setLoading = (message: string = "Loading...") => {
		setErrorState(createLoadingState(message));
	};

	const setSuccess = (message: string) => {
		setErrorState(createSuccessState(message));
	};

	const setWarning = (message: string | Error, recoverable = true) => {
		setErrorState(createErrorState(message, "warning", { recoverable }));
	};

	const setInfo = (message: string) => {
		setErrorState(createErrorState(message, "info", { recoverable: true }));
	};

	const clearError = () => {
		setErrorState(null);
	};

	const isLoading = errorState?.type === "loading";
	const hasError = errorState?.type === "error";
	const hasWarning = errorState?.type === "warning";
	const hasSuccess = errorState?.type === "success";

	return {
		// State
		errorState,
		isLoading,
		hasError,
		hasWarning,
		hasSuccess,

		// Actions
		setError,
		setLoading,
		setSuccess,
		setWarning,
		setInfo,
		clearError,
	};
}

// Specialized hooks for common patterns
export function useAsyncErrorState() {
	const errorState = useErrorState();

	const executeAsync = async <T>(
		asyncFn: () => Promise<T>,
		loadingMessage?: string,
		successMessage?: string,
	): Promise<T | null> => {
		try {
			if (loadingMessage) {
				errorState.setLoading(loadingMessage);
			}

			const result = await asyncFn();

			if (successMessage) {
				errorState.setSuccess(successMessage);
			} else {
				errorState.clearError();
			}

			return result;
		} catch (error) {
			errorState.setError(
				error instanceof Error ? error : new Error(String(error)),
			);
			return null;
		}
	};

	return {
		...errorState,
		executeAsync,
	};
}

// Hook for validation-based error handling
export function useValidationErrorState<T>() {
	const errorState = useErrorState();

	const validateAndSet = (
		value: T,
		validator: (value: T) => string | null,
		onSuccess?: (value: T) => void,
	): boolean => {
		const validationError = validator(value);

		if (validationError) {
			errorState.setError(validationError, "error", { recoverable: true });
			return false;
		}

		errorState.clearError();
		onSuccess?.(value);
		return true;
	};

	return {
		...errorState,
		validateAndSet,
	};
}
