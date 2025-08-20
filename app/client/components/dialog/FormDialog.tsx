/**
 * FormDialog - Form dialog using HTML <dialog> element
 * Handles form submission, validation, and error display with native dialog functionality
 */

import type { ReactNode } from "react";
import { Form, useLocation } from "react-router";
import { Button } from "~/client/components/ui";
import { BUTTONS } from "~/client/constants/messages";
import { Dialog, type DialogProps } from "./Dialog";

export interface FormDialogProps extends Omit<DialogProps, "children"> {
	/** Form content */
	children: ReactNode;
	/** Form submission intent */
	intent: string;
	/** Form encoding type */
	encType?: "multipart/form-data" | "application/x-www-form-urlencoded";
	/** Submit button text */
	submitText: string;
	/** Cancel button text */
	cancelText?: string;
	/** Whether form is valid */
	isFormValid?: boolean;
	/** Whether form is submitting */
	isSubmitting?: boolean;
	/** Additional hidden form fields */
	hiddenFields?: Record<string, string | number>;
}

/**
 * Form dialog using HTML <dialog> element
 * Automatically closes on successful submission
 */
export const FormDialog = ({
	isOpen,
	title,
	onClose,
	children,
	intent,
	encType,
	submitText,
	cancelText = BUTTONS.CANCEL,
	isFormValid = true,
	isSubmitting = false,
	hiddenFields,
	maxWidth,
	resetKey,
}: FormDialogProps) => {
	const location = useLocation();

	return (
		<Dialog
			isOpen={isOpen}
			title={title}
			onClose={onClose}
			maxWidth={maxWidth}
			resetKey={resetKey}
		>
			<Form
				method="post"
				action={location.pathname}
				className="space-y-4"
				encType={encType}
			>
				{/* Intent and hidden fields */}
				<input type="hidden" name="intent" value={intent} />
				{hiddenFields &&
					Object.entries(hiddenFields).map(([key, value]) => (
						<input key={key} type="hidden" name={key} value={value} />
					))}

				{/* Form content */}
				<div className="space-y-4">{children}</div>

				{/* Dialog footer with native dialog styling */}
				<div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4 border-t">
					<Button
						type="button"
						variant="outline"
						onClick={onClose}
						disabled={isSubmitting}
						className="mt-3 sm:mt-0"
					>
						{cancelText}
					</Button>
					<Button type="submit" disabled={!isFormValid || isSubmitting}>
						{isSubmitting ? BUTTONS.SAVING : submitText}
					</Button>
				</div>
			</Form>
		</Dialog>
	);
};
