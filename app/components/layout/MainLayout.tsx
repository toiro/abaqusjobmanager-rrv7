import { ReactNode, useState, useEffect } from "react";
import { TopNavigation } from "./TopNavigation";
import type { User } from "~/lib/dbOperations";

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
  users?: User[];
}

export function MainLayout({ children, title, description, actions, users }: MainLayoutProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const handleUserChange = (userId: string) => {
    setSelectedUserId(userId);
    // ローカルストレージに保存
    if (userId) {
      localStorage.setItem('selectedUserId', userId);
    } else {
      localStorage.removeItem('selectedUserId');
    }
  };

  // 初期値をローカルストレージから取得
  useEffect(() => {
    const savedUserId = localStorage.getItem('selectedUserId');
    if (savedUserId) {
      setSelectedUserId(savedUserId);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation 
        selectedUserId={selectedUserId}
        onUserChange={handleUserChange}
        users={users}
      />
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
                    <p className="mt-2 text-muted-foreground">
                      {description}
                    </p>
                  )}
                </div>
                {actions && (
                  <div className="flex items-center space-x-2">
                    {actions}
                  </div>
                )}
              </div>
            </div>
          </header>
        )}
        <div className="container mx-auto px-4 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}