import { Star } from "lucide-react"

import type { RepositoryDetails } from "@/lib/interfaces"
import RepositoryCard from "@/components/repository-card"

type StarredRepositoriesProps = {
  repos: RepositoryDetails[] | null
  error: string | null
  username: string
}

export default function StarredRepositories({ repos, error, username }: StarredRepositoriesProps) {
  return (
    <section className="mt-10" data-testid="starred-repositories">
      <div className="mb-4 flex items-center gap-2">
        <Star className="size-5 text-amber-500" />
        <h2 className="text-lg font-semibold">Starred repositories</h2>
        {repos && repos.length > 0 && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {repos.length}
          </span>
        )}
      </div>

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </p>
      )}

      {!error && repos === null && (
        <div className="rounded-xl bg-card p-6 text-sm text-muted-foreground ring-1 ring-foreground/10">
          Loading starred repositories…
        </div>
      )}

      {!error && repos !== null && repos.length === 0 && (
        <div className="rounded-xl bg-card px-6 py-10 text-center ring-1 ring-foreground/10">
          <Star className="mx-auto size-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium">No starred repositories</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {username} hasn&apos;t starred any repositories yet.
          </p>
        </div>
      )}

      {repos !== null && repos.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {repos.map((repo) => (
            <RepositoryCard key={repo.id} repo={repo} owner={repo.owner_username} />
          ))}
        </div>
      )}
    </section>
  )
}
