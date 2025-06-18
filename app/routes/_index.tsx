import { MainLayout } from "~/components/layout/MainLayout";
import { Button } from "~/components/ui/button";
import { JobTable } from "~/components/jobs/JobTable";
import { jobOps, userOps } from "~/lib/dbOperations";
import { PAGE_TITLES, BUTTONS } from "~/lib/messages";
import type { Route } from "./+types/_index";

export function loader() {
  const jobs = jobOps.findAll();
  const users = userOps.findActive();
  return {
    jobs,
    users,
  };
}

export default function Index({ loaderData: { jobs, users } }: Route.ComponentProps) {
  const handleJobAction = (jobId: number, action: 'view' | 'edit' | 'delete' | 'cancel') => {
    switch (action) {
      case 'view':
        console.log("View details for job:", jobId);
        break;
      case 'edit':
        console.log("Edit job:", jobId);
        break;
      case 'delete':
        console.log("Delete job:", jobId);
        break;
      case 'cancel':
        console.log("Cancel job:", jobId);
        break;
    }
  };

  const handleCreateJob = () => {
    console.log("Create new job");
  };

  const createJobButton = (
    <Button onClick={handleCreateJob} className="flex items-center gap-2">
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
          d="M12 4v16m8-8H4"
        />
      </svg>
      {BUTTONS.NEW_JOB}
    </Button>
  );

  return (
    <MainLayout 
      title={PAGE_TITLES.JOBS}
      description="Manage and monitor your Abaqus job execution"
      actions={createJobButton}
      users={users}
    >
      <JobTable
        jobs={jobs}
        onJobAction={handleJobAction}
      />
    </MainLayout>
  );
}
