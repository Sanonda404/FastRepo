import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"

import RepositoryLayout from "@/components/repository/RepositoryLayout"
import CommitHistory from "@/components/commits/CommitHistory"
import { getRole, getRepository } from "@/lib/apis/repository_apis"
import type { RepositoryRole } from "@/lib/auth/permissions"
import { getErrorMessage } from "@/lib/apis/api"
import type { RepositoryResponse } from "@/lib/interfaces"

export default function RepositoryCommitsPage() {
  const { owner = "", repository = "" } = useParams()
  const [role, setRole] = useState<RepositoryRole>("Viewer")
  const [repoMeta, setRepoMeta] = useState<RepositoryResponse | null>(null)
  const [metaFailed, setMetaFailed] = useState(false)

  useEffect(() => {
    getRole(owner, repository)
      .then(setRole)
      .catch((err) => console.log(getErrorMessage(err)))
  }, [owner, repository])

  useEffect(() => {
    let active = true
    getRepository(owner, repository)
      .then((meta) => active && setRepoMeta(meta))
      .catch(() => { if (active) { setRepoMeta(null); setMetaFailed(true) } })
    return () => { active = false }
  }, [owner, repository])

  return (
    <RepositoryLayout
      role={role}
      owner={owner}
      repository={repository}
      activeTab="Commits"
      isPrivate={repoMeta?.is_private}
    >
      <CommitHistory owner={owner} repository={repository} isEmptyRepo={metaFailed ? false : repoMeta ? !repoMeta.default_branch : null} />
    </RepositoryLayout>
  )
}
