import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { GitBranch, LogOut, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { useAuth } from "@/lib/auth/use-auth"
import { api, subscribeAuthChange } from "@/lib/apis/api"
import type { UserResponse } from "@/lib/interfaces"

export default function Navbar() {
  const { resolvedTheme, setTheme } = useTheme();
  const { isLoggedIn, username, logout } = useAuth();
  const navigate = useNavigate();
  const isDark = resolvedTheme === "dark";
  const [me, setMe] = useState<UserResponse | null>(null);
  const [bust, setBust] = useState(0);

  useEffect(() => {
    const unsub = subscribeAuthChange(() => setBust((v) => v + 1));
    return unsub;
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !username) {
      setMe(null);
      return;
    }
    let active = true;
    api<UserResponse>("/users/me")
      .then((data) => {
        if (active) setMe(data);
      })
      .catch(() => {
        if (active) setMe(null);
      });
    return () => {
      active = false;
    };
  }, [isLoggedIn, username, bust]);

  const avatarUrl = me?.profile_pic_url ? `${me.profile_pic_url}?t=${bust}` : null;

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="flex h-14 w-full items-center justify-between border-b border-foreground/10 bg-background px-4">
      <Link to="/" className="flex items-center gap-2">
        <GitBranch className="size-5" />
        <span className="font-medium">FastRepo</span>
      </Link>

      <div className="flex items-center gap-2">
        {isLoggedIn ? (
          <>
            <Link to={`/${username}`} className="flex items-center gap-2 rounded-full hover:opacity-80" data-testid="navbar-profile-link">
              <div className="flex size-7 items-center justify-center overflow-hidden rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={username ?? "avatar"} className="size-full object-cover" />
                ) : (
                  username?.[0]?.toUpperCase()
                )}
              </div>
              <span className="text-sm font-medium hover:underline">{username}</span>
            </Link>
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
