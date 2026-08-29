import { useParams } from "react-router-dom"
import RepositoryLayout from "@/components/repository/RepositoryLayout"
import RepositoryCodePage from "@/pages/RepositoryCodePage"
import { getRole } from "@/lib/apis/repository_apis"
import type { RepositoryRole } from '../lib/auth/permissions';
import { useState, useEffect } from "react";

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

  return (
    <RepositoryLayout role={role} owner={owner} repository={repository} activeTab="Code">
      <RepositoryCodePage />
    </RepositoryLayout>
  )
}
