import * as React from "react";
import { cn } from "~/shared/utils/utils";

export interface LoadingProps {
	size?: "sm" | "md" | "lg";
	className?: string;
	text?: string;
}

const Loading: React.FC<LoadingProps> = ({ size = "md", className, text }) => {
	const sizeClasses = {
		sm: "w-4 h-4",
		md: "w-6 h-6",
		lg: "w-8 h-8",
	};

	return (
		<div className={cn("flex items-center justify-center gap-2", className)}>
			<div
				className={cn(
					"animate-spin rounded-full border-2 border-gray-300 border-t-blue-600",
					sizeClasses[size],
				)}
			/>
			{text && <span className="text-sm text-muted-foreground">{text}</span>}
		</div>
	);
};

// Spinner component for inline loading
export const Spinner: React.FC<{
	size?: "sm" | "md" | "lg";
	className?: string;
}> = ({ size = "md", className }) => {
	const sizeClasses = {
		sm: "w-4 h-4",
		md: "w-6 h-6",
		lg: "w-8 h-8",
	};

	return (
		<div
			className={cn(
				"animate-spin rounded-full border-2 border-gray-300 border-t-blue-600",
				sizeClasses[size],
				className,
			)}
		/>
	);
};

// Full page loading overlay
export const LoadingOverlay: React.FC<{ text?: string }> = ({ text }) => {
	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
			<div className="bg-white rounded-lg p-6 shadow-lg">
				<Loading size="lg" text={text} />
			</div>
		</div>
	);
};

export { Loading };
