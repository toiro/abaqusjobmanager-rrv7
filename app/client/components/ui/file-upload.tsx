import * as React from "react";
import { cn } from "~/shared/utils/utils";
import { FILE_MESSAGES } from "~/client/constants/messages";
import { useValidationErrorState } from "~/client/components/shared/useErrorState";
import { ErrorDisplay } from "~/client/components/shared/ErrorDisplay";
import {
	extractFileExtension,
	formatBytesToHumanReadable,
} from "~/client/utils/formatting";

export interface FileUploadProps
	extends React.InputHTMLAttributes<HTMLInputElement> {
	onFileSelect?: (file: File | null) => void;
	maxSize?: number; // in bytes
	acceptedTypes?: string[];
}

export const FileUpload = React.forwardRef<HTMLInputElement, FileUploadProps>(
	(
		{
			className,
			onFileSelect,
			maxSize = 100 * 1024 * 1024,
			acceptedTypes = [".inp"],
			...props
		},
		ref,
	) => {
		const inputRef = React.useRef<HTMLInputElement>(null);
		const actualRef = ref || inputRef;
		const [dragActive, setDragActive] = React.useState(false);
		const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
		const { errorState, validateAndSet, clearError } =
			useValidationErrorState<File>();

		const validateFile = (file: File): string | null => {
			// Check file size
			if (file.size > maxSize) {
				return FILE_MESSAGES.FILE_SIZE_EXCEEDED;
			}

			// Check file type
			const fileExtension = extractFileExtension(file.name);
			if (!acceptedTypes.includes(fileExtension)) {
				return FILE_MESSAGES.FILE_TYPE_INVALID;
			}

			// Check if file is empty
			if (file.size === 0) {
				return FILE_MESSAGES.FILE_SIZE_EMPTY;
			}

			return null;
		};

		const handleFileSelect = (file: File) => {
			const isValid = validateAndSet(file, validateFile, (validFile) => {
				setSelectedFile(validFile);
				onFileSelect?.(validFile);

				// Update the input element's files property
				if (actualRef && "current" in actualRef && actualRef.current) {
					const dt = new DataTransfer();
					dt.items.add(validFile);
					actualRef.current.files = dt.files;
				}
			});

			if (!isValid) {
				setSelectedFile(null);
				onFileSelect?.(null);
			}
		};

		const handleDrag = (e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();
			if (e.type === "dragenter" || e.type === "dragover") {
				setDragActive(true);
			} else if (e.type === "dragleave") {
				setDragActive(false);
			}
		};

		const handleDrop = (e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();
			setDragActive(false);

			if (e.dataTransfer.files && e.dataTransfer.files[0]) {
				handleFileSelect(e.dataTransfer.files[0]);
			}
		};

		const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
			if (e.target.files && e.target.files[0]) {
				handleFileSelect(e.target.files[0]);
			}
		};

		// File size formatting now uses readable abstraction (formatBytesToHumanReadable)

		return (
			<div className="w-full">
				<div
					className={cn(
						"relative border-2 border-dashed rounded-lg p-6 transition-colors",
						dragActive ? "border-primary bg-primary/10" : "border-gray-300",
						errorState ? "border-red-500" : "",
						className,
					)}
					onDragEnter={handleDrag}
					onDragLeave={handleDrag}
					onDragOver={handleDrag}
					onDrop={handleDrop}
				>
					<input
						ref={actualRef}
						type="file"
						accept={acceptedTypes.join(",")}
						onChange={handleChange}
						className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
						{...props}
					/>

					<div className="text-center">
						{selectedFile ? (
							<div className="space-y-2">
								<div className="flex items-center justify-center">
									<svg
										className="w-8 h-8 text-green-500"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
								</div>
								<div>
									<p className="font-medium text-sm">{selectedFile.name}</p>
									<p className="text-xs text-gray-500">
										{formatBytesToHumanReadable(selectedFile.size)}
									</p>
								</div>
							</div>
						) : (
							<div className="space-y-2">
								<div className="flex items-center justify-center">
									<svg
										className="w-8 h-8 text-gray-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
										/>
									</svg>
								</div>
								<div>
									<p className="text-sm font-medium">
										{FILE_MESSAGES.DRAG_DROP}
									</p>
									<p className="text-xs text-gray-500">
										Max size: {formatBytesToHumanReadable(maxSize)}
									</p>
								</div>
							</div>
						)}
					</div>
				</div>

				{errorState && (
					<ErrorDisplay
						error={errorState}
						variant="minimal"
						onRetry={() => clearError()}
						className="mt-2"
					/>
				)}
			</div>
		);
	},
);

FileUpload.displayName = "FileUpload";
