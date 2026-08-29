import { useParams } from "react-router-dom"
import RepositoryLayout from "@/components/repository/RepositoryLayout"
import IssueDetailsPage from "@/components/repository/issues/issue-details-page"

export default function RepositoryIssueDetails() {
  const { owner = "jane", repository = "fastrepo", issueId = "24" } = useParams()

  return (
    <RepositoryLayout
      role = 'Viewer'
      owner={owner}
      repository={repository}
      activeTab="Issues"
    >
      <IssueDetailsPage
        owner={owner}
        repository={repository}
        issueId={Number(issueId)}
      />
    </RepositoryLayout>
  )
}
