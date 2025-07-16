/**
 * Unified error display component
 * Provides consistent error UI across all components
 */

import type { ErrorState } from "./ErrorState";
import { getErrorConfig } from "./ErrorState";
import { cn } from "~/lib/helpers/utils";

interface ErrorDisplayProps {
  error: ErrorState;
  variant?: 'inline' | 'alert' | 'minimal';
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
  showIcon?: boolean;
  showDismiss?: boolean;
}

export function ErrorDisplay({ 
  error, 
  variant = 'inline',
  onRetry,
  onDismiss,
  className,
  showIcon = true,
  showDismiss = true
}: ErrorDisplayProps) {
  const config = getErrorConfig(error.type);

  // Minimal variant - just text
  if (variant === 'minimal') {
    return (
      <span className={cn(`text-sm ${config.textColor}`, className)}>
        {showIcon && <span className="mr-1">{config.icon}</span>}
        {error.message}
      </span>
    );
  }

  // Alert variant - full alert box
  if (variant === 'alert') {
    return (
      <div className={cn(
        `${config.bgColor} ${config.borderColor} border rounded-md p-4`,
        className
      )}>
        <div className="flex items-start space-x-3">
          {showIcon && (
            <div className={`${config.textColor} text-sm font-medium mt-0.5`}>
              {config.icon}
            </div>
          )}
          <div className="flex-1">
            <div className={`${config.textColor} text-sm font-medium`}>
              {error.message}
            </div>
            {error.details && (
              <div className={`${config.textColor} text-xs mt-1 opacity-75`}>
                {error.details}
              </div>
            )}
            {(error.recoverable && onRetry) && (
              <button
                onClick={onRetry}
                className={`${config.textColor} text-xs mt-2 underline hover:no-underline`}
              >
                Try again
              </button>
            )}
          </div>
          {showDismiss && onDismiss && (
            <button
              onClick={onDismiss}
              className={`${config.textColor} text-sm hover:opacity-75`}
            >
              ✕
            </button>
          )}
        </div>
      </div>
    );
  }

  // Inline variant (default) - compact status display
  return (
    <div className={cn(
      `flex items-center space-x-2 ${config.bgColor} ${config.borderColor} border px-3 py-2 rounded-md`,
      className
    )}>
      <div className={`h-2 w-2 rounded-full ${config.dotColor}`}></div>
      <span className={`text-sm font-medium ${config.textColor}`}>
        {error.message}
      </span>
      {error.recoverable && onRetry && (
        <button
          onClick={onRetry}
          className={`${config.textColor} text-xs underline hover:no-underline ml-auto`}
        >
          Retry
        </button>
      )}
      {showDismiss && onDismiss && (
        <button
          onClick={onDismiss}
          className={`${config.textColor} text-xs hover:opacity-75 ml-1`}
        >
          ✕
        </button>
      )}
    </div>
  );
}

// Specialized loading indicator
export function LoadingDisplay({ 
  message = 'Loading...', 
  className,
  size = 'sm' 
}: { 
  message?: string; 
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4', 
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <div className={cn("flex items-center space-x-2 text-gray-600", className)}>
      <div className={`${sizeClasses[size]} animate-spin border-2 border-primary border-t-transparent rounded-full`}></div>
      <span className="text-sm">{message}</span>
    </div>
  );
}

// Error boundary fallback
export function ErrorFallback({ 
  error, 
  onRetry 
}: { 
  error: Error; 
  onRetry?: () => void; 
}) {
  return (
    <ErrorDisplay
      error={{
        type: 'error',
        message: 'Something went wrong',
        details: error.message,
        recoverable: true,
        timestamp: Date.now()
      }}
      variant="alert"
      onRetry={onRetry}
      className="m-4"
    />
  );
}