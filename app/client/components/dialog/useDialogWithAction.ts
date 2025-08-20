/**
 * Dialog Hook with Action Integration
 *
 * This hook manages dialog state and automatically closes dialogs after successful form actions.
 * Enhanced with state reset capabilities and React Router integration.
 *
 * WHY useEffect IS REQUIRED:
 * When React Router actions complete, actionData is updated and components re-render.
 * However, at this point the dialog is still open. To close the dialog, we need to update
 * the dialog state, but React prohibits updating component state during rendering.
 *
 * useEffect solves this by:
 * 1. Separating the render cycle from state updates
 * 2. Executing after rendering is complete (safe timing)
 * 3. Preventing "Cannot update component while rendering" errors
 *
 * The flow is: actionData update → re-render → useEffect runs → dialog closes
 */

import { useCallback, useEffect, useState } from "react";
import { useActionData } from "react-router";

interface ActionData {
	success?: boolean;
	error?: string;
	message?: string;
	intent?: string;
}

interface UseDialogWithActionReturn {
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
	/** Current action data from React Router */
	actionData?: ActionData;
	/** Last action message */
	lastAction: string;
}

/**
 * Hook that provides dialog functionality with automatic closing after successful actions
 *
 * Features:
 * - State reset on dialog open (via resetKey)
 * - Automatic close on successful form submission
 * - React Router actionData integration
 * - Last action tracking
 *
 * @returns Dialog controls and action state
 */
export const useDialogWithAction = (): UseDialogWithActionReturn => {
	const [isOpen, setIsOpen] = useState(false);
	const [resetKey, setResetKey] = useState(0);
	const actionData = useActionData() as ActionData | undefined;
	const [lastProcessedActionData, setLastProcessedActionData] = useState<
		ActionData | undefined
	>(undefined);

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

	// Calculate lastAction directly from actionData
	const lastAction =
		actionData?.success && actionData.message
			? `Action completed successfully: ${actionData.message}`
			: "";

	// Auto-close dialog on successful action (only for new actionData)
	// Uses useEffect to avoid "Cannot update component while rendering" error
	// This is the ONLY safe way to update dialog state in response to actionData changes
	useEffect(() => {
		if (
			actionData?.success &&
			actionData !== lastProcessedActionData &&
			actionData.intent
		) {
			// Safe to call closeDialog here - we're in the effect phase, not rendering
			closeDialog();
			setLastProcessedActionData(actionData);
		}
	}, [actionData, lastProcessedActionData, closeDialog]);

	return {
		isOpen,
		openDialog,
		closeDialog,
		toggleDialog,
		resetKey,
		actionData,
		lastAction,
	};
};
