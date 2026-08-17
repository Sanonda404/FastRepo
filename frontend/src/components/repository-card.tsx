import { Book, CircleDot, GitFork, Lock, Star } from "lucide-react"

import { cn } from "@/lib/utils"
import type { MockRepository } from "@/lib/mock-data"

const LANGUAGE_COLORS: Record<string, string> = {
  Python: "bg-sky-400",
  TypeScript: "bg-blue-500",
  Go: "bg-cyan-500",
  Shell: "bg-emerald-400",
  Markdown: "bg-gray-400",
}

function formatCount(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`
  return String(value)
}

export default function RepositoryCard({ repo }: { repo: MockRepository }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-card p-5 ring-1 ring-foreground/10">
      <div className="flex items-center gap-2">
        <Book className="size-4 shrink-0 text-muted-foreground" />
        <a
          href={`/${repo.owner}/${repo.name}`}
          className="truncate font-semibold text-primary hover:underline"
        >
          {repo.owner}/{repo.name}
        </a>
        {repo.is_private && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
            <Lock className="size-3" />
            Private
          </span>
        )}
      </div>

      {repo.description && (
        <p className="line-clamp-2 text-sm text-muted-foreground">{repo.description}</p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        {repo.language && (
          <span className="inline-flex items-center gap-1.5">
            <span className={cn("size-3 rounded-full", LANGUAGE_COLORS[repo.language] ?? "bg-gray-400")} />
            {repo.language}
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <Star className="size-3.5" />
          {formatCount(repo.stars)}
        </span>
        <span className="inline-flex items-center gap-1">
          <GitFork className="size-3.5" />
          {formatCount(repo.forks)}
        </span>
        <span className="inline-flex items-center gap-1">
          <CircleDot className="size-3.5" />
          {repo.open_issues}
        </span>
        <span className="ml-auto">Updated {repo.updated_at}</span>
      </div>
    </div>
  )
}
