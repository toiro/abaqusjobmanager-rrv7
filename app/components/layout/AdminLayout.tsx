import { Link, useLocation } from "react-router";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function AdminLayout({ children, title, description, actions }: AdminLayoutProps) {
  const location = useLocation();
  
  // Get token from URL to preserve it in navigation
  const urlParams = new URLSearchParams(location.search);
  const token = urlParams.get('token');
  
  const navigationItems = [
    { href: "/admin", label: "Dashboard", icon: "🏠" },
    { href: "/admin/nodes", label: "Nodes", icon: "🖥️" },
    { href: "/admin/users", label: "Users", icon: "👥" },
    { href: "/admin/files", label: "Files", icon: "📁" },
    { href: "/admin/settings", label: "Settings", icon: "⚙️" },
  ];

  // Add token to href if it exists
  const getHrefWithToken = (href: string) => {
    if (token) {
      return `${href}?token=${encodeURIComponent(token)}`;
    }
    return href;
  };

  const isActive = (href: string) => {
    if (href === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link to="/" className="text-xl font-bold text-gray-900 hover:text-gray-600">
                Abaqus Job Manager
              </Link>
              <Badge variant="secondary" className="text-xs">
                Admin
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/">
                <Button variant="ghost" size="sm">
                  ← Back to Jobs
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Admin Sidebar */}
          <aside className="w-64 flex-shrink-0">
            <nav className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-sm font-medium text-gray-900 mb-4">Administration</h3>
              <ul className="space-y-2">
                {navigationItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      to={getHrefWithToken(item.href)}
                      className={`
                        flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors
                        ${isActive(item.href)
                          ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }
                      `}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <div className="bg-white rounded-lg shadow-sm border">
              {/* Page Header */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                    {description && (
                      <p className="mt-1 text-sm text-gray-500">{description}</p>
                    )}
                  </div>
                  {actions && (
                    <div className="flex items-center space-x-4">
                      {actions}
                    </div>
                  )}
                </div>
              </div>

              {/* Page Content */}
              <div className="px-6 py-6">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}