import { useEffect, useState } from "react"
import { Navigate, useParams } from "react-router-dom"
import { api, getErrorMessage } from "@/lib/apis/api"
import { useAuth } from "@/lib/auth/use-auth"
import type { RepositoryResponse, UserResponse } from "@/lib/interfaces"
import RepositoryCard from "@/components/repository-card"
import Footer from "@/components/footer"

export default function UserProfilePage() {
  const { username } = useParams<{ username: string }>()
  const { isLoggedIn, username: currentUsername } = useAuth()
  const [user, setUser] = useState<UserResponse | null>(null)
  const [repos, setRepos] = useState<RepositoryResponse[] | null>(null)
  const [userError, setUserError] = useState<string | null>(null)
  const [reposError, setReposError] = useState<string | null>(null)

  useEffect(() => {
    if (!username) return
    let active = true
    api<UserResponse>(`/users/${username}`)
      .then((data) => {
        if (active) {
          setUser(data)
          setUserError(null)
        }
      })
      .catch((err) => {
        if (active) setUserError(getErrorMessage(err))
      })
    return () => { active = false }
  }, [username])

  useEffect(() => {
    if (!username) return
    let active = true
    api<RepositoryResponse[]>(`/repositories/${username}`)
      .then((data) => {
        if (active) {
          setRepos(data)
          setReposError(null)
        }
      })
      .catch((err) => {
        if (active) setReposError(getErrorMessage(err))
      })
    return () => { active = false }
  }, [username])

  if (isLoggedIn && currentUsername && username === currentUsername) {
    return <Navigate to="/" replace />
  }

  if (userError) {
    return (
      <div className="flex min-h-dvh flex-col">
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
          <p className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive" data-testid="user-error">{userError}</p>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {user ? (
          <section data-testid="profile" className="flex items-center gap-4 rounded-xl bg-card p-5 ring-1 ring-foreground/10">
            <div className="flex size-16 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground" data-testid="profile-picture">
              {user.username[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-lg font-semibold" data-testid="profile-username">{user.username}</p>
              <p className="text-sm text-muted-foreground" data-testid="profile-email">{user.email}</p>
            </div>
          </section>
        ) : (
          <p className="text-sm text-muted-foreground">Loading profile…</p>
        )}

        <section data-testid="repositories" className="mt-10">
          <h2 className="mb-4 text-lg font-semibold">Repositories</h2>
          {reposError && (
            <p className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{reposError}</p>
          )}
          {!reposError && repos === null && (
            <p className="text-sm text-muted-foreground">Loading repositories…</p>
          )}
          {repos !== null && repos.length === 0 && (
            <p className="text-sm text-muted-foreground">No repositories found.</p>
          )}
          {repos !== null && repos.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {repos.map((repo) => (
                <RepositoryCard key={repo.id} repo={repo} owner={username!} />
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  )
}
