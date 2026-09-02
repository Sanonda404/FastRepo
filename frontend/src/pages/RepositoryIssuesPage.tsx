import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { Plus, Search } from "lucide-react"

import RepositoryLayout from "@/components/repository/RepositoryLayout"
import { Input } from "@/components/ui/input"

import IssueList from "@/components/issues/IssueList"
import type { Issue } from "@/lib/interfaces"

import { getErrorMessage } from "@/lib/apis/api"
import { getIssues } from "@/lib/apis/issue_apis"
import type { RepositoryRole } from "@/lib/auth/permissions"
import { getRole } from "@/lib/apis/repository_apis"
import { useAuth } from "@/lib/auth/use-auth"

export default function RepositoryIssuesPage() {
  const { owner, repository } = useParams<{
    owner: string
    repository: string
  }>()

  const [issues, setIssues] = useState<Issue[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [role, setRole] = useState<RepositoryRole>('Viewer');
  const { username } = useAuth()

  useEffect(() => {
    if (!owner || !repository) return

    let active = true

    getIssues(owner, repository)
      .then((data) => {
        if (!active) return

        setIssues(data)
        setLoading(false)
      })
      .catch((err) => {
        if (!active) return

        setError(getErrorMessage(err))
        setLoading(false)
      })

      getRole(owner, repository)
      .then((data) => {
        if (!active) return

        setRole(data)
        setLoading(false)
      })
      .catch((err) => {
        if (!active) return

        setError(getErrorMessage(err))
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [owner, repository])

  if (!owner || !repository) {
    return <div>Invalid repository.</div>
  }

  const filteredIssues = issues.filter((issue) => {
    const query = search.trim().toLowerCase()

    if (!query) return true

    return (
      issue.title.toLowerCase().includes(query) ||
      issue.body?.toLowerCase().includes(query) ||
      issue.author_username.toLowerCase().includes(query) ||
      issue.labels?.some((label) =>
        label.name.toLowerCase().includes(query),
      )
    )
  })

  return (
    <RepositoryLayout
      role={role}
      owner={owner}
      repository={repository}
      activeTab="Issues"
    >
      <div className="space-y-5">

        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Issues
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Track bugs, improvements, and tasks for this repository.
            </p>
          </div>

          <Link
            to={`/${owner}/${repository}/issues/create`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
          >
            <Plus className="size-4" />
            New issue
          </Link>
        </div>

        {/* Issues container */}
        <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">

          {/* Search */}
          <div className="border-b border-foreground/10 p-4">
            <div className="relative max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search issues by title, author, or label..."
                className="pl-9"
              />
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="px-5 py-14 text-center text-sm text-muted-foreground">
              Loading issues...
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="px-5 py-14 text-center text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Issue list */}
          {!loading && !error && (
            <IssueList
              issues={filteredIssues}
              setIssues={setIssues}
              owner={owner}
              repository={repository}
              currentUsername={username}
              currentRole={role}
            />
          )}
        </div>
      </div>
    </RepositoryLayout>
  )
}