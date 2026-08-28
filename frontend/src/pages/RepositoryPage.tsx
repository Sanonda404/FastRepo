import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"

import RepositoryLayout from "@/components/repository/RepositoryLayout"
import RepositoryCodePage from "@/pages/RepositoryCodePage"
import { getRepository } from "@/lib/repository_apis"
import type { RepositoryResponse } from "@/lib/interfaces"

export default function RepositoryPage() {
  const { owner = "jane", repository = "fastrepo" } = useParams()
  const [repoMeta, setRepoMeta] = useState<RepositoryResponse | null>(null)

  useEffect(() => {
    let active = true
    getRepository(owner, repository)
      .then((meta) => active && setRepoMeta(meta))
      .catch(() => active && setRepoMeta(null))
    return () => { active = false }
  }, [owner, repository])

  return (
    <RepositoryLayout
      owner={owner}
      repository={repository}
      activeTab="Code"
      isPrivate={repoMeta?.is_private}
    >
      <RepositoryCodePage repoMeta={repoMeta} />
    </RepositoryLayout>
  )
}
