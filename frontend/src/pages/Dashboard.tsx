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
import { useAuth } from "@/lib/use-auth"
import { mockRepositories, mockStats } from "@/lib/mock-data"
import StatCard from "@/components/stat-card"
import RepositoryCard from "@/components/repository-card"
import Footer from "@/components/footer"

const stats = [
  { label: "Commits", value: mockStats.totalCommits, icon: GitCommitHorizontal },
  { label: "Open issues", value: mockStats.openIssues, icon: CircleDot },
  { label: "Open pull requests", value: mockStats.openPullRequests, icon: GitPullRequest },
  { label: "Repositories", value: mockStats.totalRepos, icon: Folder },
  { label: "Collaborators", value: mockStats.collaborators, icon: Users },
  { label: "Stars", value: mockStats.totalStars, icon: Star },
]

export default function Dashboard() {
  const { username } = useAuth()

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

          <div className="grid gap-4 sm:grid-cols-2">
            {mockRepositories.map((repo) => (
              <RepositoryCard key={repo.id} repo={repo} />
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}