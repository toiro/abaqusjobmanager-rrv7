/**
 * Connection status utilities with readability-first approach
 * Abstracts complex conditional logic for status display
 */

export type ConnectionState = 'connected' | 'connecting' | 'error' | 'disconnected';

interface ConnectionStatusDisplay {
  color: string;
  text: string;
}

// Connection status configurations (instead of nested ternary operators)
const CONNECTION_STATUS_CONFIGS: Record<ConnectionState, ConnectionStatusDisplay> = {
  connected: {
    color: 'bg-green-500',
    text: 'Real-time updates'
  },
  connecting: {
    color: 'bg-yellow-500', 
    text: 'Connecting...'
  },
  error: {
    color: 'bg-orange-500',
    text: 'Connection error'
  },
  disconnected: {
    color: 'bg-red-500',
    text: 'Offline mode'
  }
};

/**
 * Get connection status display configuration
 * Hides complex nested ternary operators
 */
export const getConnectionStatusDisplay = (state: ConnectionState): ConnectionStatusDisplay => {
  return CONNECTION_STATUS_CONFIGS[state];
};

/**
 * Get connection status dot color class
 * Abstracts conditional color logic
 */
export const getConnectionDotColor = (state: ConnectionState): string => {
  return getConnectionStatusDisplay(state).color;
};

/**
 * Get connection status text
 * Abstracts conditional text logic
 */
export const getConnectionStatusText = (state: ConnectionState): string => {
  return getConnectionStatusDisplay(state).text;
};