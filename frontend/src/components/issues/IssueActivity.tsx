import {
  GitPullRequest,
  MessageSquare,
  Users,
} from "lucide-react"

import type { IssueAssigneeResponse } from "@/lib/interfaces"

type IssueActivityProps = {
  assignees?: IssueAssigneeResponse[]
  commentsCount?: number
  pullRequestsCount?: number
}

export default function IssueActivity({
  assignees = [],
  commentsCount = 0,
  pullRequestsCount = 0,
}: IssueActivityProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">

      {assignees.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border bg-background px-2.5 py-1.5">

          <Users className="size-3.5 text-muted-foreground" />

          <div className="flex -space-x-1.5">
            {assignees.slice(0, 3).map((assignee) => (
              <div
                key={assignee.username}
                title={assignee.username}
                className="flex size-6 items-center justify-center rounded-full border-2 border-background bg-primary text-[9px] font-bold text-primary-foreground"
              >
                {assignee.username.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>

          {assignees.length > 3 && (
            <span className="text-xs font-medium text-muted-foreground">
              +{assignees.length - 3}
            </span>
          )}

        </div>
      )}

      <ActivityStat
        icon={<MessageSquare className="size-3.5" />}
        value={commentsCount}
        label="comments"
      />

      <ActivityStat
        icon={<GitPullRequest className="size-3.5" />}
        value={pullRequestsCount}
        label="PRs"
      />

    </div>
  )
}

function ActivityStat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode
  value: number
  label: string
}) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-xs">

      <span className="text-muted-foreground">
        {icon}
      </span>

      <span className="font-semibold text-foreground">
        {value}
      </span>

      <span className="text-muted-foreground">
        {label}
      </span>

    </div>
  )
}