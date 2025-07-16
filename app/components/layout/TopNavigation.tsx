import { Link } from "react-router";
import { PAGE_TITLES } from "~/lib/messages";
import { UserSelector } from "~/components/ui/UserSelector";
import type { User } from "~/lib/core/types/database";
import { NavigationList } from "~/components/navigation/NavigationList";
import { NavigationIcons } from "~/components/navigation/NavigationIcons";
import { mainNavigationConfig } from "~/components/navigation/NavigationConfig";

interface TopNavigationProps {
  selectedUserId?: string;
  onUserChange?: (userId: string) => void;
  users?: User[];
  isLoading?: boolean;
}

export function TopNavigation({ selectedUserId, onUserChange, users }: TopNavigationProps) {
  return (
    <nav className="border-b bg-background">
      <div className="flex h-16 items-center px-4">
        <div className="flex items-center space-x-4">
          <Link
            to="/"
            className="flex items-center space-x-2 text-xl font-semibold text-foreground"
          >
            {NavigationIcons.database}
            <span>{PAGE_TITLES.HOME}</span>
          </Link>
        </div>

        <div className="ml-8">
          <NavigationList 
            items={mainNavigationConfig.sections[0].items}
            variant="horizontal"
          />
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