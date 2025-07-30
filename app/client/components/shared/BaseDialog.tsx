/**
 * Base Dialog Component
 * Common structure for all action dialogs with form submission
 * Handles success/error states, auto-close behavior, and consistent UX
 */

import { Form } from "react-router";
import { useEffect, ReactNode, useRef } from "react";
import {
	Button,
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	Alert,
	AlertDescription,
} from "~/client/components/ui";
import { BUTTONS } from "~/client/constants/messages";

export interface BaseDialogConfig {
	/** Dialog title */
	title: string;
	/** Form action intent */
	intent: string;
	/** Submit button text */
	submitText: string;
	/** Submit button text when submitting */
	submittingText?: string;
	/** Form encoding type */
	encType?: "multipart/form-data" | "application/x-www-form-urlencoded";
	/** Custom cancel button text */
	cancelText?: string;
}

export interface BaseDialogProps {
	/** Dialog visibility */
	isOpen: boolean;
	/** Close handler */
	onClose: () => void;
	/** Dialog configuration */
	config: BaseDialogConfig;
	/** Form validation state */
	isFormValid: boolean;
	/** Submission state */
	isSubmitting?: boolean;
	/** Action result data */
	actionData?: {
		success?: boolean | string;
		error?: string;
		message?: string;
		intent?: string;
	};
	/** Form fields content */
	children: ReactNode;
	/** Additional hidden form fields */
	hiddenFields?: Record<string, string | number>;
	/** Custom error message */
	errorMessage?: string;
	/** Disable auto-close on success (for manual control) */
	disableAutoClose?: boolean;
}

export function BaseDialog({
	isOpen,
	onClose,
	config,
	isFormValid,
	isSubmitting = false,
	actionData,
	children,
	hiddenFields,
	errorMessage,
	disableAutoClose = false,
}: BaseDialogProps) {
	// Track if form has been submitted in this dialog session
	const formSubmittedRef = useRef(false);

	// Reset submission flag when dialog opens
	useEffect(() => {
		if (isOpen) {
			formSubmittedRef.current = false;
		}
	}, [isOpen]);

	// Auto-close on successful operation (only for this dialog's intent AND after form submission)
	useEffect(() => {
		if (
			!disableAutoClose &&
			isOpen &&
			actionData?.success &&
			actionData?.intent === config.intent &&
			formSubmittedRef.current
		) {
			onClose();
		}
	}, [disableAutoClose, isOpen, actionData, config.intent, onClose]);

	// Handle form submission
	const handleFormSubmit = () => {
		formSubmittedRef.current = true;
	};

	// Determine error message to display
	const displayError =
		errorMessage ||
		actionData?.error ||
		(actionData && !actionData.success ? actionData.message : null);

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{config.title}</DialogTitle>
				</DialogHeader>

				<Form
					method="post"
					className="space-y-4"
					encType={config.encType}
					onSubmit={handleFormSubmit}
				>
					{/* Intent and hidden fields */}
					<input type="hidden" name="intent" value={config.intent} />
					{hiddenFields &&
						Object.entries(hiddenFields).map(([key, value]) => (
							<input key={key} type="hidden" name={key} value={value} />
						))}

					{/* Form content */}
					<div className="space-y-4">{children}</div>

					{/* Error Display */}
					{displayError && (
						<Alert variant="destructive">
							<AlertDescription>{displayError}</AlertDescription>
						</Alert>
					)}

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={onClose}
							disabled={isSubmitting}
						>
							{config.cancelText || BUTTONS.CANCEL}
						</Button>
						<Button type="submit" disabled={!isFormValid || isSubmitting}>
							{isSubmitting
								? config.submittingText || BUTTONS.SAVING
								: config.submitText}
						</Button>
					</DialogFooter>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
