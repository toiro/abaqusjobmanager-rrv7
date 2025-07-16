import { Select } from "./select";
import { type User } from "~/lib/core/database";
import { PLACEHOLDERS, SYSTEM_MESSAGES } from "~/lib/messages";
import { convertUserIdToString } from "~/utils/formatting";

interface UserSelectorProps {
  value?: string;
  onValueChange?: (userId: string) => void;
  className?: string;
  users?: User[];
}

export function UserSelector({ value, onValueChange, className, users = [] }: UserSelectorProps) {

  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center space-x-1">
        <svg
          className="h-4 w-4 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
        <span className="text-sm text-muted-foreground">
          {SYSTEM_MESSAGES.USER}:
        </span>
      </div>
      <Select
        value={value || ""}
        onChange={(e) => onValueChange?.(e.target.value)}
        className={className}
        disabled={users.length === 0}
      >
        <option value="" disabled>
          {PLACEHOLDERS.SELECT_USER}
        </option>
        {users.map((user) => (
          <option key={user.id} value={convertUserIdToString(user.id)}>
            {user.display_name}
          </option>
        ))}
      </Select>
    </div>
  );
}