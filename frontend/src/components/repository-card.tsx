import { Book, Globe, Lock } from "lucide-react"

import type { RepositoryResponse } from "@/lib/interfaces"
import { formatRelativeDate } from "@/lib/format-date"

export default function RepositoryCard({ repo, owner }: { repo: RepositoryResponse; owner: string }) {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
  const isFork = repo.parent_repository_id != null && repo.parent_owner_username && repo.parent_repository_name

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
        <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
          {repo.is_private ? <Lock className="size-3" /> : <Globe className="size-3" />}
          {repo.is_private ? "Private" : "Public"}
        </span>
      </div>

      {isFork && (
        <p className="text-xs text-muted-foreground">
          Forked from{" "}
          <a href={`/${repo.parent_owner_username}/${repo.parent_repository_name}`} className="text-primary hover:underline">
            {baseUrl}/{repo.parent_owner_username}/{repo.parent_repository_name}
          </a>
        </p>
      )}

      {repo.description && (
        <p className="line-clamp-2 text-sm text-muted-foreground">{repo.description}</p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="ml-auto">Created {formatRelativeDate(repo.created_at)}</span>
      </div>
    </div>
  )
}
