import { useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import {
  CircleDot,
  Filter,
  GitPullRequest,
  MessageSquare,
  Plus,
  Search,
  Tag,
  UserRound,
  UsersRound,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { mockIssues } from "./mock-issues"
import IssueLabel from "./issue-label"
import IssueAvatarStack from "./issue-avatar-stack"

type FilterState = "open" | "closed" | "all"

export default function IssueListPage() {
  const { owner = "jane", repository = "fastrepo" } = useParams()
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<FilterState>("open")

  const visibleIssues = useMemo(() => {
    return mockIssues.filter((issue) => {
      const matchesStatus = filter === "all" || issue.status === filter
      const normalizedQuery = query.toLowerCase()

      const matchesQuery =
        !normalizedQuery ||
        issue.title.toLowerCase().includes(normalizedQuery) ||
        issue.body.toLowerCase().includes(normalizedQuery) ||
        issue.labels.some((label) =>
          label.toLowerCase().includes(normalizedQuery),
        )

      return matchesStatus && matchesQuery
    })
  }, [filter, query])

  const issuePath = (id: number) =>
    `/repositories/${owner}/${repository}/issues/${id}`

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Issues</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Track bugs, features, discussions, and repository tasks.
          </p>
        </div>

        <Button asChild className="gap-2 bg-green-600 text-white hover:bg-green-700">
          <Link to={`/repositories/${owner}/${repository}/issues/new`}>
            <Plus className="size-4" />
            New issue
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
        <section className="min-w-0 rounded-xl bg-card ring-1 ring-foreground/10">
          <div className="flex flex-col gap-3 border-b p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search issues..."
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <IssueFilterButton
                active={filter === "open"}
                onClick={() => setFilter("open")}
              >
                <CircleDot className="size-4 text-green-600" />
                Open
              </IssueFilterButton>

              <IssueFilterButton
                active={filter === "closed"}
                onClick={() => setFilter("closed")}
              >
                Closed
              </IssueFilterButton>

              <IssueFilterButton
                active={filter === "all"}
                onClick={() => setFilter("all")}
              >
                All
              </IssueFilterButton>

              <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                <Filter className="size-3.5" />
                {visibleIssues.length} results
              </span>
            </div>
          </div>

          <div className="divide-y">
            {visibleIssues.map((issue) => (
              <Link
                key={issue.id}
                to={issuePath(issue.id)}
                className="block px-5 py-5 transition-colors hover:bg-muted/40"
              >
                <div className="flex gap-3">
                  <CircleDot
                    className={`mt-1 size-5 shrink-0 ${
                      issue.status === "open"
                        ? "text-green-600"
                        : "text-muted-foreground"
                    }`}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold hover:text-primary">
                        {issue.title}
                      </h3>

                      {issue.labels.map((label) => (
                        <IssueLabel key={label} label={label} />
                      ))}
                    </div>

                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {issue.body}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                      <span>#{issue.id}</span>
                      <span>
                        opened by <strong className="font-medium">{issue.author}</strong>
                      </span>
                      <span>updated {issue.updatedAt}</span>

                      <span className="flex items-center gap-1">
                        <MessageSquare className="size-3.5" />
                        {issue.comments}
                      </span>

                      {issue.assignees.length > 0 && (
                        <IssueAvatarStack users={issue.assignees} />
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}

            {!visibleIssues.length && (
              <div className="px-5 py-12 text-center">
                <CircleDot className="mx-auto size-8 text-muted-foreground/50" />
                <p className="mt-3 font-medium">No issues found</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try changing your filters or create a new issue.
                </p>
              </div>
            )}
          </div>
        </section>

        <IssueQuickActions owner={owner} repository={repository} />
      </div>
    </div>
  )
}

function IssueFilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "secondary" : "ghost"}
      onClick={onClick}
      className="gap-2"
    >
      {children}
    </Button>
  )
}

function IssueQuickActions({
  owner,
  repository,
}: {
  owner: string
  repository: string
}) {
  const base = `/repositories/${owner}/${repository}`

  return (
    <aside className="h-fit space-y-4">
      <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
        <h3 className="font-semibold">Issue tools</h3>
        <div className="mt-4 space-y-2">
          <Button asChild variant="outline" className="w-full justify-start gap-2">
            <Link to={`${base}/issues/new`}>
              <Plus className="size-4" />
              Create issue
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full justify-start gap-2">
            <Link to={`${base}/pulls/new`}>
              <GitPullRequest className="size-4" />
              Create pull request
            </Link>
          </Button>
        </div>
      </div>

      <div className="rounded-xl bg-muted/40 p-5">
        <h3 className="text-sm font-semibold">Manage</h3>
        <div className="mt-3 space-y-2 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <Tag className="size-4" /> Labels
          </p>
          <p className="flex items-center gap-2">
            <UserRound className="size-4" /> Assignees
          </p>
          <p className="flex items-center gap-2">
            <UsersRound className="size-4" /> Teams
          </p>
        </div>
      </div>
    </aside>
  )
}
