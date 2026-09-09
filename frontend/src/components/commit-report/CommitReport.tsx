import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Check, Copy, GitCommitHorizontal } from "lucide-react"
import { getCommit } from "@/lib/apis/repository_apis"
import type { CommitDetail } from "@/lib/interfaces"
import { getErrorMessage } from "@/lib/apis/api"
import { relativeTime } from "@/components/commits/relativeTime"
import ChangedFilesSidebar from "./ChangedFilesSidebar"
import FileDiff from "./FileDiff"

type Props = {
  owner: string
  repository: string
  sha: string
}

export default function CommitReport({ owner, repository, sha }: Props) {
  const [commit, setCommit] = useState<CommitDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    setCommit(null)
    getCommit(owner, repository, sha)
      .then((c) => { if (active) setCommit(c) })
      .catch((err) => { if (active) setError(getErrorMessage(err)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [owner, repository, sha, retry])

  // follow #file-i deep links after diffs render
  useEffect(() => {
    if (!commit || !window.location.hash) return
    const el = document.getElementById(window.location.hash.slice(1))
    if (el) {
      // stop the browser's own scroll restoration from overriding us
      try { window.history.scrollRestoration = "manual" } catch { /* noop */ }
      const top = el.getBoundingClientRect().top + document.documentElement.scrollTop - 80
      document.body.scrollTop = top
      document.documentElement.scrollTop = top
    }
  }, [commit])

  const copySha = async () => {
    try {
      await navigator.clipboard.writeText(sha)
    } catch {
      const ta = document.createElement("textarea")
      ta.value = sha
      document.body.appendChild(ta)
      ta.select()
      document.execCommand("copy")
      document.body.removeChild(ta)
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4" aria-label="Loading commit">
        <div className="animate-pulse rounded-xl bg-card p-5 ring-1 ring-foreground/10">
          <div className="h-5 w-2/3 rounded bg-muted" />
          <div className="mt-3 h-4 w-1/3 rounded bg-muted" />
        </div>
        <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <div className="h-64 animate-pulse rounded-xl bg-card ring-1 ring-foreground/10" aria-hidden="true" />
          <div className="flex flex-col gap-4" aria-hidden="true">
            {[0, 1].map((i) => <div key={i} className="h-48 animate-pulse rounded-xl bg-card ring-1 ring-foreground/10" />)}
          </div>
        </div>
      </div>
    )
  }

  if (error || !commit) {
    return (
      <div role="alert" className="flex flex-col items-center gap-2 px-4 py-16 text-center">
        <p className="text-sm font-semibold">Unable to load commit</p>
        <p className="text-sm text-muted-foreground">Something went wrong while loading this commit.</p>
        <button
          type="button"
          onClick={() => setRetry((n) => n + 1)}
          className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-primary"
        >
          Try again
        </button>
      </div>
    )
  }

  const additions = commit.diff.reduce((n, f) => n + f.additions, 0)
  const deletions = commit.diff.reduce((n, f) => n + f.deletions, 0)

  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Commit summary" className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
        <h1 className="text-base font-semibold leading-snug">{commit.message.split("\n")[0] || "(empty message)"}</h1>
        {commit.message.includes("\n") && (
          <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-muted-foreground">
            {commit.message.split("\n").slice(1).join("\n").trim()}
          </pre>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <Link to={`/${commit.author}`} className="font-medium text-foreground hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary">
            {commit.author}
          </Link>
          <span>
            committed{" "}
            <time dateTime={commit.author_date} title={new Date(commit.author_date).toLocaleString()}>
              {relativeTime(commit.author_date)}
            </time>
          </span>
          <span className="flex items-center gap-1 font-mono text-xs">
            <GitCommitHorizontal className="size-3.5" />
            {commit.sha.slice(0, 7)}
          </span>
          <button
            type="button"
            onClick={copySha}
            aria-label={copied ? "SHA copied" : "Copy full SHA"}
            title={copied ? "Copied" : "Copy full SHA"}
            className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
          >
            {copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
          </button>
          <span className="font-mono text-xs">
            {commit.diff.length} file{commit.diff.length === 1 ? "" : "s"} ·{" "}
            <span className="text-emerald-600 dark:text-emerald-400">+{additions}</span>{" "}
            <span className="text-red-600 dark:text-red-400">−{deletions}</span>
          </span>
        </div>
      </section>

      {commit.diff.length === 0 ? (
        <p className="rounded-xl bg-card px-4 py-12 text-center text-sm text-muted-foreground ring-1 ring-foreground/10">
          No file changes in this commit.
        </p>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <div className="lg:sticky lg:top-4">
            <ChangedFilesSidebar files={commit.diff} />
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            {commit.diff.map((f, i) => <FileDiff key={`${f.path}-${i}`} index={i} file={f} />)}
          </div>
        </div>
      )}
    </div>
  )
}
