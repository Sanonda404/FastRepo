import { useParams } from "react-router-dom"
import RepositoryLayout from "@/components/repository/RepositoryLayout"

export default function RepositoryIssuesPage() {
  const { owner = "jane", repository = "fastrepo" } = useParams()

  return (
    <RepositoryLayout owner={owner} repository={repository} activeTab="Issues">
      <div className="rounded-xl bg-card ring-1 ring-foreground/10">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">Issues</h2>
          <p className="mt-1 text-sm text-muted-foreground">Track bugs, improvements, and tasks for this repository.</p>
        </div>
        <div className="divide-y">
{[
  ["24", "Improve repository permissions UI", "alex", "Open"],
  ["21", "Add branch protection rules", "maria", "Open"],
  ["17", "Update README examples", "jane", "Closed"],
].map(([id, title, author, status]) => (
  <div key={id} className="flex items-center gap-4 px-5 py-4">
    <span className={`size-2 rounded-full ${status === "Open" ? "bg-green-600" : "bg-muted-foreground"}`} />
    <div className="min-w-0 flex-1">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">#{id} · opened by {author}</p>
    </div>
    <span className="text-xs text-muted-foreground">{status}</span>
  </div>
))}
</div>
      </div>
    </RepositoryLayout>
  )
}
