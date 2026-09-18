import { GitBranch } from "lucide-react"
import { Link } from "react-router-dom"

export default function Footer() {
  return (
    <footer className="border-t border-foreground/10 bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-6 sm:flex-row">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <GitBranch className="size-4" />
          <span>FastRepo — code hosting for teams.</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/docs"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Docs
          </Link>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} FastRepo. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
