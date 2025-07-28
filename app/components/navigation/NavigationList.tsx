/**
 * Shared navigation list component
 * Eliminates navigation rendering duplication across layouts
 */

import { Link, useLocation } from "react-router";
import { cn } from "~/lib/helpers/utils";
import type { NavigationItem } from "./NavigationConfig";
import {
	isActiveRoute,
	addTokenToHref,
	NavigationStyles,
} from "./NavigationUtils";

interface NavigationListProps {
	items: NavigationItem[];
	variant?: "horizontal" | "vertical";
	token?: string;
	className?: string;
}

interface NavigationLinkProps {
	item: NavigationItem;
	href: string;
	isActive: boolean;
	variant: "horizontal" | "vertical";
}

function NavigationLink({
	item,
	href,
	isActive,
	variant,
}: NavigationLinkProps) {
	if (variant === "vertical") {
		return (
			<Link
				to={href}
				className={cn(
					NavigationStyles.verticalLink,
					isActive
						? NavigationStyles.verticalActive
						: NavigationStyles.verticalInactive,
				)}
				title={item.description}
			>
				{item.icon && <div className="mt-0.5">{item.icon}</div>}
				<div>
					<div className="font-medium">{item.label}</div>
					<div className="text-xs opacity-70">{item.description}</div>
				</div>
			</Link>
		);
	}

	return (
		<Link
			to={href}
			className={cn(
				NavigationStyles.baseLink,
				isActive ? NavigationStyles.active : NavigationStyles.inactive,
			)}
			title={item.description}
		>
			{item.icon}
			<span>{item.label}</span>
		</Link>
	);
}

export function NavigationList({
	items,
	variant = "horizontal",
	token,
	className,
}: NavigationListProps) {
	const location = useLocation();

	const containerClass =
		variant === "horizontal" ? "flex items-center space-x-4" : "space-y-2";

	return (
		<nav className={cn(containerClass, className)}>
			{items.map((item) => {
				const isActive = isActiveRoute(
					location.pathname,
					item.href,
					item.exactMatch,
				);
				const href = addTokenToHref(item.href, token);

				return (
					<NavigationLink
						key={item.href}
						item={item}
						href={href}
						isActive={isActive}
						variant={variant}
					/>
				);
			})}
		</nav>
	);
}
