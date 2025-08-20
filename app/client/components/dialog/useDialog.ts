/**
 * Dialog Hook
 * Simple dialog state management for HTML <dialog> element based dialogs
 *
 * This hook provides a simplified API without complex context sharing,
 * focusing on direct dialog state management.
 */

import { useCallback, useState } from "react";

interface UseDialogReturn {
	/** Whether the dialog is currently open */
	isOpen: boolean;
	/** Open the dialog */
	openDialog: () => void;
	/** Close the dialog */
	closeDialog: () => void;
	/** Toggle dialog state */
	toggleDialog: () => void;
	/** Reset key for forcing component remount */
	resetKey: number;
}

/**
 * Hook for managing dialog state
 *
 * Provides simple open/close functionality for HTML <dialog> based components.
 * This doesn't require a context provider and can be used directly in components.
 *
 * @returns Dialog state and control functions
 */
export const useDialog = (): UseDialogReturn => {
	const [isOpen, setIsOpen] = useState(false);
	const [resetKey, setResetKey] = useState(0);

	const openDialog = useCallback(() => {
		// Force remount by incrementing reset key to clear previous state
		setResetKey((prev) => prev + 1);
		setIsOpen(true);
	}, []);

	const closeDialog = useCallback(() => {
		setIsOpen(false);
	}, []);

	const toggleDialog = useCallback(() => {
		setIsOpen((prev) => {
			if (!prev) {
				// Opening dialog - increment reset key to clear state
				setResetKey((prevKey) => prevKey + 1);
			}
			return !prev;
		});
	}, []);

	return {
		isOpen,
		openDialog,
		closeDialog,
		toggleDialog,
		resetKey,
	};
};
