/**
 * Hydration-Safe System Status Bar Component
 * Displays SSE connection status and license availability without hydration mismatches
 */

import { useEffect, useState } from 'react';
import { useSystemSSE } from '~/hooks/useSSE';
import type { SSEEvent } from '~/lib/services/sse/sse-schemas';

interface SystemStatusBarProps {
  initialLicenseUsed?: number;
  initialLicenseTotal?: number;
  className?: string;
}

export function SystemStatusBar({ 
  initialLicenseUsed = 0, 
  initialLicenseTotal = 12,
  className = ""
}: SystemStatusBarProps) {
  // Client-side state management
  const [licenseUsed, setLicenseUsed] = useState(initialLicenseUsed);
  const [licenseTotal, setLicenseTotal] = useState(initialLicenseTotal);
  const [isMounted, setIsMounted] = useState(false);
  
  // SSE connection for real-time updates
  const { 
    connectionState, 
    isMounted: sseIsMounted 
  } = useSystemSSE((event: SSEEvent) => {
    // Handle system events for license updates
    if (event.type === 'license_update') {
      const data = event.data as { used: number; total: number };
      setLicenseUsed(data.used);
      setLicenseTotal(data.total);
    }
  }, {
    autoReconnect: true,
    reconnectDelay: 2000,
    maxReconnectAttempts: 5
  });

  // Client-side mounting detection
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const getSSEStatusConfig = (state: typeof connectionState) => {
    switch (state) {
      case 'connected':
        return {
          color: 'text-green-600',
          bgColor: 'bg-green-50 border-green-200',
          dotColor: 'bg-green-500',
          text: 'Real-time updates active',
          icon: '🟢'
        };
      case 'connecting':
        return {
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50 border-yellow-200',
          dotColor: 'bg-yellow-500',
          text: 'Connecting...',
          icon: '🟡'
        };
      case 'error':
        return {
          color: 'text-orange-600',
          bgColor: 'bg-orange-50 border-orange-200',
          dotColor: 'bg-orange-500',
          text: 'Connection error - retrying...',
          icon: '🟠'
        };
      case 'disconnected':
      default:
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-50 border-red-200',
          dotColor: 'bg-red-500',
          text: 'Manual refresh required',
          icon: '🔴'
        };
    }
  };

  const getLicenseStatusConfig = (used: number, total: number) => {
    const usage = used / total;
    if (usage >= 0.9) {
      return {
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        text: 'License limit reached',
        urgent: true
      };
    } else if (usage >= 0.7) {
      return {
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        text: 'License usage high',
        urgent: false
      };
    } else {
      return {
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        text: 'License available',
        urgent: false
      };
    }
  };

  // Handle SSR vs CSR rendering
  if (!isMounted) {
    // Server-side rendering: show basic static content
    return (
      <div className={`border-b bg-muted/5 ${className}`}>
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between text-sm">
            {/* Static SSE Status for SSR */}
            <div className="flex items-center space-x-3 px-3 py-1 rounded-md border bg-gray-50 border-gray-200">
              <div className="h-2 w-2 rounded-full bg-gray-400"></div>
              <span className="font-medium text-gray-600">
                Loading connection status...
              </span>
            </div>

            {/* Static License Status for SSR */}
            <div className="flex items-center space-x-3 px-3 py-1 rounded-md bg-gray-50">
              <svg 
                className="h-4 w-4 text-gray-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                />
              </svg>
              <span className="font-medium text-gray-600">
                License: {initialLicenseUsed}/{initialLicenseTotal} tokens
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Client-side rendering: show dynamic content
  const sseConfig = getSSEStatusConfig(connectionState);
  const licenseConfig = getLicenseStatusConfig(licenseUsed, licenseTotal);

  return (
    <div className={`border-b bg-muted/5 ${className}`}>
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between text-sm">
          {/* Dynamic SSE Status */}
          <div className={`flex items-center space-x-3 px-3 py-1 rounded-md border ${sseConfig.bgColor}`}>
            <div className={`h-2 w-2 rounded-full ${sseConfig.dotColor}`}></div>
            <span className={`font-medium ${sseConfig.color}`}>
              {sseConfig.text}
            </span>
            {/* Show SSE connection details only on client */}
            {sseIsMounted && (
              <span className="text-xs text-muted-foreground">
                ({connectionState})
              </span>
            )}
          </div>

          {/* Dynamic License Status */}
          <div className={`flex items-center space-x-3 px-3 py-1 rounded-md ${licenseConfig.bgColor}`}>
            <svg 
              className={`h-4 w-4 ${licenseConfig.color}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
              />
            </svg>
            <span className={`font-medium ${licenseConfig.color}`}>
              License: {licenseUsed}/{licenseTotal} tokens
            </span>
            {licenseConfig.urgent && (
              <span className="text-xs text-red-500 font-semibold">
                ⚠ Limited submission
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hydration-safe wrapper for legacy SystemStatusBar usage
 */
export function SystemStatusBarWrapper(props: {
  sseStatus?: 'connected' | 'connecting' | 'disconnected';
  licenseUsed?: number;
  licenseTotal?: number;
  className?: string;
}) {
  return (
    <SystemStatusBar 
      initialLicenseUsed={props.licenseUsed}
      initialLicenseTotal={props.licenseTotal}
      className={props.className}
    />
  );
}