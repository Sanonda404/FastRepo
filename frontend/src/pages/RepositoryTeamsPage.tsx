import { useParams } from "react-router-dom"
import RepositoryLayout from "@/components/repository/RepositoryLayout"

export default function RepositoryTeamsPage() {
  const { owner = "jane", repository = "fastrepo" } = useParams()

  return (
    <RepositoryLayout owner={owner} repository={repository} activeTab="Teams">
      <div className="rounded-xl bg-card ring-1 ring-foreground/10">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">Teams</h2>
          <p className="mt-1 text-sm text-muted-foreground">Manage team access to this repository.</p>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
{[
  ["Engineering", "12", "Write"],
  ["Backend", "6", "Maintain"],
  ["Frontend", "5", "Write"],
  ["QA", "4", "Read"],
].map(([name, members, access]) => (
  <div key={name} className="rounded-lg border p-4">
    <p className="font-medium">{name}</p>
    <p className="mt-1 text-xs text-muted-foreground">{members} members</p>
    <div className="mt-4 flex justify-between text-xs">
      <span className="text-muted-foreground">Repository access</span>
      <span className="rounded-full border px-2 py-1">{access}</span>
    </div>
  </div>
))}
</div>
      </div>
    </RepositoryLayout>
  )
}
