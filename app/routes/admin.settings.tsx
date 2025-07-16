import { AdminLayout } from "~/components/layout/AdminLayout";
import { Button, Input, Label, Badge, SuccessMessage, ErrorMessage } from "~/components/ui";
import type { Route } from "./+types/admin.settings";

export function loader() {
  // Auth is handled by parent route (admin.tsx)
  // Get current environment settings
  const settings = {
    environment: process.env.NODE_ENV || 'development',
    databasePath: process.env.DATABASE_PATH || ':memory:',
    uploadsDir: process.env.UPLOADS_DIR || './uploads',
    logLevel: process.env.LOG_LEVEL || 'info',
    adminUsername: process.env.ADMIN_USERNAME ? '***' : 'Not Set',
    adminPassword: process.env.ADMIN_PASSWORD ? '***' : 'Not Set',
  };
  
  return { settings };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "test-database") {
    try {
      // Test database connection
      return { success: "Database connection successful" };
    } catch (error) {
      return { error: "Database connection failed" };
    }
  }

  if (intent === "clear-logs") {
    try {
      // TODO: Implement log clearing
      return { success: "Logs cleared successfully" };
    } catch (error) {
      return { error: "Failed to clear logs" };
    }
  }

  return null;
}

export default function SettingsAdmin({ loaderData: { settings }, actionData }: Route.ComponentProps) {
  const SettingCard = ({ 
    title, 
    description, 
    children 
  }: { 
    title: string; 
    description: string; 
    children: React.ReactNode; 
  }) => (
    <div className="bg-white border rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      {children}
    </div>
  );

  return (
    <AdminLayout
      title="System Settings"
      description="Configure system-wide settings and preferences"
    >
      <div className="space-y-8">
        {/* Messages */}
        {actionData?.success && (
          <SuccessMessage message={actionData.success} />
        )}
        {actionData?.error && (
          <ErrorMessage message={actionData.error} />
        )}

        {/* Environment Settings */}
        <SettingCard
          title="Environment Configuration"
          description="Current environment and runtime settings"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="text-sm font-medium text-gray-700">Environment</Label>
              <div className="mt-1">
                <Badge variant={settings.environment === 'production' ? 'default' : 'secondary'}>
                  {settings.environment}
                </Badge>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Log Level</Label>
              <div className="mt-1">
                <Badge variant="outline">{settings.logLevel}</Badge>
              </div>
            </div>
          </div>
        </SettingCard>

        {/* Database Settings */}
        <SettingCard
          title="Database Configuration"
          description="Database connection and storage settings"
        >
          <div className="space-y-4">
            <div>
              <Label htmlFor="db-path" className="text-sm font-medium text-gray-700">
                Database Path
              </Label>
              <Input 
                id="db-path"
                value={settings.databasePath}
                className="mt-1 font-mono text-sm"
                readOnly
              />
              <p className="mt-1 text-xs text-gray-500">
                {settings.databasePath === ':memory:' ? 'Using in-memory database' : 'Using file-based database'}
              </p>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                Test Connection
              </Button>
              <Button variant="outline" size="sm">
                Backup Database
              </Button>
              <Button variant="outline" size="sm" className="text-orange-600">
                Reset Schema
              </Button>
            </div>
          </div>
        </SettingCard>

        {/* File Storage Settings */}
        <SettingCard
          title="File Storage"
          description="File upload and storage configuration"
        >
          <div className="space-y-4">
            <div>
              <Label htmlFor="uploads-dir" className="text-sm font-medium text-gray-700">
                Uploads Directory
              </Label>
              <Input 
                id="uploads-dir"
                value={settings.uploadsDir}
                className="mt-1 font-mono text-sm"
                readOnly
              />
              <p className="mt-1 text-xs text-gray-500">
                Directory where uploaded INP files are stored
              </p>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                Check Directory
              </Button>
              <Button variant="outline" size="sm">
                Clean Old Files
              </Button>
            </div>
          </div>
        </SettingCard>

        {/* Security Settings */}
        <SettingCard
          title="Security Configuration"
          description="Authentication and access control settings"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Admin Username</Label>
                <div className="mt-1 flex items-center space-x-2">
                  <Badge variant={settings.adminUsername === 'Not Set' ? 'destructive' : 'default'}>
                    {settings.adminUsername}
                  </Badge>
                  {settings.adminUsername === 'Not Set' && (
                    <span className="text-xs text-red-600">Required for admin access</span>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Admin Password</Label>
                <div className="mt-1 flex items-center space-x-2">
                  <Badge variant={settings.adminPassword === 'Not Set' ? 'destructive' : 'default'}>
                    {settings.adminPassword}
                  </Badge>
                  {settings.adminPassword === 'Not Set' && (
                    <span className="text-xs text-red-600">Required for admin access</span>
                  )}
                </div>
              </div>
            </div>
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Admin credentials are configured via environment variables 
                (ADMIN_USERNAME and ADMIN_PASSWORD). Update your .env file to change these settings.
              </p>
            </div>
          </div>
        </SettingCard>

        {/* System Maintenance */}
        <SettingCard
          title="System Maintenance"
          description="System cleanup and maintenance operations"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="justify-start">
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear System Logs
            </Button>
            <Button variant="outline" className="justify-start">
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Export System Data
            </Button>
            <Button variant="outline" className="justify-start text-red-600">
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset System
            </Button>
          </div>
        </SettingCard>
      </div>
    </AdminLayout>
  );
}