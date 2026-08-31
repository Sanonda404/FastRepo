import { useEffect, useState } from "react"
import {
  GitCommitHorizontal,
  CircleDot,
  GitPullRequest,
  Folder,
  Users,
  Star,
  Plus,
} from "lucide-react"

import { Link } from "react-router-dom"
import { useAuth } from "@/lib/auth/use-auth"
import { api, getErrorMessage } from "@/lib/apis/api"
import StatCard from "@/components/stat-card"
import RepositoryCard from "@/components/repository-card"
import Footer from "@/components/footer"
import type { RepositoryDetails, UserMeResponse } from "@/lib/interfaces"
import { getAllAccessibleRepositories } from "@/lib/apis/repository_apis"

export default function Dashboard() {
  const { username } = useAuth()
  const [reposByUsername, setReposByUsername] = useState<Record<string, RepositoryDetails[]>>({})
  const [errorsByUsername, setErrorsByUsername] = useState<Record<string, string>>({})
  const [userMe, setUserMe] = useState<UserMeResponse | null>(null)

  useEffect(() => {
    if (!username || reposByUsername[username] || errorsByUsername[username]) return
    let active = true
    getAllAccessibleRepositories()
      .then((data) => {
        if (active) setReposByUsername((prev) => ({ ...prev, [username]: data }))
      })
      .catch((err) => {
        if (active) setErrorsByUsername((prev) => ({ ...prev, [username]: getErrorMessage(err) }))
      })
    return () => { active = false }
  }, [username, reposByUsername, errorsByUsername])

  useEffect(() => {
    if (!username) return
    let active = true
    api<UserMeResponse>("/users/me")
      .then((data) => {
        if (active) setUserMe(data)
      })
      .catch(() => {})
    return () => { active = false }
  }, [username])

  const repos = username ? reposByUsername[username] ?? null : null
  const error = username ? errorsByUsername[username] ?? null : null

  const stats = [
    { label: "Commits", value: userMe?.commits ?? 0, icon: GitCommitHorizontal },
    { label: "Open issues", value: userMe?.open_issues ?? 0, icon: CircleDot },
    { label: "Open pull requests", value: userMe?.open_pull_requests ?? 0, icon: GitPullRequest },
    { label: "Repositories", value: repos?.length ?? 0, icon: Folder },
    { label: "Collaborators", value: userMe?.collaborators ?? 0, icon: Users },
    { label: "Stars", value: userMe?.stars ?? 0, icon: Star },
  ]

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Welcome back, {username}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here's what's happening across your repositories.
        </p>

        <section data-testid="stats" className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </section>

        <section data-testid="repositories" className="mt-10">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Your repositories</h2>

            <Link
              to="/create/repository"
              aria-label="Create new repository"
              className="inline-flex h-9 items-center gap-2 rounded-md bg-green-600 px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-700"
            >
              <Plus className="h-4 w-4" />
              New
            </Link>
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{error}</p>
          )}
          {!error && repos === null && (
            <p className="text-sm text-muted-foreground">Loading repositories…</p>
          )}
          {repos !== null && (
            <div className="grid gap-4 sm:grid-cols-2">
              {repos.map((repo) => (
                <RepositoryCard key={repo.id} repo={repo} owner={repo.owner_username} />
              ))}

            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  )
}
