import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Home, LogOut } from "lucide-react";
import { useAuth } from "@/auth/useAuth";
import { useNavigate } from "react-router-dom";

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  rightSlot?: ReactNode;
};

export default function PageLayout({
  title,
  subtitle,
  children,
  rightSlot,
}: Props) {
  const nav = useNavigate();
  const { user, logout } = useAuth();
  const roles = user?.roles ?? [];

  return (
    <div className="min-h-screen bg-muted/30 p-6 flex items-center justify-center">
      <div className="w-full max-w-6xl rounded-2xl border bg-background shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b px-6 py-4">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">
              Logged in as {user?.name}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {roles.join(", ")}
            </p>
          </div>

          <div className="text-center flex-1">
            <h1 className="text-lg font-semibold">{title}</h1>
            {subtitle ? (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>

          <div className="flex justify-end gap-2">
            {rightSlot}

            <Button
              variant="outline"
              size="sm"
              onClick={() => nav("/")}
              title="Home"
            >
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                logout();
                nav("/login");
              }}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
