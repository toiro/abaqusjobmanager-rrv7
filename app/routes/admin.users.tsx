import { AdminLayout } from "~/components/layout/AdminLayout";
import { Button, Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, SuccessMessage, ErrorMessage } from "~/components/ui";
import type { User } from "~/lib/core/types/database";
import { ERROR_MESSAGES } from "~/lib/messages";
import { NewUserModal, EditUserModal } from "~/components/users/UserModal";
import { DeleteUserDialog } from "~/components/users/DeleteUserDialog";
import { useState } from "react";
import { Form } from "react-router";
import type { Route } from "./+types/admin.users";

export async function loader() {
  // Auth is handled by parent route (admin.tsx)
  const { userRepository } = await import("~/lib/core/database/server-operations");
  const users = userRepository.findAllUsers();
  return { users };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create-user") {
    try {
      const { userRepository } = await import("~/lib/core/database/server-operations");
      
      const userData = {
        display_name: formData.get("display_name") as string,
        max_concurrent_jobs: Number(formData.get("max_concurrent_jobs")) || 3,
        is_active: formData.get("is_active") === "true",
      };

      // Basic validation
      if (!userData.display_name || userData.display_name.length < 2) {
        return { error: "Display name must be at least 2 characters" };
      }


      if (userData.max_concurrent_jobs < 1 || userData.max_concurrent_jobs > 50) {
        return { error: "Max concurrent jobs must be between 1 and 50" };
      }

      const userId = userRepository.createUser(userData);
      return { success: `User '${userData.display_name}' created successfully`, userId, intent: "create-user" };
    } catch (error) {
      return { error: ERROR_MESSAGES.UNKNOWN_ERROR, intent: "create-user" };
    }
  }

  if (intent === "edit-user") {
    try {
      const { updateUser } = await import("~/lib/core/database/server-operations");
      
      const userId = Number(formData.get("user_id"));
      const userData = {
        display_name: formData.get("display_name") as string,
        max_concurrent_jobs: Number(formData.get("max_concurrent_jobs")) || 3,
        is_active: formData.get("is_active") === "true",
      };

      // Basic validation
      if (!userData.display_name || userData.display_name.length < 2) {
        return { error: "Display name must be at least 2 characters" };
      }


      if (userData.max_concurrent_jobs < 1 || userData.max_concurrent_jobs > 50) {
        return { error: "Max concurrent jobs must be between 1 and 50" };
      }

      updateUser({ id: userId, ...userData });
      return { success: `User '${userData.display_name}' updated successfully`, intent: "edit-user" };
    } catch (error) {
      return { error: ERROR_MESSAGES.UNKNOWN_ERROR, intent: "edit-user" };
    }
  }

  if (intent === "delete-user") {
    try {
      const { deleteUser } = await import("~/lib/core/database/server-operations");
      
      const userId = Number(formData.get("user_id"));
      deleteUser(userId);
      return { success: "User deleted successfully", intent: "delete-user" };
    } catch (error) {
      return { error: ERROR_MESSAGES.UNKNOWN_ERROR, intent: "delete-user" };
    }
  }

  if (intent === "toggle-active") {
    try {
      const { updateUser } = await import("~/lib/core/database/server-operations");
      
      const userId = Number(formData.get("userId"));
      const isActive = formData.get("isActive") === "true";
      
      // Toggle the status
      updateUser({ id: userId, is_active: !isActive });
      return { success: "User status updated successfully", intent: "toggle-active" };
    } catch (error) {
      return { error: ERROR_MESSAGES.UNKNOWN_ERROR, intent: "toggle-active" };
    }
  }

  return null;
}

export default function UsersAdmin({ loaderData: { users }, actionData }: Route.ComponentProps) {
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  const createUserButton = (
    <Button 
      onClick={() => setShowCreateModal(true)}
      className="flex items-center gap-2"
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      Add User
    </Button>
  );

  return (
    <AdminLayout
      title="User Management"
      description="Manage user accounts and permissions"
      actions={createUserButton}
    >
      <div className="space-y-6">
        {/* Messages */}
        {actionData?.success && (
          <SuccessMessage message={actionData.success} />
        )}
        {actionData?.error && (
          <ErrorMessage message={actionData.error} />
        )}

        {/* Users Table */}
        {users.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <p className="text-gray-600 mb-4">No users configured</p>
            <p className="text-sm text-gray-500">Add your first user to start managing accounts</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Display Name</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Max Jobs</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.display_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.id}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <svg className="h-3 w-3 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <span className="text-sm">{user.max_concurrent_jobs}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.is_active ? "default" : "outline"}>
                        {user.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditUser(user)}
                        >
                          Edit
                        </Button>
                        <Form method="post" style={{ display: 'inline' }}>
                          <input type="hidden" name="intent" value="toggle-active" />
                          <input type="hidden" name="userId" value={user.id} />
                          <input type="hidden" name="isActive" value={user.is_active.toString()} />
                          <Button 
                            type="submit"
                            variant="ghost" 
                            size="sm"
                            className={user.is_active ? "text-orange-600" : "text-green-600"}
                          >
                            {user.is_active ? "Deactivate" : "Activate"}
                          </Button>
                        </Form>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteUser(user)}
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
      <NewUserModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        actionData={actionData || undefined}
      />

      <EditUserModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        user={selectedUser}
        actionData={actionData || undefined}
      />

      <DeleteUserDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        user={selectedUser}
        actionData={actionData || undefined}
      />
    </AdminLayout>
  );
}