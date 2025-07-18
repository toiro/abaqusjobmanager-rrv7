import { AdminLayout } from "~/components/layout/AdminLayout";
import { Button, Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, SuccessMessage, ErrorMessage } from "~/components/ui";
import type { Node } from "~/lib/core/types/database";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "~/lib/messages";
import { NewNodeModal, EditNodeModal } from "~/components/nodes/NodeModal";
import { DeleteNodeDialog } from "~/components/nodes/DeleteNodeDialog";
import { useState, useEffect } from "react";
import { Form } from "react-router";
import { useNodeSSE } from "~/hooks/useSSE";
import { EVENT_TYPES } from "~/lib/services/sse/sse-schemas";
import type { Route } from "./+types/admin.nodes";

export async function loader() {
  // Auth is handled by parent route (admin.tsx)
  const { findAllNodes } = await import("~/lib/core/database/server-operations");
  const nodes = findAllNodes();
  return { nodes };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create-node") {
    try {
      const { createNode } = await import("~/lib/core/database/server-operations");
      
      const nodeData = {
        name: formData.get("name") as string,
        hostname: formData.get("hostname") as string,
        ssh_port: Number(formData.get("ssh_port")) || 22,
        cpu_cores_limit: Number(formData.get("cpu_cores_limit")),
        license_token_limit: Number(formData.get("license_token_limit")) || Number(formData.get("cpu_cores_limit")),
        is_active: formData.get("is_active") === "true",
      };

      // Basic validation
      if (!nodeData.name || !nodeData.hostname || !nodeData.cpu_cores_limit) {
        return { error: "Name, hostname, and CPU cores are required", intent: "create-node" };
      }

      if (nodeData.ssh_port < 1 || nodeData.ssh_port > 65535) {
        return { error: "SSH port must be between 1 and 65535", intent: "create-node" };
      }

      if (nodeData.cpu_cores_limit < 1 || nodeData.cpu_cores_limit > 128) {
        return { error: "CPU cores must be between 1 and 128", intent: "create-node" };
      }

      const nodeId = createNode(nodeData);
      return { success: `Node '${nodeData.name}' created successfully`, nodeId, intent: "create-node" };
    } catch (error) {
      return { error: ERROR_MESSAGES.UNKNOWN_ERROR, intent: "create-node" };
    }
  }

  if (intent === "update-status") {
    try {
      const { updateNodeStatus } = await import("~/lib/core/database/server-operations");
      
      const nodeId = Number(formData.get("nodeId"));
      const status = formData.get("status") as Node["status"];
      
      updateNodeStatus(nodeId, status);
      return { success: SUCCESS_MESSAGES.NODE_UPDATED, intent: "update-status" };
    } catch (error) {
      return { error: ERROR_MESSAGES.UNKNOWN_ERROR, intent: "update-status" };
    }
  }

  if (intent === "toggle-active") {
    try {
      const { activateNode, deactivateNode } = await import("~/lib/core/database/server-operations");
      
      const nodeId = Number(formData.get("nodeId"));
      const isActive = formData.get("isActive") === "true";
      
      if (isActive) {
        deactivateNode(nodeId);
      } else {
        activateNode(nodeId);
      }
      
      return { success: "Node status updated successfully", intent: "toggle-active" };
    } catch (error) {
      return { error: ERROR_MESSAGES.UNKNOWN_ERROR, intent: "toggle-active" };
    }
  }

  if (intent === "edit-node") {
    try {
      const { updateNode } = await import("~/lib/core/database/server-operations");
      
      const nodeId = Number(formData.get("node_id"));
      const nodeData = {
        name: formData.get("name") as string,
        hostname: formData.get("hostname") as string,
        ssh_port: Number(formData.get("ssh_port")) || 22,
        cpu_cores_limit: Number(formData.get("cpu_cores_limit")),
        license_token_limit: Number(formData.get("license_token_limit")) || Number(formData.get("cpu_cores_limit")),
        is_active: formData.get("is_active") === "true",
      };

      // Basic validation
      if (!nodeData.name || !nodeData.hostname || !nodeData.cpu_cores_limit) {
        return { error: "Name, hostname, and CPU cores are required", intent: "edit-node" };
      }

      if (nodeData.ssh_port < 1 || nodeData.ssh_port > 65535) {
        return { error: "SSH port must be between 1 and 65535", intent: "edit-node" };
      }

      if (nodeData.cpu_cores_limit < 1 || nodeData.cpu_cores_limit > 128) {
        return { error: "CPU cores must be between 1 and 128", intent: "edit-node" };
      }

      updateNode(nodeId, nodeData);
      return { success: `Node '${nodeData.name}' updated successfully`, intent: "edit-node" };
    } catch (error) {
      return { error: ERROR_MESSAGES.UNKNOWN_ERROR, intent: "edit-node" };
    }
  }

  if (intent === "delete-node") {
    try {
      const { deleteNode } = await import("~/lib/core/database/server-operations");
      
      const nodeId = Number(formData.get("node_id"));
      deleteNode(nodeId);
      return { success: "Node deleted successfully", intent: "delete-node" };
    } catch (error) {
      return { error: ERROR_MESSAGES.UNKNOWN_ERROR, intent: "delete-node" };
    }
  }

  return null;
}

export default function NodesAdmin({ loaderData: { nodes: initialNodes }, actionData }: Route.ComponentProps) {
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  
  // Real-time node data state
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  
  // Update nodes when loader data changes
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes]);
  
  // SSE connection for real-time updates
  const sseResult = useNodeSSE((event) => {
    if (!event.data) return;
    
    const eventData = event.data as any;
    
    switch (event.type) {
      case EVENT_TYPES.NODE_CREATED:
        // Refresh nodes data to get the new node
        window.location.reload();
        break;
        
      case EVENT_TYPES.NODE_UPDATED:
      case EVENT_TYPES.NODE_STATUS_CHANGED:
        if (eventData.nodeId) {
          setNodes(prevNodes => 
            prevNodes.map(node => 
              node.id === eventData.nodeId 
                ? {
                    ...node,
                    status: eventData.status || node.status,
                    name: eventData.nodeName || node.name,
                    hostname: eventData.hostname || node.hostname,
                    ssh_port: eventData.sshPort || node.ssh_port,
                    cpu_cores_limit: eventData.cpuCoresLimit || node.cpu_cores_limit,
                    license_token_limit: eventData.licenseTokenLimit || node.license_token_limit,
                    is_active: eventData.isActive !== undefined ? eventData.isActive : node.is_active
                  }
                : node
            )
          );
        }
        break;
        
      case EVENT_TYPES.NODE_DELETED:
        if (eventData.nodeId) {
          setNodes(prevNodes => prevNodes.filter(node => node.id !== eventData.nodeId));
        }
        break;
    }
  });

  const getStatusBadge = (status: Node["status"]) => {
    const variants = {
      available: "bg-green-100 text-green-800",
      unavailable: "bg-red-100 text-red-800",
    };
    
    return (
      <Badge className={variants[status || 'unavailable']}>
        {status ? status.replace('_', ' ') : 'unavailable'}
      </Badge>
    );
  };

  const handleEditNode = (node: Node) => {
    setSelectedNode(node);
    setShowEditModal(true);
  };

  const handleDeleteNode = (node: Node) => {
    setSelectedNode(node);
    setShowDeleteDialog(true);
  };

  const createNodeButton = (
    <Button 
      onClick={() => setShowCreateModal(true)}
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

        {/* SSE Connection Status */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className={`w-2 h-2 rounded-full ${sseResult.isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span>
            Real-time updates: {sseResult.isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

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
                        <span className="text-sm">{node.cpu_cores_limit}</span>
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
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditNode(node)}
                        >
                          Edit
                        </Button>
                        <Form method="post" style={{ display: 'inline' }}>
                          <input type="hidden" name="intent" value="toggle-active" />
                          <input type="hidden" name="nodeId" value={node.id} />
                          <input type="hidden" name="isActive" value={node.is_active.toString()} />
                          <Button 
                            type="submit"
                            variant="ghost" 
                            size="sm"
                            className={node.is_active ? "text-orange-600" : "text-green-600"}
                          >
                            {node.is_active ? "Deactivate" : "Activate"}
                          </Button>
                        </Form>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteNode(node)}
                          className="text-red-600"
                        >
                          Delete
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

      {/* Modals */}
      <NewNodeModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        actionData={actionData || undefined}
      />

      <EditNodeModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        node={selectedNode}
        actionData={actionData || undefined}
      />

      <DeleteNodeDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        node={selectedNode}
        actionData={actionData || undefined}
      />
    </AdminLayout>
  );
}