import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"

import RepositoryLayout from "@/components/repository/RepositoryLayout"
import CommitReport from "@/components/commit-report/CommitReport"
import { getRole, getRepository } from "@/lib/apis/repository_apis"
import type { RepositoryRole } from "@/lib/auth/permissions"
import { getErrorMessage } from "@/lib/apis/api"
import type { RepositoryResponse } from "@/lib/interfaces"

export default function RepositoryCommitReportPage() {
  const { owner = "", repository = "", sha = "" } = useParams()
  const [role, setRole] = useState<RepositoryRole>("Viewer")
  const [repoMeta, setRepoMeta] = useState<RepositoryResponse | null>(null)

  useEffect(() => {
    // our #file-i jumps manage scroll; stop the browser overriding them
    try { window.history.scrollRestoration = "manual" } catch { /* noop */ }
  }, [])

  useEffect(() => {
    document.title = `${owner}/${repository} · ${sha.slice(0, 7)} · FastRepo`
  }, [owner, repository, sha])

  useEffect(() => {
    getRole(owner, repository)
      .then(setRole)
      .catch((err) => console.log(getErrorMessage(err)))
  }, [owner, repository])

  useEffect(() => {
    let active = true
    getRepository(owner, repository)
      .then((meta) => active && setRepoMeta(meta))
      .catch(() => active && setRepoMeta(null))
    return () => { active = false }
  }, [owner, repository])

  return (
    <RepositoryLayout
      role={role}
      owner={owner}
      repository={repository}
      activeTab="Code"
      isPrivate={repoMeta?.is_private}
    >
      <CommitReport owner={owner} repository={repository} sha={sha} />
    </RepositoryLayout>
  )
}
