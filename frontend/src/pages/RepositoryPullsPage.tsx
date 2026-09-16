import { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { GitPullRequest, Plus, Search } from "lucide-react"

import RepositoryLayout from "@/components/repository/RepositoryLayout"
import { RepoPermissionProvider } from "@/components/context/RepoPermissionContext"
import { HasCapability } from "@/components/guards/HasCapability"
import { Input } from "@/components/ui/input"
import { getErrorMessage } from "@/lib/apis/api"
import { listPulls } from "@/lib/apis/pull_apis"
import { getRole } from "@/lib/apis/repository_apis"
import { formatRelativeDate } from "@/lib/format-date"
import type { PullRequest } from "@/lib/interfaces"
import type { RepositoryRole } from "../lib/auth/permissions"

export default function RepositoryPullrequestsPage() {
  const { owner = "", repository = "" } = useParams()
  const [role, setRole] = useState<RepositoryRole>("Viewer")
  const [pulls, setPulls] = useState<PullRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  useEffect(() => {
    getRole(owner, repository)
      .then((data) => setRole(data))
      .catch((err) => console.log(getErrorMessage(err)))
  }, [owner, repository])

  useEffect(() => {
    let active = true
    setLoading(true)
    listPulls(owner, repository)
      .then((data) => {
        if (active) {
          setPulls(data)
          setError(null)
        }
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [owner, repository])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return pulls
    return pulls.filter(
      (pr) =>
        (pr.title ?? "").toLowerCase().includes(q) ||
        (pr.author_username ?? "").toLowerCase().includes(q) ||
        String(pr.id).includes(q),
    )
  }, [pulls, search])

  return (
    <RepositoryLayout role={role} owner={owner} repository={repository} activeTab="Pull requests">
      <RepoPermissionProvider role={role}>
        <div className="space-y-4">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Pull requests</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Review and merge changes from contributors.
              </p>
            </div>
            <HasCapability capability="canOpenPullRequest">
              <Link
                to={`/${owner}/${repository}/pulls/create`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
              >
                <Plus className="size-4" />
                New pull request
              </Link>
            </HasCapability>
          </div>

          <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
            <div className="border-b border-foreground/10 p-4">
              <div className="relative max-w-xl">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search pull requests by title or author..."
                  className="pl-9"
                />
              </div>
            </div>

            {loading && (
              <div className="px-5 py-14 text-center text-sm text-muted-foreground">
                Loading pull requests...
              </div>
            )}

            {!loading && error && (
              <div className="px-5 py-14 text-center text-sm text-destructive">{error}</div>
            )}

            {!loading && !error && filtered.length === 0 && (
              <div className="flex flex-col items-center gap-2 px-5 py-14 text-center">
                <GitPullRequest className="size-8 text-muted-foreground" />
                <p className="text-sm font-medium">No pull requests yet</p>
                <p className="text-xs text-muted-foreground">
                  Open a pull request to propose changes for review.
                </p>
              </div>
            )}

            {!loading && !error && filtered.length > 0 && (
              <div className="divide-y divide-foreground/10">
                {filtered.map((pr) => (
                  <Link
                    key={pr.id}
                    to={`/${owner}/${repository}/pulls/${pr.id}`}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/50"
                  >
                    <span
                      className={`size-2 shrink-0 rounded-full ${
                        pr.state === "open" ? "bg-green-600" : "bg-muted-foreground"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{pr.title || "(no title)"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        #{pr.id} · opened by {pr.author_username ?? "unknown"} ·{" "}
                        {formatRelativeDate(pr.created_at)} · {pr.source_branch} →{" "}
                        {pr.target_branch}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs capitalize text-muted-foreground">
                      {pr.state}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </RepoPermissionProvider>
    </RepositoryLayout>
  )
}
