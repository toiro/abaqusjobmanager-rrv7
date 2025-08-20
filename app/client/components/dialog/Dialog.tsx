/**
 * Dialog - HTML <dialog> element based dialog implementation
 * Uses native browser dialog functionality for improved accessibility and behavior
 */

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "~/shared/utils/utils";

export interface DialogProps {
	/** Whether the dialog is open */
	isOpen: boolean;
	/** Dialog title */
	title: string;
	/** Close handler */
	onClose: () => void;
	/** Dialog content */
	children: ReactNode;
	/** Optional maximum width class */
	maxWidth?: string;
	/** Optional CSS classes */
	className?: string;
	/** Optional reset key for forcing remount to clear state */
	resetKey?: number;
}

/**
 * HTML dialog implementation
 *
 * Benefits over div-based dialogs:
 * - Automatic focus management
 * - Native modal behavior
 * - Built-in ESC key handling
 * - Better screen reader support
 * - Automatic backdrop behavior
 */
export const Dialog = ({
	isOpen,
	title,
	onClose,
	children,
	maxWidth = "max-w-md",
	className,
	resetKey,
}: DialogProps) => {
	const dialogRef = useRef<HTMLDialogElement>(null);

	// Handle dialog open/close state
	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;

		if (isOpen) {
			// Use showModal() for modal behavior (with backdrop)
			if (!dialog.open) {
				dialog.showModal();
			}
		} else {
			// Close dialog if it's currently open
			if (dialog.open) {
				dialog.close();
			}
		}
	}, [isOpen]);

	// Handle native dialog close event
	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;

		const handleClose = () => {
			onClose();
		};

		const handleCancel = (e: Event) => {
			// Handle ESC key (cancel event)
			e.preventDefault();
			onClose();
		};

		dialog.addEventListener("close", handleClose);
		dialog.addEventListener("cancel", handleCancel);

		return () => {
			dialog.removeEventListener("close", handleClose);
			dialog.removeEventListener("cancel", handleCancel);
		};
	}, [onClose]);

	return (
		<dialog
			ref={dialogRef}
			className={cn(
				// Base styles
				"bg-background border rounded-lg shadow-lg p-0 w-full mx-auto",
				maxWidth,
				// Native dialog reset
				"backdrop:bg-black/50 backdrop:backdrop-blur-sm",
				// Custom styles
				className,
			)}
			onClick={(e) => {
				// Close on backdrop click (clicking outside the dialog content)
				const rect = e.currentTarget.getBoundingClientRect();
				const isInDialog =
					e.clientX >= rect.left &&
					e.clientX <= rect.right &&
					e.clientY >= rect.top &&
					e.clientY <= rect.bottom;
				if (!isInDialog) {
					onClose();
				}
			}}
		>
			<div
				className="flex flex-col"
				onClick={(e) => e.stopPropagation()} // Prevent backdrop click when clicking content
			>
				{/* Dialog Header */}
				<div className="flex flex-row items-center justify-between p-6 pb-2">
					<h2 className="text-lg font-semibold leading-none tracking-tight">
						{title}
					</h2>
					<button
						type="button"
						onClick={onClose}
						className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
					>
						<svg
							className="h-4 w-4"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
						<span className="sr-only">Close</span>
					</button>
				</div>

				{/* Dialog Content - Use resetKey to force remount and clear state */}
				<div key={resetKey} className="px-6 pb-6">
					{children}
				</div>
			</div>
		</dialog>
	);
};
