import { Book, Lock } from "lucide-react"

import type { RepositoryResponse } from "@/lib/interfaces"
import { formatRelativeDate } from "@/lib/format-date"

export default function RepositoryCard({ repo, owner }: { repo: RepositoryResponse; owner: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-card p-5 ring-1 ring-foreground/10">
      <div className="flex items-center gap-2">
        <Book className="size-4 shrink-0 text-muted-foreground" />
        <a
          href={`/${owner}/${repo.name}`}
          className="truncate font-semibold text-primary hover:underline"
        >
          {owner}/{repo.name}
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
        <span className="ml-auto">Created {formatRelativeDate(repo.created_at)}</span>
      </div>
    </div>
  )
}
