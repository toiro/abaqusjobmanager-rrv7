import { AdminLayout } from "~/components/layout/AdminLayout";
import { findAllUsers } from "~/lib/core/database";
import type { Route } from "./+types/admin.users";

export function loader() {
  // Auth is handled by parent route (admin.tsx)
  const users = findAllUsers();
  return { users };
}

export default function UsersAdmin({ loaderData: { users } }: Route.ComponentProps) {
  
  return (
    <AdminLayout
      title="User Management"
      description="Manage user accounts and permissions"
    >
      <div>
        <h2>Users List</h2>
        <p>Found {users.length} users</p>
        <ul>
          {users.map((user) => (
            <li key={user.id}>
              {user.display_name} (max jobs: {user.max_concurrent_jobs})
            </li>
          ))}
        </ul>
      </div>
    </AdminLayout>
  );
}