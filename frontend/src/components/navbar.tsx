import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { GitBranch, LogOut, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { useAuth } from "@/lib/use-auth";

export default function Navbar() {
  const { resolvedTheme, setTheme } = useTheme();
  const { isLoggedIn, username, logout } = useAuth();
  const navigate = useNavigate();
  const isDark = resolvedTheme === "dark";

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="flex h-14 w-full items-center justify-between border-b bg-background px-4">
      <Link to="/" className="flex items-center gap-2">
        <GitBranch className="size-5" />
        <span className="font-medium">FastRepo</span>
      </Link>

      <div className="flex items-center gap-2">
        {isLoggedIn ? (
          <>
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {username?.[0]?.toUpperCase()}
              </div>
              <span className="text-sm font-medium">{username}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              aria-label="Log out"
            >
              <LogOut />
              Log out
            </Button>
          </>
        ) : (
          <>
            <Link
              to="/login"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Sign in
            </Link>
          </>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          aria-label="Toggle dark mode"
          title="Toggle dark mode"
        >
          {isDark ? <Sun /> : <Moon />}
        </Button>
      </div>
    </header>
  );
}
