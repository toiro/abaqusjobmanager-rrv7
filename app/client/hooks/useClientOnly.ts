/**
 * SSR-safe client-only detection hook
 * Uses React 18's useSyncExternalStore to avoid useEffect
 */

import { useSyncExternalStore } from "react";

/**
 * Returns true when running on client, false during SSR
 * Prevents hydration mismatches by using useSyncExternalStore
 */
export const useClientOnly = (): boolean => {
	return useSyncExternalStore(
		() => () => {}, // subscribe function (no-op)
		() => true, // getSnapshot for client
		() => false, // getServerSnapshot for server
	);
};
