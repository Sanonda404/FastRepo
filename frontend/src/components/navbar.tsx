import { useTheme } from "next-themes"
import { GitBranch, Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function Navbar() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  return (
    <header className="flex h-14 w-full items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-2">
        <GitBranch className="size-5" />
        <span className="font-medium">FastRepo</span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        aria-label="Toggle dark mode"
        title="Toggle dark mode"
      >
        {isDark ? <Sun /> : <Moon />}
      </Button>
    </header>
  )
}