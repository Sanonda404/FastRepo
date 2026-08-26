import IssueItem from "./IssueItem"
import type { Issue } from '@/lib/interfaces';

type IssueListProps = {
  issues: Issue[]
  owner: string
  repository: string
}

export default function IssueList({
  issues,
  owner,
  repository,
}: IssueListProps) {
  if (!issues.length) {
    return (
      <div className="px-5 py-14 text-center">
        <p className="font-medium">No issues found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Create an issue to start tracking work in this repository.
        </p>
      </div>
    )
  }

  return (
    <div>
      {issues.map((issue) => (
        <IssueItem
          key={issue.id}
          issue={issue}
          href={`/repositories/${owner}/${repository}/issues/${issue.id}`}
        />
      ))}
    </div>
  )
}
