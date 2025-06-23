import { Link, useLocation } from "react-router";
import { cn } from "~/lib/utils";
import { SYSTEM_MESSAGES, PAGE_TITLES } from "~/lib/messages";
import { UserSelector } from "~/components/ui/UserSelector";
import type { User } from "~/lib/dbOperations";

interface NavigationItem {
  label: string
  href: string
  description: string
  icon?: React.ReactNode
}

const navigationItems: NavigationItem[] = [
  {
    label: SYSTEM_MESSAGES.JOBS,
    href: "/",
    description: "View and manage Abaqus jobs",
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
          d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
    ),
  },
  {
    label: "Admin",
    href: "/admin",
    description: "Administration Panel",
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
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
];

interface TopNavigationProps {
  selectedUserId?: string;
  onUserChange?: (userId: string) => void;
  users?: User[];
}

export function TopNavigation({ selectedUserId, onUserChange, users }: TopNavigationProps) {
  const location = useLocation();

  return (
    <nav className="border-b bg-background">
      <div className="flex h-16 items-center px-4">
        <div className="flex items-center space-x-4">
          <Link
            to="/"
            className="flex items-center space-x-2 text-xl font-semibold text-foreground"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
              />
            </svg>
            <span>{PAGE_TITLES.HOME}</span>
          </Link>
        </div>

        <div className="ml-8 flex items-center space-x-4">
          {navigationItems.map((item) => {
            const isActive = 
              (item.href === "/" && location.pathname === "/") ||
              (item.href !== "/" && location.pathname.startsWith(item.href))

            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                title={item.description}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>

        <div className="ml-auto flex items-center space-x-4">
          <UserSelector 
            value={selectedUserId}
            onValueChange={onUserChange}
            users={users}
          />
        </div>
      </div>
    </nav>
  );
}