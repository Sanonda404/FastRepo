import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import RepositoryLayout from "@/components/repository/RepositoryLayout"
import { getRepository, getRole } from "@/lib/apis/repository_apis"
import type { RepositoryResponse } from "@/lib/interfaces"
import type { RepositoryRole } from '../lib/auth/permissions';
import { getErrorMessage } from "@/lib/apis/api"

export default function RepositoryActivityPage() {
  const { owner = "jane", repository = "fastrepo" } = useParams()
  const [repoMeta, setRepoMeta] = useState<RepositoryResponse | null>(null)

  useEffect(() => {
    let active = true
    getRepository(owner, repository)
      .then((meta) => active && setRepoMeta(meta))
      .catch(() => active && setRepoMeta(null))
    return () => { active = false }
  }, [owner, repository])

  const branch = repoMeta?.default_branch || "main"

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
    <RepositoryLayout role = {role} owner={owner} repository={repository} activeTab="Activity">
      <div className="rounded-xl bg-card ring-1 ring-foreground/10">
        <div className="border-b border-foreground/10 px-5 py-4">
          <h2 className="font-semibold">Activity</h2>
          <p className="mt-1 text-sm text-muted-foreground">Recent activity across this repository.</p>
        </div>
        <div className="divide-y divide-foreground/10">
{[
  [`maria pushed 3 commits to ${branch}`, "12 minutes ago"],
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