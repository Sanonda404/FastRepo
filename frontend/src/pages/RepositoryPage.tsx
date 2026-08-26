import { useParams } from "react-router-dom"
import RepositoryLayout from "@/components/repository/RepositoryLayout"
import RepositoryCodePage from "@/pages/RepositoryCodePage"

export default function RepositoryPage() {
  const { owner = "jane", repository = "fastrepo" } = useParams()

  return (
    <RepositoryLayout owner={owner} repository={repository} activeTab="Code">
      <RepositoryCodePage />
    </RepositoryLayout>
  )
}
