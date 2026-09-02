import { useParams } from "react-router-dom"
import RepositoryLayout from "@/components/repository/RepositoryLayout"
import IssueDetailsPage from "@/components/issues/issue-details-page"
import { RepoPermissionProvider } from "@/components/context/RepoPermissionContext"
import { getRole } from "@/lib/apis/repository_apis"
import { useState, useEffect } from "react"
import { getErrorMessage } from "@/lib/apis/api"
import type { RepositoryRole } from "@/lib/auth/permissions"
import type { CollaboratorResponse } from '@/lib/interfaces';
import { getCollaborators } from "@/lib/apis/repository_collaborator_apis"

export default function RepositoryIssueDetails() {
  const { owner = "jane", repository = "fastrepo", issueNumber = "24" } = useParams()
  const [role, setRole] = useState<RepositoryRole>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [collaborators, setCollaborators] = useState<CollaboratorResponse[]>([])

  useEffect(() => {
      if (!owner || !repository) return
  
      let active = true
  
        getRole(owner, repository)
        .then((data) => {
          if (!active) return
  
          setRole(data)
          setLoading(false)
        })
        .catch((err) => {
          if (!active) return
  
          setError(getErrorMessage(err))
          setLoading(false)
        })
  
      return () => {
        active = false
      }
    }, [owner, repository])
  
    useEffect(() => {
    if (!owner || !repository) return

    let active = true

    getCollaborators(owner, repository)
      .then((data) => {
        if (!active) return

        setCollaborators(data)
        setLoading(false)
      })
      .catch((err) => {
        if (!active) return

        setError(getErrorMessage(err))
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [owner, repository])

  return (
    <RepositoryLayout
      role = {role??"Viewer"}
      owner={owner}
      repository={repository}
      activeTab="Issues"
    >
      <RepoPermissionProvider role = {role??"Viewer"}>
      <IssueDetailsPage
        owner={owner}
        repository={repository}
        issueNumber={Number(issueNumber)}
        collaborators = {collaborators}
      /></RepoPermissionProvider>
    </RepositoryLayout>
  )
}
