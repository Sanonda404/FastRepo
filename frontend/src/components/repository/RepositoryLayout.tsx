import type { ReactNode } from "react"
import {
  Activity,
  BookOpen,
  CircleDot,
  GitPullRequest,
  Settings,
  Users,
} from "lucide-react"
import { Link } from "react-router-dom"

type RepositoryLayoutProps = {
  owner: string
  repository: string
  activeTab: string
  children: ReactNode
}

const tabs = [
  { label: "Code", path: "", icon: BookOpen },
  { label: "Issues", path: "/issues", icon: CircleDot },
  { label: "Pull requests", path: "/pulls", icon: GitPullRequest },
  { label: "Teams", path: "/teams", icon: Users },
  { label: "Activity", path: "/activity", icon: Activity },
  { label: "Settings", path: "/settings", icon: Settings },
]

export default function RepositoryLayout({
  owner,
  repository,
  activeTab,
  children,
}: RepositoryLayoutProps) {
  return (
    <main className="min-h-[calc(100dvh-3.5rem)] bg-background">
      <header className="border-b">
        <div className="mx-auto w-full max-w-6xl px-6 pt-8">
          <h1 className="text-xl font-semibold tracking-tight">
            <span className="text-muted-foreground">{owner} /</span>{" "}
            {repository}
          </h1>

          <nav
            aria-label="Repository navigation"
            className="mt-6 flex gap-1 overflow-x-auto"
          >
            {tabs.map(({ label, path, icon: Icon }) => {
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
