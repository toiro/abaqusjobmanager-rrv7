/**
 * FileWithJob - File entity with related job information (1:1 relationship)
 * 1 Type 1 File strategy implementation
 */

import type { PersistedFileRecord } from "../../types/database";

export interface FileWithJob extends PersistedFileRecord {
	referencingJob: {
		jobId: number;
		jobName: string;
		jobStatus: string;
		jobOwner: string;
		createdAt: string;
	} | null;
}
