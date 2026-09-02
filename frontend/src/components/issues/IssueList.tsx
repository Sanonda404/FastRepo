import IssueItem from "./IssueItem"
import type { Issue } from "@/lib/interfaces"

type IssueListProps = {
  issues: Issue[]
  owner: string
  repository: string
  setIssues: React.Dispatch<React.SetStateAction<Issue[]>>
}

export default function IssueList({
  issues,
  owner,
  repository,
  setIssues,
}: IssueListProps) {
  if (!issues.length) {
    return (
      <div className="rounded-2xl border bg-card p-14 text-center shadow-sm">

        <div className="
          mx-auto
          flex
          size-12
          items-center
          justify-center
          rounded-2xl
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
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">

      {issues.map((issue) => (
        <IssueItem
          issue={issue}
          href={`/${owner}/${repository}/issues/${issue.number}`}
          owner={owner}
          repoName={repository}
          onIssueUpdated={(updatedIssue) => {
            setIssues((prev) =>
              prev.map((item) =>
                item.id === updatedIssue.id ? updatedIssue : item
              )
            )
          }}
          onIssueDeleted={(issueId) => {
            setIssues((prev) =>
              prev.filter((item) => item.id !== issueId)
            )
          }}
        />
      ))}

    </div>
  )
}