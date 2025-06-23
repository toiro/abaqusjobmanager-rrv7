import { Outlet, redirect } from "react-router";
import { requireAdminAuth } from "~/lib/auth";
import type { Route } from "./+types/admin";

export async function loader({ request }: Route.LoaderArgs) {
  // Check Bearer Auth before rendering any admin content
  const authError = requireAdminAuth(request);
  if (authError) {
    return redirect('/admin/login');
  }
  
  return null;
}

export default function AdminLayout() {
  return <Outlet />;
}