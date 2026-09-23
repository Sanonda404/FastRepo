import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Search, X } from "lucide-react"
import { listCommitsPage } from "@/lib/apis/repository_apis"
import type { CommitPage } from "@/lib/interfaces"
import { getErrorMessage } from "@/lib/apis/api"
import CommitRow from "./CommitRow"
import CommitPagination from "./CommitPagination"

type Props = {
  owner: string
  repository: string
  // true: repo has no default branch / commits yet; false: fetch normally; null: still unknown, wait
  isEmptyRepo?: boolean | null
}

const PAGE_SIZES = [10, 20, 50, 100]
const DATE_OPTIONS = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
] as const
const TYPE_OPTIONS = [
  { value: "all", label: "All commits" },
  { value: "regular", label: "Regular commits" },
  { value: "merges", label: "Merge commits" },
] as const

function startOfDay(d: Date): Date {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  return c
}

function sinceForPreset(preset: string): string | undefined {
  const now = new Date()
  if (preset === "today") return startOfDay(now).toISOString()
  if (preset === "week") return new Date(now.getTime() - 7 * 86400000).toISOString()
  if (preset === "month") return new Date(now.getTime() - 30 * 86400000).toISOString()
  return undefined
}

function SkeletonList() {
  return (
    <ul aria-label="Loading commits" className="divide-y divide-foreground/10">
      {Array.from({ length: 8 }, (_, i) => (
        <li key={i} className="flex animate-pulse items-center gap-3 px-4 py-3" aria-hidden="true">
          <div className="size-8 shrink-0 rounded-full bg-muted" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="h-4 w-3/5 rounded bg-muted" />
            <div className="h-3 w-2/5 rounded bg-muted" />
          </div>
          <div className="h-4 w-14 shrink-0 rounded bg-muted" />
        </li>
      ))}
    </ul>
  )
}

export default function CommitHistory({ owner, repository, isEmptyRepo = false }: Props) {
  const [params, setParams] = useSearchParams()

  const page = Math.max(1, Number(params.get("page") ?? 1) || 1)
  const pageSize = PAGE_SIZES.includes(Number(params.get("pageSize"))) ? Number(params.get("pageSize")) : 20
  const search = params.get("search") ?? ""
  const author = params.get("author") ?? ""
  const datePreset = params.get("date") ?? "all"
  const typeFilter = params.get("type") ?? "all"
  const ref = params.get("ref") ?? undefined

  const [draft, setDraft] = useState(search)
  const [authorDraft, setAuthorDraft] = useState(author)
  const [data, setData] = useState<CommitPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)

  // keep inputs in sync with back/forward navigation
  useEffect(() => { setDraft(search) }, [search])
  useEffect(() => { setAuthorDraft(author) }, [author])

  // debounce search + author into URL (resets to page 1)
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (draft === search && authorDraft === author) return
      setParams((prev) => {
        const next = new URLSearchParams(prev)
        if (draft) next.set("search", draft); else next.delete("search")
        if (authorDraft) next.set("author", authorDraft); else next.delete("author")
        next.delete("page")
        return next
      })
    }, 400)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, authorDraft])

  const since = useMemo(() => sinceForPreset(datePreset), [datePreset])

  useEffect(() => {
    if (isEmptyRepo !== false) return
    let active = true
    setLoading(true)
    setError(null)
    listCommitsPage(owner, repository, {
      ref,
      page,
      pageSize,
      search: search || undefined,
      author: author || undefined,
      since,
      merges: (typeFilter as "all" | "regular" | "merges") ?? "all",
    })
      .then((res) => { if (active) setData(res) })
      .catch((err) => { if (active) setError(getErrorMessage(err)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [owner, repository, ref, page, pageSize, search, author, since, typeFilter, retry, isEmptyRepo])

  const update = (patch: Record<string, string | undefined>, resetPage = true) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [k, v] of Object.entries(patch)) {
        if (v) next.set(k, v); else next.delete(k)
      }
      if (resetPage) next.delete("page")
      return next
    })
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1
  const safePage = Math.min(page, totalPages)

  // clamp out-of-range page (e.g. after filters shrink the result set)
  useEffect(() => {
    if (data && data.total > 0 && page > totalPages) {
      update({ page: totalPages === 1 ? undefined : String(totalPages) }, false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, totalPages])
  const hasFilters = Boolean(search || author || datePreset !== "all" || typeFilter !== "all")
  const clearAll = () => {
    setDraft("")
    setAuthorDraft("")
    update({ search: undefined, author: undefined, date: undefined, type: undefined })
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Commits</h1>
        {isEmptyRepo === true ? (
          <p className="text-sm text-muted-foreground">No commits yet</p>
        ) : (
          data !== null && !loading && (
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {data.total} commit{data.total === 1 ? "" : "s"}
            </p>
          )
        )}
      </div>

      {isEmptyRepo === true ? (
        <div className="mt-4 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <p className="text-sm font-semibold">No commits yet</p>
            <p className="text-sm text-muted-foreground">
              This repository is empty. Push a commit to see it here.
            </p>
          </div>
        </div>
      ) : (
        <>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search commits</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Search commits..."
            className="h-9 w-full rounded-md border border-foreground/10 bg-card pl-9 pr-8 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary"
          />
          {draft && (
            <button
              type="button"
              onClick={() => setDraft("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
            >
              <X className="size-4" />
            </button>
          )}
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="commit-author">Filter by author</label>
          <input
            id="commit-author"
            value={authorDraft}
            onChange={(e) => setAuthorDraft(e.target.value)}
            placeholder="Author"
            className="h-9 w-32 rounded-md border border-foreground/10 bg-card px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary"
          />
          <label className="sr-only" htmlFor="commit-date">Filter by date</label>
          <select
            id="commit-date"
            value={datePreset}
            onChange={(e) => update({ date: e.target.value === "all" ? undefined : e.target.value })}
            className="h-9 rounded-md border border-foreground/10 bg-card px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {DATE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <label className="sr-only" htmlFor="commit-type">Filter by type</label>
          <select
            id="commit-type"
            value={typeFilter}
            onChange={(e) => update({ type: e.target.value === "all" ? undefined : e.target.value })}
            className="h-9 rounded-md border border-foreground/10 bg-card px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <label className="sr-only" htmlFor="commit-pagesize">Commits per page</label>
          <select
            id="commit-pagesize"
            value={pageSize}
            onChange={(e) => update({ pageSize: e.target.value })}
            className="h-9 rounded-md border border-foreground/10 bg-card px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {PAGE_SIZES.map((n) => <option key={n} value={n}>{n} / page</option>)}
          </select>
        </div>
      </div>

      {hasFilters && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          {search && <span className="rounded-full border border-foreground/10 px-2 py-1 text-muted-foreground">Search: {search}</span>}
          {author && <span className="rounded-full border border-foreground/10 px-2 py-1 text-muted-foreground">Author: {author}</span>}
          {datePreset !== "all" && <span className="rounded-full border border-foreground/10 px-2 py-1 text-muted-foreground">Date: {DATE_OPTIONS.find((o) => o.value === datePreset)?.label}</span>}
          {typeFilter !== "all" && <span className="rounded-full border border-foreground/10 px-2 py-1 text-muted-foreground">Type: {TYPE_OPTIONS.find((o) => o.value === typeFilter)?.label}</span>}
          <button type="button" onClick={clearAll} className="font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary">
            Clear all
          </button>
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10" aria-busy={loading && data !== null}>
        {loading && data === null && <SkeletonList />}
        {!loading && error && (
          <div role="alert" className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <p className="text-sm font-semibold">Unable to load commits</p>
            <p className="text-sm text-muted-foreground">Something went wrong while loading the commit history.</p>
            <button
              type="button"
              onClick={() => setRetry((n) => n + 1)}
              className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-primary"
            >
              Try again
            </button>
          </div>
        )}
        {!error && data !== null && data.commits.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <p className="text-sm font-semibold">{hasFilters ? "No commits found" : "No commits yet"}</p>
            <p className="text-sm text-muted-foreground">
              {hasFilters ? "No commits match your current search or filters." : "There are no commits to display."}
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={clearAll}
                className="mt-2 rounded-md border border-foreground/10 px-4 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
        {!error && data !== null && data.commits.length > 0 && (
          <ul aria-label="Commits" className={`divide-y divide-foreground/10 ${loading ? "opacity-60" : ""}`}>
            {data.commits.map((c) => <CommitRow key={c.sha} owner={owner} repository={repository} commit={c} />)}
          </ul>
        )}
      </div>

      {!error && data !== null && data.commits.length > 0 && (
        <CommitPagination
          page={safePage}
          totalPages={totalPages}
          onPage={(p) => update({ page: p === 1 ? undefined : String(p) }, false)}
        />
      )}
        </>
      )}
    </div>
  )
}
