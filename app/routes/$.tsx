import type { Route } from "./+types/$";

export function loader({ params }: Route.LoaderArgs) {
	const splat = params["*"];

	// Handle Chrome DevTools requests silently
	if (splat?.includes(".well-known/appspecific/com.chrome.devtools.json")) {
		return new Response("{}", {
			status: 200,
			headers: {
				"Content-Type": "application/json",
			},
		});
	}

	// For other 404s, throw a proper error
	throw new Response("Not Found", {
		status: 404,
		statusText: "Not Found",
	});
}

export default function NotFound() {
	return (
		<div className="min-h-screen bg-gray-50 flex items-center justify-center">
			<div className="max-w-md w-full space-y-8 text-center">
				<div>
					<h1 className="text-6xl font-bold text-gray-400">404</h1>
					<h2 className="mt-4 text-2xl font-bold text-gray-900">
						Page Not Found
					</h2>
					<p className="mt-2 text-gray-600">
						The page you are looking for does not exist.
					</p>
				</div>
				<div>
					<a
						href="/"
						className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
					>
						Go back to home
					</a>
				</div>
			</div>
		</div>
	);
}
