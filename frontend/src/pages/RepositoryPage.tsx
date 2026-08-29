import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"

import RepositoryLayout from "@/components/repository/RepositoryLayout"
import RepositoryCodePage from "@/pages/RepositoryCodePage"
import { getRole } from "@/lib/apis/repository_apis"
import type { RepositoryRole } from '../lib/auth/permissions';
import { getErrorMessage } from "@/lib/apis/api"
import type { RepositoryResponse } from '../lib/interfaces';
import { getRepository } from "@/lib/apis/repository_apis"

export default function RepositoryPage() {
  const { owner = "jane", repository = "fastrepo" } = useParams()

  const [role, setRole] = useState<RepositoryRole>('Viewer')
  
    useEffect(() => {
      getRole(owner,repository).then((data) => {
  
          setRole(data)
        })
        .catch((err) => {
  
          console.log(getErrorMessage(err))
        })
    }, [owner, repository])

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
      role = {role}
      owner={owner}
      repository={repository}
      activeTab="Code"
      isPrivate={repoMeta?.is_private}
    >
      <RepositoryCodePage repoMeta={repoMeta} />
    </RepositoryLayout>
  )
}
