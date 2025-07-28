/**
 * Test Layout Component
 * Provides consistent layout for test pages with navigation sidebar
 */

import { ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { cn } from "~/lib/helpers/utils";

interface TestLayoutProps {
	children: ReactNode;
	title?: string;
	description?: string;
}

interface TestNavigationItem {
	label: string;
	href: string;
	description: string;
	icon: React.ReactNode;
}

const testNavigationItems: TestNavigationItem[] = [
	{
		label: "UI Components",
		href: "/test/ui",
		description: "Test UI components and styling",
		icon: (
			<svg
				className="h-4 w-4"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={2}
					d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v6a2 2 0 002 2h4a2 2 0 002-2V5zM21 15a2 2 0 00-2-2h-4a2 2 0 00-2 2v2a2 2 0 002 2h4a2 2 0 002-2v-2z"
				/>
			</svg>
		),
	},
	{
		label: "SSE Testing",
		href: "/test/sse",
		description: "Test Server-Sent Events functionality",
		icon: (
			<svg
				className="h-4 w-4"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={2}
					d="M13 10V3L4 14h7v7l9-11h-7z"
				/>
			</svg>
		),
	},
	{
		label: "API Testing",
		href: "/test/api",
		description: "Test API endpoints and responses",
		icon: (
			<svg
				className="h-4 w-4"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={2}
					d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
				/>
			</svg>
		),
	},
];

export function TestLayout({ children, title, description }: TestLayoutProps) {
	const location = useLocation();

	return (
		<div className="min-h-screen bg-background">
			{/* Top Navigation */}
			<nav className="border-b bg-background">
				<div className="flex h-16 items-center px-4">
					<div className="flex items-center space-x-4">
						<Link
							to="/"
							className="flex items-center space-x-2 text-muted-foreground hover:text-foreground"
						>
							<svg
								className="h-4 w-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M10 19l-7-7m0 0l7-7m-7 7h18"
								/>
							</svg>
							<span>Back to Jobs</span>
						</Link>
						<div className="h-4 w-px bg-border" />
						<h1 className="text-lg font-semibold">Test Environment</h1>
					</div>
				</div>
			</nav>

			<div className="flex">
				{/* Sidebar Navigation */}
				<aside className="w-64 border-r bg-muted/10 min-h-[calc(100vh-4rem)]">
					<div className="p-4">
						<h2 className="text-sm font-medium text-muted-foreground mb-4">
							Test Categories
						</h2>
						<nav className="space-y-2">
							{testNavigationItems.map((item) => {
								const isActive = location.pathname === item.href;
								return (
									<Link
										key={item.href}
										to={item.href}
										className={cn(
											"flex items-start space-x-3 rounded-lg px-3 py-2 text-sm transition-colors",
											isActive
												? "bg-primary text-primary-foreground"
												: "text-muted-foreground hover:bg-muted hover:text-foreground",
										)}
									>
										<div className="mt-0.5">{item.icon}</div>
										<div>
											<div className="font-medium">{item.label}</div>
											<div
												className={cn(
													"text-xs",
													isActive
														? "text-primary-foreground/80"
														: "text-muted-foreground",
												)}
											>
												{item.description}
											</div>
										</div>
									</Link>
								);
							})}
						</nav>
					</div>
				</aside>

				{/* Main Content */}
				<main className="flex-1">
					{(title || description) && (
						<header className="border-b bg-muted/10">
							<div className="px-6 py-6">
								{title && (
									<h1 className="text-2xl font-bold tracking-tight text-foreground">
										{title}
									</h1>
								)}
								{description && (
									<p className="mt-2 text-muted-foreground">{description}</p>
								)}
							</div>
						</header>
					)}

					<div className="p-6">{children}</div>
				</main>
			</div>
		</div>
	);
}
