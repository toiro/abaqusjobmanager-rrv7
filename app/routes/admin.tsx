import { Outlet, redirect } from "react-router";
import { requireAdminAuth } from "~/lib/services/auth/auth";
import type { Route } from "./+types/admin";

export async function loader({ request }: Route.LoaderArgs) {
  // Check Bearer Auth before rendering any admin content
  const authError = requireAdminAuth(request);
  if (authError) {
    throw authError;
  }
  
  return null;
}

export default function AdminLayout() {
  return <Outlet />;
}