import type { ReactNode } from "react"
import { Lock } from "lucide-react"
import {
  BookOpen,
  CircleDot,
  GitPullRequest,
  Settings,
  Users,
} from "lucide-react"
import { Link } from "react-router-dom"
import type { RepositoryRole } from "@/lib/auth/permissions"

type RepositoryLayoutProps = {
  role : RepositoryRole
  owner: string
  repository: string
  activeTab: string
  isPrivate?: boolean
  children: ReactNode
}

const tabs = [
  { label: "Code", path: "", icon: BookOpen },
  { label: "Issues", path: "/issues", icon: CircleDot },
  { label: "Pull requests", path: "/pulls", icon: GitPullRequest },
  { label: "Teams", path: "/teams", icon: Users },
  { label: "Settings", path: "/settings", icon: Settings },
]

export default function RepositoryLayout({
  role,
  owner,
  repository,
  activeTab,
  isPrivate,
  children,
}: RepositoryLayoutProps) {
  // filter tabs based on role
  const visibleTabs = tabs.filter(tab => {
    if (tab.label === "Settings") {
      return role != 'Viewer'
    }
    return true // all other tabs are always visible
  })

  return (
    <main className="min-h-[calc(100dvh-3.5rem)]">
      <header className="border-b border-foreground/10">
        <div className="mx-auto w-full max-w-6xl px-6 pt-8">
          <h1 className="flex items-center gap-3 text-xl font-semibold tracking-tight">
            <Link to={`/${owner}`} className="text-muted-foreground hover:text-primary hover:underline">{owner}</Link>{" "}
            <span className="text-muted-foreground">/</span>{" "}
            {repository}
            {isPrivate && (
              <span className="inline-flex items-center gap-1 rounded-full border border-foreground/10 px-2 py-0.5 text-xs font-normal text-muted-foreground">
                <Lock className="size-3" />
                Private
              </span>
            )}
          </h1>

          <nav
            aria-label="Repository navigation"
            className="mt-6 flex gap-1 overflow-x-auto"
          >
            {visibleTabs.map(({ label, path, icon: Icon }) => {
              const href = `/${owner}/${repository}${path}`
              const active = label === activeTab

              return (
                <Link
                  key={label}
                  to={href}
                  className={`flex shrink-0 items-center gap-2 rounded-t-md border-b-2 px-3 pb-3 pt-2 text-sm ${
                    active
                      ? "border-primary font-semibold"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              )
            })}
          </nav>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        {children}
      </div>
    </main>
  )
}