/**
 * Bearer Authentication utilities for admin routes
 */

/**
 * Parse Bearer Authentication header
 */
export function parseBearerAuth(authHeader: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7).trim(); // Remove "Bearer " prefix and trim whitespace
  return token || null;
}

/**
 * Validate admin token against environment variables
 */
export function validateAdminToken(token: string): boolean {
  const adminToken = process.env.ADMIN_TOKEN;
  
  if (!adminToken) {
    console.warn('Admin token not configured in environment variables');
    return false;
  }
  
  return token === adminToken;
}

/**
 * Create authentication error response
 */
export function createAuthError(): Response {
  return new Response(JSON.stringify({ error: 'Unauthorized access' }), {
    status: 401,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Check if request has valid admin authentication
 * Returns null if authenticated, Response if needs redirect/error
 */
export function requireAdminAuth(request: Request): Response | null {
  const url = new URL(request.url);
  
  // Check for token in Authorization header first (higher priority)
  let token: string | null = null;
  const authHeader = request.headers.get('Authorization');
  if (authHeader) {
    token = parseBearerAuth(authHeader);
  }
  
  // Check for token in URL parameter if not found in header
  if (!token) {
    token = url.searchParams.get('token');
  }
  
  // Debug logging only in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Admin auth check:', {
      url: request.url,
      token: token ? 'present' : 'missing',
      adminToken: process.env.ADMIN_TOKEN ? 'configured' : 'missing'
    });
  }
  
  if (!token) {
    if (process.env.NODE_ENV === 'development') {
      console.log('No token found, redirecting to login');
    }
    // Redirect to login if not already there
    if (!url.pathname.includes('/admin/login')) {
      return Response.redirect('/admin/login');
    }
    return null; // Allow access to login page
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log('Parsed token:', token.substring(0, 8) + '***');
  }
  
  if (!validateAdminToken(token)) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Invalid token provided, redirecting to login');
    }
    return Response.redirect('/admin/login?error=invalid_token');
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log('Authentication successful');
  }
  return null; // Authentication successful
}

/**
 * Generate a simple admin token (for development)
 * In production, use a proper JWT or secure token generation
 */
export function generateAdminToken(): string {
  return 'admin_' + Math.random().toString(36).substring(2);
}