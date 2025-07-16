/**
 * Unified error state management
 * Standardizes error handling patterns across components
 */

export interface ErrorState {
  type: 'error' | 'warning' | 'info' | 'success' | 'loading';
  message: string;
  details?: string;
  recoverable?: boolean;
  timestamp?: number;
}

export type ErrorType = ErrorState['type'];

// Error display configuration
export const ERROR_CONFIGS = {
  error: {
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-600',
    dotColor: 'bg-red-500',
    icon: '✕'
  },
  warning: {
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-600',
    dotColor: 'bg-yellow-500',
    icon: '⚠'
  },
  info: {
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-600',
    dotColor: 'bg-blue-500',
    icon: 'ℹ'
  },
  success: {
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-600',
    dotColor: 'bg-green-500',
    icon: '✓'
  },
  loading: {
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-600',
    dotColor: 'bg-gray-500',
    icon: '⟳'
  }
} as const;

export function getErrorConfig(type: ErrorType) {
  return ERROR_CONFIGS[type];
}

// Helper functions for creating error states
export function createErrorState(
  message: string | Error,
  type: ErrorType = 'error',
  options: Partial<Pick<ErrorState, 'details' | 'recoverable'>> = {}
): ErrorState {
  return {
    type,
    message: message instanceof Error ? message.message : message,
    details: message instanceof Error ? message.stack : options.details,
    recoverable: options.recoverable ?? (type !== 'error'),
    timestamp: Date.now()
  };
}

export function createLoadingState(message: string = 'Loading...'): ErrorState {
  return createErrorState(message, 'loading', { recoverable: true });
}

export function createSuccessState(message: string): ErrorState {
  return createErrorState(message, 'success', { recoverable: false });
}