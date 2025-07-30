/**
 * Custom hook for JobTable data management and SSE updates
 * Extracted from JobTable to follow Single Responsibility Principle
 */

import { useState, useEffect } from "react";
import type { Job } from "~/shared/core/types/database";
import { useJobSSE } from "~/client/hooks/useSSE";
import type { SSEEvent } from "~/server/services/sse/sse-schemas";

interface UseJobTableDataOptions {
	enableRealTimeUpdates?: boolean;
	autoReconnect?: boolean;
	reconnectDelay?: number;
	maxReconnectAttempts?: number;
}

export function useJobTableData(
	initialJobs: Job[],
	options: UseJobTableDataOptions = {},
) {
	const {
		enableRealTimeUpdates = true,
		autoReconnect = true,
		reconnectDelay = 2000,
		maxReconnectAttempts = 5,
	} = options;

	const [currentJobs, setCurrentJobs] = useState<Job[]>(initialJobs);
	const [isMounted, setIsMounted] = useState(false);

	// Client-side mounting detection
	useEffect(() => {
		setIsMounted(true);
	}, []);

	// Update local jobs when props change
	useEffect(() => {
		setCurrentJobs(initialJobs);
	}, [initialJobs]);

	// SSE connection for real-time job updates (only on client-side)
	const { connectionState } = useJobSSE(
		(event: SSEEvent) => {
			if (!enableRealTimeUpdates || !isMounted) return;

			// Handle job-specific events
			switch (event.type) {
				case "job_created":
				case "job_updated": {
					const updatedJob = event.data as Job;
					setCurrentJobs((prevJobs) => {
						const existingIndex = prevJobs.findIndex(
							(job) => job.id === updatedJob.id,
						);
						if (existingIndex >= 0) {
							// Update existing job
							const newJobs = [...prevJobs];
							newJobs[existingIndex] = updatedJob;
							return newJobs;
						} else {
							// Add new job
							return [updatedJob, ...prevJobs];
						}
					});
					break;
				}

				case "job_deleted": {
					const deletedJobId = event.data as { id: number };
					setCurrentJobs((prevJobs) =>
						prevJobs.filter((job) => job.id !== deletedJobId.id),
					);
					break;
				}

				case "job_status_changed": {
					const statusUpdate = event.data as {
						id: number;
						status: Job["status"];
						updated_at?: string;
					};
					setCurrentJobs((prevJobs) =>
						prevJobs.map((job) =>
							job.id === statusUpdate.id
								? {
										...job,
										status: statusUpdate.status,
										updated_at: statusUpdate.updated_at,
									}
								: job,
						),
					);
					break;
				}
			}
		},
		{
			autoReconnect,
			reconnectDelay,
			maxReconnectAttempts,
		},
	);

	return {
		currentJobs,
		connectionState,
		isMounted,
	};
}
