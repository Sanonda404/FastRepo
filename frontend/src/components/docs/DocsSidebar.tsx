import { BookOpen, FolderGit2, Users, Shield, CircleDot } from "lucide-react"

const items = [
  { label: "Introduction", href: "#introduction", icon: BookOpen },
  { label: "Repositories", href: "#repositories", icon: FolderGit2 },
  { label: "Collaborators & Roles", href: "#collaborators", icon: Users },
  { label: "Teams", href: "#teams", icon: Users },
  { label: "Permissions", href: "#permissions", icon: Shield },
  { label: "Issues & Pull Requests", href: "#issues", icon: CircleDot },
]

export default function DocsSidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-foreground/10 bg-muted/20 lg:block">
      <div className="px-6 py-8">
        <p className="text-lg font-bold tracking-tight">
          FastRepo Docs
        </p>

        <nav className="mt-8 space-y-1">
          {items.map(({ label, href, icon: Icon }) => (
            <a
              key={href}
              href={href}
              className="
                flex items-center gap-3 rounded-lg px-3 py-2
                text-sm text-muted-foreground transition-colors
                hover:bg-green-600/10 hover:text-green-700
              "
            >
              <Icon className="size-4" />
              {label}
            </a>
          ))}
        </nav>
      </div>
    </aside>
  )
}