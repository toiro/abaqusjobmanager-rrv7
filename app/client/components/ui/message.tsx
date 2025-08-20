import type * as React from "react";
import { Alert, AlertDescription, AlertTitle } from "./alert";
import { cn } from "~/shared/utils/utils";

export type MessageType = "success" | "error" | "warning" | "info";

export interface MessageProps {
	type: MessageType;
	title?: string;
	message: string;
	className?: string;
	onClose?: () => void;
}

const Message: React.FC<MessageProps> = ({
	type,
	title,
	message,
	className,
	onClose,
}) => {
	const getIcon = () => {
		switch (type) {
			case "success":
				return (
					<svg
						className="h-4 w-4"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M5 13l4 4L19 7"
						/>
					</svg>
				);
			case "error":
				return (
					<svg
						className="h-4 w-4"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				);
			case "warning":
				return (
					<svg
						className="h-4 w-4"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"
						/>
					</svg>
				);
			case "info":
				return (
					<svg
						className="h-4 w-4"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				);
			default:
				return null;
		}
	};

	const getVariant = () => {
		switch (type) {
			case "success":
				return "success";
			case "error":
				return "destructive";
			case "warning":
				return "warning";
			case "info":
				return "info";
			default:
				return "default";
		}
	};

	return (
		<Alert variant={getVariant()} className={cn("relative", className)}>
			{getIcon()}
			{onClose && (
				<button
					onClick={onClose}
					className="absolute right-2 top-2 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
				>
					<svg
						className="h-4 w-4"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
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
			)}
			{title && <AlertTitle>{title}</AlertTitle>}
			<AlertDescription>{message}</AlertDescription>
		</Alert>
	);
};

// Success Message Component
export const SuccessMessage: React.FC<Omit<MessageProps, "type">> = (props) => (
	<Message type="success" {...props} />
);

// Error Message Component
export const ErrorMessage: React.FC<Omit<MessageProps, "type">> = (props) => (
	<Message type="error" {...props} />
);

// Warning Message Component
export const WarningMessage: React.FC<Omit<MessageProps, "type">> = (props) => (
	<Message type="warning" {...props} />
);

// Info Message Component
export const InfoMessage: React.FC<Omit<MessageProps, "type">> = (props) => (
	<Message type="info" {...props} />
);

export { Message };
