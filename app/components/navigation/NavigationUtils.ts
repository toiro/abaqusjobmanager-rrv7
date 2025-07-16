/**
 * Navigation utilities
 * Shared logic for route matching and URL manipulation
 */

/**
 * Check if a route is currently active
 * @param currentPath - Current pathname from useLocation()
 * @param targetHref - Target route href
 * @param exactMatch - Whether to require exact match (default: false)
 * @returns boolean indicating if route is active
 */
export function isActiveRoute(currentPath: string, targetHref: string, exactMatch = false): boolean {
  if (exactMatch || targetHref === "/") {
    return currentPath === targetHref;
  }
  return currentPath.startsWith(targetHref);
}

/**
 * Add URL token parameter to href if provided
 * @param href - Base href
 * @param token - Optional token to append as query parameter
 * @returns href with token parameter if provided
 */
export function addTokenToHref(href: string, token?: string): string {
  if (!token) return href;
  
  const separator = href.includes('?') ? '&' : '?';
  return `${href}${separator}token=${encodeURIComponent(token)}`;
}

/**
 * Extract token from URL search params
 * @param searchParams - URLSearchParams or search string
 * @returns token value or undefined
 */
export function extractTokenFromUrl(searchParams: URLSearchParams | string): string | undefined {
  const params = typeof searchParams === 'string' 
    ? new URLSearchParams(searchParams) 
    : searchParams;
  
  return params.get('token') || undefined;
}

/**
 * Common navigation styling classes
 */
export const NavigationStyles = {
  // Base link styles
  baseLink: "flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
  
  // Active state styles
  active: "bg-primary text-primary-foreground",
  
  // Inactive state styles  
  inactive: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
  
  // Vertical navigation variant
  verticalLink: "flex items-start space-x-3 rounded-lg px-3 py-2 text-sm transition-colors",
  verticalActive: "bg-primary text-primary-foreground",
  verticalInactive: "text-muted-foreground hover:bg-muted hover:text-foreground"
} as const;