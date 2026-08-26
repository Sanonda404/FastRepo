import {
  GitPullRequest,
  MessageSquare,
} from "lucide-react"


type IssueActivityProps = {
  assignees?: string[]
  commentsCount?: number
  pullRequestsCount?: number
}

export default function IssueActivity({
  assignees = [],
  commentsCount = 0,
  pullRequestsCount = 0,
}: IssueActivityProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
      {assignees.length > 0 && (
        <span className="inline-flex items-center gap-1.5">
          <span className="flex -space-x-1">
            {assignees.slice(0, 3).map((assignee) => (
              <span
                key={assignee}
                title={assignee}
                className="flex size-6 items-center justify-center rounded-full border-2 border-card bg-primary text-[10px] font-semibold text-primary-foreground"
              >
                {assignee}
              </span>
            ))}
          </span>
          {assignees.length > 3 && `+${assignees.length - 3}`}
        </span>
      )}


      <span className="inline-flex items-center gap-1.5">
        <MessageSquare className="size-3.5" />
        {commentsCount} {commentsCount === 1 ? "comment" : "comments"}
      </span>

      <span className="inline-flex items-center gap-1.5">
        <GitPullRequest className="size-3.5" />
        {pullRequestsCount} {pullRequestsCount === 1 ? "PR" : "PRs"}
      </span>
    </div>
  )
}
