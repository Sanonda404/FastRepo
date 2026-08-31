import { useParams } from "react-router-dom"
import RepositoryLayout from "@/components/repository/RepositoryLayout"
import type { RepositoryRole } from '../lib/auth/permissions';
import { useState, useEffect } from "react";
import { getRole } from "@/lib/apis/repository_apis";
import { getErrorMessage } from "@/lib/apis/api";

export default function RepositoryPullrequestsPage() {
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
    <RepositoryLayout role = {role} owner={owner} repository={repository} activeTab="Pull requests">
      <div className="rounded-xl bg-card ring-1 ring-foreground/10">
        <div className="border-b border-foreground/10 px-5 py-4">
          <h2 className="font-semibold">Pull requests</h2>
          <p className="mt-1 text-sm text-muted-foreground">Review and merge changes from contributors.</p>
        </div>
        <div className="divide-y divide-foreground/10">
{[
  ["42", "Add nested team permissions", "maria", "Open"],
  ["38", "Refactor repository navigation", "alex", "Open"],
  ["31", "Improve dark theme contrast", "jane", "Merged"],
].map(([id, title, author, status]) => (
  <div key={id} className="flex items-center gap-4 px-5 py-4">
    <span className="size-2 rounded-full bg-green-600" />
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
