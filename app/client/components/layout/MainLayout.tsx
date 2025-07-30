/**
 * Hydration-Safe Main Layout Component
 * Prevents hydration mismatches by handling client-side localStorage safely
 */

import { ReactNode, useState, useEffect } from "react";
import { TopNavigation } from "./TopNavigation";
import { SystemStatusBar } from "~/client/components/ui/SystemStatusBar";
import type { User } from "~/shared/core/types/database";

interface MainLayoutProps {
	children: ReactNode;
	title?: string;
	description?: string;
	actions?: ReactNode;
	users?: User[];
	showSystemStatus?: boolean;
	initialSelectedUserId?: string;
	initialLicenseUsed?: number;
	initialLicenseTotal?: number;
}

export function MainLayout({
	children,
	title,
	description,
	actions,
	users,
	showSystemStatus = false,
	initialSelectedUserId = "",
	initialLicenseUsed = 0,
	initialLicenseTotal = 12,
}: MainLayoutProps) {
	// Client-side state management
	const [selectedUserId, setSelectedUserId] = useState<string>(
		initialSelectedUserId,
	);
	const [isMounted, setIsMounted] = useState(false);
	const [hasStorageLoaded, setHasStorageLoaded] = useState(false);

	// Handle user selection changes
	const handleUserChange = (userId: string) => {
		setSelectedUserId(userId);

		// Only access localStorage on client-side
		if (isMounted && typeof window !== "undefined") {
			try {
				if (userId) {
					localStorage.setItem("selectedUserId", userId);
				} else {
					localStorage.removeItem("selectedUserId");
				}
			} catch (error) {
				console.warn("Failed to save user selection to localStorage:", error);
			}
		}
	};

	// Client-side mounting detection
	useEffect(() => {
		setIsMounted(true);
	}, []);

	// Load saved user selection from localStorage (client-side only)
	useEffect(() => {
		if (!isMounted || typeof window === "undefined") {
			return;
		}

		try {
			const savedUserId = localStorage.getItem("selectedUserId");
			if (savedUserId && savedUserId !== selectedUserId) {
				setSelectedUserId(savedUserId);
			}
		} catch (error) {
			console.warn("Failed to load user selection from localStorage:", error);
		} finally {
			setHasStorageLoaded(true);
		}
	}, [isMounted, selectedUserId]);

	return (
		<div className="min-h-screen bg-background">
			<TopNavigation
				selectedUserId={selectedUserId}
				onUserChange={handleUserChange}
				users={users}
				isLoading={!hasStorageLoaded}
			/>

			{showSystemStatus && (
				<SystemStatusBar
					initialLicenseUsed={initialLicenseUsed}
					initialLicenseTotal={initialLicenseTotal}
				/>
			)}

			<main className="flex-1">
				{(title || description || actions) && (
					<header className="border-b bg-muted/10">
						<div className="container mx-auto px-4 py-6">
							<div className="flex items-start justify-between">
								<div>
									{title && (
										<h1 className="text-3xl font-bold tracking-tight text-foreground">
											{title}
										</h1>
									)}
									{description && (
										<p className="mt-2 text-muted-foreground">{description}</p>
									)}
								</div>
								{actions && (
									<div className="flex items-center space-x-2">{actions}</div>
								)}
							</div>
						</div>
					</header>
				)}

				<div className="container mx-auto px-4 py-6">{children}</div>
			</main>
		</div>
	);
}

/**
 * Hydration-safe wrapper for legacy MainLayout usage
 */
export function MainLayoutWrapper(props: {
	children: ReactNode;
	title?: string;
	description?: string;
	actions?: ReactNode;
	users?: User[];
	showSystemStatus?: boolean;
}) {
	return <MainLayout {...props} showSystemStatus={props.showSystemStatus} />;
}
