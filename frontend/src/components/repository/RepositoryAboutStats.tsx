import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { GitFork, Star } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getStar, listForks, listStargazers } from "@/lib/apis/repository_apis"
import type { RepositoryDetails } from "@/lib/interfaces"

type Props = { owner: string; repository: string }

export default function RepositoryAboutStats({ owner, repository }: Props) {
  const [forkCount, setForkCount] = useState<number | null>(null)
  const [starCount, setStarCount] = useState<number | null>(null)
  const [forksOpen, setForksOpen] = useState(false)
  const [starsOpen, setStarsOpen] = useState(false)
  const [forks, setForks] = useState<RepositoryDetails[] | null>(null)
  const [forksError, setForksError] = useState<string | null>(null)
  const [stargazers, setStargazers] = useState<{ id: number; username: string; created_at: string }[] | null>(null)
  const [starsError, setStarsError] = useState<string | null>(null)

  const refreshCounts = () => {
    listForks(owner, repository)
      .then((r) => setForkCount(r.length))
      .catch(() => setForkCount(0))
    getStar(owner, repository)
      .then((r) => setStarCount(r.star_count))
      .catch(() => setStarCount(0))
  }

  useEffect(() => {
    let active = true
    listForks(owner, repository)
      .then((r) => { if (active) setForkCount(r.length) })
      .catch(() => { if (active) setForkCount(0) })
    getStar(owner, repository)
      .then((r) => { if (active) setStarCount(r.star_count) })
      .catch(() => { if (active) setStarCount(0) })
    return () => { active = false }
  }, [owner, repository])

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ owner: string; repository: string; star_count?: number; forkIncrement?: number }>
      if (ce.detail.owner !== owner || ce.detail.repository !== repository) return
      if (typeof ce.detail.star_count === "number") setStarCount(ce.detail.star_count)
      else if (ce.detail.forkIncrement) setForkCount((c) => (c ?? 0) + ce.detail.forkIncrement!)
      // refetch for correctness (viewer-filtered)
      refreshCounts()
    }
    window.addEventListener("repo-stats-updated", handler as EventListener)
    return () => window.removeEventListener("repo-stats-updated", handler as EventListener)
  }, [owner, repository])

  const openForks = () => {
    setForksOpen(true)
    setForks(null)
    setForksError(null)
    listForks(owner, repository)
      .then(setForks)
      .catch((e: unknown) => setForksError(e instanceof Error ? e.message : "Failed to load forks"))
  }
  const openStars = () => {
    setStarsOpen(true)
    setStargazers(null)
    setStarsError(null)
    listStargazers(owner, repository)
      .then(setStargazers)
      .catch((e: unknown) => setStarsError(e instanceof Error ? e.message : "Failed to load stars"))
  }

  return (
    <>
      <div className="mt-4 flex flex-col gap-2 border-t border-foreground/10 pt-4">
        <button
          type="button"
          onClick={openForks}
          data-testid="about-forks"
          className="flex cursor-pointer items-center gap-2 text-sm hover:text-primary hover:underline"
        >
          <GitFork className="size-4 text-muted-foreground" />
          <span className="font-medium">Forks</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {forkCount ?? "…"}
          </span>
        </button>
        <button
          type="button"
          onClick={openStars}
          data-testid="about-stars"
          className="flex cursor-pointer items-center gap-2 text-sm hover:text-primary hover:underline"
        >
          <Star className="size-4 text-muted-foreground" />
          <span className="font-medium">Stars</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {starCount ?? "…"}
          </span>
        </button>
      </div>

      <Dialog open={forksOpen} onOpenChange={setForksOpen}>
        <DialogContent className="max-h-[70vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Forks</DialogTitle>
            <DialogDescription>Repositories forked from {owner}/{repository}</DialogDescription>
          </DialogHeader>
          {forksError && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{forksError}</p>}
          {!forksError && forks === null && <p className="text-sm text-muted-foreground">Loading forks…</p>}
          {!forksError && forks !== null && forks.length === 0 && <p className="text-sm text-muted-foreground">No forks yet.</p>}
          {!forksError && forks !== null && forks.length > 0 && (
            <ul className="flex flex-col gap-2">
              {forks.map((f) => (
                <li key={f.id} className="rounded-lg border border-foreground/10 p-3">
                  <div className="flex items-center gap-2">
                    <GitFork className="size-4 text-muted-foreground" />
                    <Link to={`/${f.owner_username}/${f.name}`} className="text-sm font-medium text-primary hover:underline">
                      {f.owner_username}/{f.name}
                    </Link>
                    <span className="ml-auto rounded-full border px-2 py-0.5 text-xs text-muted-foreground">{f.is_private ? "Private" : "Public"}</span>
                  </div>
                  {f.description && <p className="mt-1 text-xs text-muted-foreground">{f.description}</p>}
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={starsOpen} onOpenChange={setStarsOpen}>
        <DialogContent className="max-h-[70vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Stargazers</DialogTitle>
            <DialogDescription>Users who starred {owner}/{repository}</DialogDescription>
          </DialogHeader>
          {starsError && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{starsError}</p>}
          {!starsError && stargazers === null && <p className="text-sm text-muted-foreground">Loading stargazers…</p>}
          {!starsError && stargazers !== null && stargazers.length === 0 && <p className="text-sm text-muted-foreground">No stars yet.</p>}
          {!starsError && stargazers !== null && stargazers.length > 0 && (
            <ul className="flex flex-col gap-2">
              {stargazers.map((u) => (
                <li key={u.id} className="flex items-center gap-2 rounded-lg border border-foreground/10 p-3">
                  <div className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {u.username.charAt(0).toUpperCase()}
                  </div>
                  <Link to={`/${u.username}`} className="text-sm font-medium hover:underline">
                    {u.username}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
