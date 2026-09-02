import IssueItem from "./IssueItem"
import type { Issue } from "@/lib/interfaces"
import type { RepositoryRole } from "@/lib/auth/permissions"

type IssueListProps = {
  issues: Issue[]
  owner: string
  repository: string
  currentUsername: string | null
  currentRole: RepositoryRole
  setIssues: React.Dispatch<React.SetStateAction<Issue[]>>
}

export default function IssueList({
  issues,
  owner,
  repository,
  currentUsername,
  currentRole,
  setIssues,
}: IssueListProps) {
  if (!issues.length) {
    return (
      <div className="m-4 rounded-xl border border-dashed border-foreground/10 bg-muted/10 p-14 text-center">

        <div className="
          mx-auto
          flex
          size-12
          items-center
          justify-center
          rounded-xl
          bg-muted
        ">
          <span className="text-xl">
            ◌
          </span>
        </div>

        <h3 className="mt-4 font-semibold">
          No issues yet
        </h3>

        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          Create an issue to start tracking bugs,
          tasks, and ideas in this repository.
        </p>

      </div>
    )
  }

  return (
    <div className="overflow-hidden">

      {issues.map((issue) => (
        <IssueItem
          key={issue.id}
          issue={issue}
          href={`/${owner}/${repository}/issues/${issue.number}`}
          owner={owner}
          repoName={repository}
          currentUsername={currentUsername}
          currentRole={currentRole}
          onIssueUpdated={(updatedIssue) => {
            setIssues((prev) =>
              prev.map((item) =>
                item.id === updatedIssue.id ? updatedIssue : item
              )
            )
          }}
          onIssueDeleted={(issueId) => {
            setIssues((prev) => prev.filter((item) => item.id !== issueId))
          }}
        />
      ))}

    </div>
  )
}