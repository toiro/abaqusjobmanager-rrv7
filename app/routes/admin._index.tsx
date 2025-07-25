import { AdminLayout } from "~/components/layout/AdminLayout";
import { Badge } from "~/components/ui";
import type { Route } from "./+types/admin._index";

export async function loader() {
  // Auth is handled by parent route (admin.tsx)
  const { 
    jobRepository,
    userRepository,
    nodeRepository,
    fileRepository
  } = await import("~/lib/core/database/server-operations");
  
  const stats = {
    jobs: {
      total: jobRepository.findAllJobs().length,
      waiting: jobRepository.findJobsByStatus("waiting").length,
      running: jobRepository.findJobsByStatus("running").length,
      completed: jobRepository.findJobsByStatus("completed").length,
      failed: jobRepository.findJobsByStatus("failed").length,
    },
    users: {
      total: userRepository.findAllUsers().length,
      active: userRepository.findActiveUsers().length,
    },
    nodes: {
      total: nodeRepository.findAllNodes().length,
      available: nodeRepository.findAvailableNodes().length,
    },
    files: {
      total: fileRepository.findAllFiles().length,
    },
  };
  
  return { stats };
}

export default function AdminDashboard({ loaderData: { stats } }: Route.ComponentProps) {
  const StatCard = ({ 
    title, 
    value, 
    subtitle, 
    variant = "default" 
  }: { 
    title: string; 
    value: number; 
    subtitle?: string; 
    variant?: "default" | "success" | "warning" | "danger";
  }) => {
    const getVariantStyles = () => {
      switch (variant) {
        case "success":
          return "border-green-200 bg-green-50";
        case "warning":
          return "border-yellow-200 bg-yellow-50";
        case "danger":
          return "border-red-200 bg-red-50";
        default:
          return "border-gray-200 bg-white";
      }
    };

    return (
      <div className={`p-6 rounded-lg border ${getVariantStyles()}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <div className="flex items-center space-x-2">
          <span className="text-3xl font-bold text-gray-900">{value}</span>
          {subtitle && (
            <span className="text-sm text-gray-500">{subtitle}</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <AdminLayout
      title="Dashboard"
      description="System overview and statistics"
    >
      <div className="space-y-8">
        {/* System Overview */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">System Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Jobs"
              value={stats.jobs.total}
              subtitle="all time"
            />
            <StatCard
              title="Active Users"
              value={stats.users.active}
              subtitle={`of ${stats.users.total} total`}
              variant="success"
            />
            <StatCard
              title="Available Nodes"
              value={stats.nodes.available}
              subtitle={`of ${stats.nodes.total} total`}
              variant={stats.nodes.available > 0 ? "success" : "warning"}
            />
            <StatCard
              title="Uploaded Files"
              value={stats.files.total}
              subtitle="INP files"
            />
          </div>
        </div>

        {/* Job Status Breakdown */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Job Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Waiting"
              value={stats.jobs.waiting}
              variant="default"
            />
            <StatCard
              title="Running"
              value={stats.jobs.running}
              variant="warning"
            />
            <StatCard
              title="Completed"
              value={stats.jobs.completed}
              variant="success"
            />
            <StatCard
              title="Failed"
              value={stats.jobs.failed}
              variant="danger"
            />
          </div>
        </div>

        {/* System Status */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">System Status</h2>
          <div className="bg-white border rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Database</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Connected
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">File System</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Available
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">License Server</span>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  Not Configured
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <a
              href="/admin/nodes"
              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="text-lg mb-2">🖥️</div>
              <h3 className="font-medium text-gray-900">Manage Nodes</h3>
              <p className="text-sm text-gray-500">Add or configure compute nodes</p>
            </a>
            <a
              href="/admin/users"
              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="text-lg mb-2">👥</div>
              <h3 className="font-medium text-gray-900">Manage Users</h3>
              <p className="text-sm text-gray-500">Create and manage user accounts</p>
            </a>
            <a
              href="/admin/files"
              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="text-lg mb-2">📁</div>
              <h3 className="font-medium text-gray-900">File Management</h3>
              <p className="text-sm text-gray-500">View and manage uploaded files</p>
            </a>
            <a
              href="/admin/settings"
              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="text-lg mb-2">⚙️</div>
              <h3 className="font-medium text-gray-900">Settings</h3>
              <p className="text-sm text-gray-500">Configure system settings</p>
            </a>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}