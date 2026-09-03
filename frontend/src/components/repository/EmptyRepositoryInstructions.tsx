import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth/use-auth"
import { api } from "@/lib/apis/api"
import type { UserResponse } from "@/lib/interfaces"

type Props = {
  owner: string
  repository: string
  activeBranch: string
  defaultBranch: string
}

export default function EmptyRepositoryInstructions({ owner, repository, activeBranch, defaultBranch }: Props) {
  const { isLoggedIn, username } = useAuth()
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoggedIn || !username) {
      setEmail(null)
      return
    }
    let active = true
    api<UserResponse>("/users/me")
      .then((u) => { if (active) setEmail(u.email) })
      .catch(() => {})
    return () => { active = false }
  }, [isLoggedIn, username])

  const host = typeof window !== "undefined" ? window.location.host : "localhost"
  const protocol = typeof window !== "undefined" ? window.location.protocol : "http:"
  const cloneUrl = isLoggedIn && username
    ? `${protocol}//${username}:YOUR_PASSWORD@${host}/${owner}/${repository}`
    : `${protocol}//${host}/${owner}/${repository}`

  const isNonDefault = activeBranch !== "" && defaultBranch !== "" && activeBranch !== defaultBranch
  const displayName = username ?? "Your Name"
  const displayEmail = email ?? "you@example.com"

  const lines: string[] = []
  lines.push(`git clone ${cloneUrl}`)
  lines.push(`cd ${repository}`)
  if (isNonDefault) {
    lines.push(`git checkout -b ${activeBranch}`)
  }
  lines.push(`git config user.name "${displayName}"`)
  lines.push(`git config user.email "${displayEmail}"`)

  return (
    <div className="px-4 py-6" data-testid="empty-repo-instructions">
      <h3 className="text-sm font-semibold">Empty repository</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        This repository is empty. Clone it and push your code.
      </p>
      <pre className="mt-4 overflow-x-auto rounded-lg bg-muted p-4 text-xs leading-relaxed">
        <code>{lines.join("\n")}</code>
      </pre>
    </div>
  )
}
