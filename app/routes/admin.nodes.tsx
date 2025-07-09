import { AdminLayout } from "~/components/layout/AdminLayout";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { SuccessMessage, ErrorMessage } from "~/components/ui/message";
import { findAllNodes, createNode, updateNodeStatus, activateNode, deactivateNode, type Node } from "~/lib/core/database";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "~/lib/messages";
import type { Route } from "./+types/admin.nodes";

export function loader() {
  // Auth is handled by parent route (admin.tsx)
  const nodes = findAllNodes();
  return { nodes };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create-node") {
    try {
      const nodeData = {
        name: formData.get("name") as string,
        hostname: formData.get("hostname") as string,
        ssh_port: Number(formData.get("ssh_port")) || 22,
        max_cpu_cores: Number(formData.get("max_cpu_cores")),
        is_active: true,
      };

      // Basic validation
      if (!nodeData.name || !nodeData.hostname || !nodeData.max_cpu_cores) {
        return { error: "Name, hostname, and CPU cores are required" };
      }

      const nodeId = createNode(nodeData);
      return { success: `Node '${nodeData.name}' created successfully`, nodeId };
    } catch (error) {
      return { error: ERROR_MESSAGES.UNKNOWN_ERROR };
    }
  }

  if (intent === "update-status") {
    try {
      const nodeId = Number(formData.get("nodeId"));
      const status = formData.get("status") as Node["status"];
      
      updateNodeStatus(nodeId, status);
      return { success: SUCCESS_MESSAGES.NODE_UPDATED };
    } catch (error) {
      return { error: ERROR_MESSAGES.UNKNOWN_ERROR };
    }
  }

  if (intent === "toggle-active") {
    try {
      const nodeId = Number(formData.get("nodeId"));
      const isActive = formData.get("isActive") === "true";
      
      if (isActive) {
        deactivateNode(nodeId);
      } else {
        activateNode(nodeId);
      }
      
      return { success: "Node status updated successfully" };
    } catch (error) {
      return { error: ERROR_MESSAGES.UNKNOWN_ERROR };
    }
  }

  return null;
}

export default function NodesAdmin({ loaderData: { nodes }, actionData }: Route.ComponentProps) {
  const getStatusBadge = (status: Node["status"]) => {
    const variants = {
      available: "bg-green-100 text-green-800",
      busy: "bg-yellow-100 text-yellow-800",
      unavailable: "bg-red-100 text-red-800",
    };
    
    return (
      <Badge className={variants[status || 'unavailable']}>
        {status ? status.replace('_', ' ') : 'unavailable'}
      </Badge>
    );
  };

  const createNodeButton = (
    <Button 
      onClick={() => {
        // TODO: Open create node modal
      }}
      className="flex items-center gap-2"
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      Add Node
    </Button>
  );

  return (
    <AdminLayout
      title="Node Management"
      description="Manage compute nodes for job execution"
      actions={createNodeButton}
    >
      <div className="space-y-6">
        {/* Messages */}
        {actionData?.success && (
          <SuccessMessage message={actionData.success} />
        )}
        {actionData?.error && (
          <ErrorMessage message={actionData.error} />
        )}

        {/* Nodes Table */}
        {nodes.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-600 mb-4">No compute nodes configured</p>
            <p className="text-sm text-gray-500">Add your first node to start processing jobs</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Hostname</TableHead>
                  <TableHead>SSH Port</TableHead>
                  <TableHead>CPU Cores</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nodes.map((node) => (
                  <TableRow key={node.id}>
                    <TableCell className="font-medium">{node.name}</TableCell>
                    <TableCell className="font-mono text-sm">{node.hostname}</TableCell>
                    <TableCell>{node.ssh_port || 22}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <svg className="h-3 w-3 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                        </svg>
                        <span className="text-sm">{node.max_cpu_cores}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(node.status)}</TableCell>
                    <TableCell>
                      <Badge variant={node.is_active ? "default" : "outline"}>
                        {node.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {node.created_at ? new Date(node.created_at).toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button variant="ghost" size="sm">
                          Edit
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className={node.is_active ? "text-orange-600" : "text-green-600"}
                        >
                          {node.is_active ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}