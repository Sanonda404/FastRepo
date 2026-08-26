import { useParams } from "react-router-dom"
import RepositoryLayout from "@/components/repository/RepositoryLayout"

export default function RepositoryActivityPage() {
  const { owner = "jane", repository = "fastrepo" } = useParams()

  return (
    <RepositoryLayout owner={owner} repository={repository} activeTab="Activity">
      <div className="rounded-xl bg-card ring-1 ring-foreground/10">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">Activity</h2>
          <p className="mt-1 text-sm text-muted-foreground">Recent activity across this repository.</p>
        </div>
        <div className="divide-y">
{[
  ["maria pushed 3 commits to main", "12 minutes ago"],
  ["alex opened pull request #42", "1 hour ago"],
  ["jane opened issue #24", "3 hours ago"],
  ["jane pushed 1 commit to feature/teams", "Yesterday"],
].map(([text, time]) => (
  <div key={text} className="px-5 py-4">
    <p className="text-sm">{text}</p>
    <p className="mt-1 text-xs text-muted-foreground">{time}</p>
  </div>
))}
</div>
      </div>
    </RepositoryLayout>
  )
}
