import { useState } from "react"
import { Link } from "react-router-dom"
import { Check, Copy } from "lucide-react"
import type { CommitSummary } from "@/lib/interfaces"
import { relativeTime } from "./relativeTime"

type Props = {
  owner: string
  repository: string
  commit: CommitSummary
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function CommitRow({ owner, repository, commit }: Props) {
  const [copied, setCopied] = useState(false)
  const short = commit.sha.slice(0, 7)
  const detailPath = `/${owner}/${repository}/commits/${commit.sha}`
  const firstLine = commit.message.split("\n")[0] || "(empty message)"

  const copySha = async () => {
    try {
      await navigator.clipboard.writeText(commit.sha)
    } catch {
      const ta = document.createElement("textarea")
      ta.value = commit.sha
      document.body.appendChild(ta)
      ta.select()
      document.execCommand("copy")
      document.body.removeChild(ta)
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <li className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
      <div aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
        {initials(commit.author)}
      </div>
      <div className="min-w-0 flex-1">
        <Link
          to={detailPath}
          title={commit.message}
          className="block truncate text-sm font-semibold text-foreground hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
        >
          {firstLine}
        </Link>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          <Link to={`/${commit.author}`} className="font-medium hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary">
            {commit.author}
          </Link>
          {" committed "}
          <time dateTime={commit.author_date} title={new Date(commit.author_date).toLocaleString()}>
            {relativeTime(commit.author_date)}
          </time>
          {commit.is_merge && <span className="ml-2 rounded-full border border-foreground/10 px-1.5 py-px text-[10px]">merge</span>}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Link
          to={detailPath}
          title={commit.sha}
          className="rounded font-mono text-xs text-muted-foreground hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
        >
          {short}
        </Link>
        <button
          type="button"
          onClick={copySha}
          aria-label={copied ? "SHA copied" : `Copy full SHA ${short}`}
          title={copied ? "Copied" : "Copy full SHA"}
          className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
        >
          {copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
        </button>
      </div>
    </li>
  )
}
