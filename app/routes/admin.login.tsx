import { Button, Input, Label, ErrorMessage } from "~/components/ui";
import { validateAdminToken } from "~/lib/services/auth/auth";
import type { Route } from "./+types/admin.login";
import { useState } from "react";

export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData();
	const token = formData.get("token") as string;

	if (!token) {
		return { error: "Token is required" };
	}

	if (!validateAdminToken(token)) {
		return { error: "Invalid token" };
	}

	// Set token in session/cookie and redirect to admin
	// For now, we'll redirect with token in URL (not recommended for production)
	return new Response(null, {
		status: 302,
		headers: {
			Location: `/admin?token=${encodeURIComponent(token)}`,
		},
	});
}

export default function AdminLogin({ actionData }: Route.ComponentProps) {
	const [token, setToken] = useState("");

	return (
		<div className="min-h-screen bg-gray-50 flex items-center justify-center">
			<div className="max-w-md w-full space-y-8">
				<div>
					<h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
						Admin Access
					</h2>
					<p className="mt-2 text-center text-sm text-gray-600">
						Enter your admin token to access the administration panel
					</p>
				</div>
				<form className="mt-8 space-y-6" method="post">
					<div className="space-y-4">
						<div>
							<Label
								htmlFor="token"
								className="text-sm font-medium text-gray-700"
							>
								Admin Token
							</Label>
							<Input
								id="token"
								name="token"
								type="password"
								value={token}
								onChange={(e) => setToken(e.target.value)}
								className="mt-1"
								placeholder="Enter admin token"
								required
							/>
						</div>
					</div>

					{actionData?.error && <ErrorMessage message={actionData.error} />}

					<div>
						<Button
							type="submit"
							className="w-full flex justify-center py-2 px-4"
							disabled={!token.trim()}
						>
							Access Admin Panel
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
}
