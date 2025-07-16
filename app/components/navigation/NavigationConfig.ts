/**
 * Navigation configuration definitions
 * Centralized navigation structure to eliminate duplication
 */

import { NavigationIcons } from "./NavigationIcons";
import { SYSTEM_MESSAGES } from "~/lib/messages";

export interface NavigationItem {
  label: string;
  href: string;
  description: string;
  icon?: React.ReactNode;
  exactMatch?: boolean;
}

export interface NavigationSection {
  label: string;
  items: NavigationItem[];
}

export interface NavigationConfig {
  sections: NavigationSection[];
  preserveUrlTokens?: boolean;
}

// Main application navigation
export const mainNavigationConfig: NavigationConfig = {
  sections: [
    {
      label: "Main",
      items: [
        {
          label: SYSTEM_MESSAGES.JOBS,
          href: "/",
          description: "View and manage Abaqus jobs",
          icon: NavigationIcons.jobs,
          exactMatch: true
        },
        {
          label: "Admin",
          href: "/admin",
          description: "Administration Panel",
          icon: NavigationIcons.admin
        },
        {
          label: "Test",
          href: "/test",
          description: "Development Testing",
          icon: NavigationIcons.test
        }
      ]
    }
  ],
  preserveUrlTokens: false
};

// Test section navigation
export const testNavigationConfig: NavigationConfig = {
  sections: [
    {
      label: "Test Categories",
      items: [
        {
          label: "UI Components",
          href: "/test/ui",
          description: "Test UI components and styling",
          icon: NavigationIcons.ui
        },
        {
          label: "API Testing",
          href: "/test/api",
          description: "Test API endpoints and responses",
          icon: NavigationIcons.api
        },
        {
          label: "SSE Testing",
          href: "/test/sse",
          description: "Test Server-Sent Events functionality",
          icon: NavigationIcons.sse
        }
      ]
    }
  ],
  preserveUrlTokens: false
};

// Admin section navigation
export const adminNavigationConfig: NavigationConfig = {
  sections: [
    {
      label: "Administration",
      items: [
        {
          label: "Dashboard",
          href: "/admin",
          description: "System overview and statistics",
          icon: NavigationIcons.admin,
          exactMatch: true
        },
        {
          label: "Users",
          href: "/admin/users",
          description: "Manage system users",
          icon: NavigationIcons.ui
        },
        {
          label: "Nodes",
          href: "/admin/nodes",
          description: "Manage execution nodes",
          icon: NavigationIcons.database
        },
        {
          label: "Files",
          href: "/admin/files",
          description: "File management and cleanup",
          icon: NavigationIcons.jobs
        }
      ]
    }
  ],
  preserveUrlTokens: true // Admin needs to preserve auth tokens
};