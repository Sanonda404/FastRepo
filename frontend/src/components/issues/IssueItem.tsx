import { Link } from "react-router-dom"
import { ChevronRight } from "lucide-react"
import IssueStatus from "./IssueStatus"
import IssueLabels from "./IssueLabels"
import IssueMetadata from "./IssueMetadata"
import IssueActivity from "./IssueActivity"
import type { Issue } from "@/lib/interfaces"

type IssueItemProps = {
  issue: Issue
  href: string
}

export default function IssueItem({ issue, href }: IssueItemProps) {
  return (
    <Link
      to={href}
      className="group block border-b border-foreground/10 px-5 py-5 last:border-b-0 transition-colors hover:bg-muted/40"
    >
      <div className="flex gap-4">
        <div className="pt-0.5">
          <IssueStatus status={issue.state} />
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-start gap-2">
            <h3 className="min-w-0 flex-1 font-semibold leading-6 group-hover:text-primary">
              {issue.title}
              <span className="ml-2 font-normal text-muted-foreground">
                #{issue.id}
              </span>
            </h3>

            <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </div>

          {issue.body && (
            <p className="line-clamp-2 max-w-3xl text-sm leading-5 text-muted-foreground">
              {issue.body}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <IssueLabels labels={issue.labels} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <IssueMetadata
              author={issue.author_username}
              createdAt={issue.created_at}
              closedAt={issue.closed_at}
            />

            <IssueActivity
              assignees={issue.assignees}
              commentsCount={issue.comments_count}
              pullRequestsCount={issue.pull_requests_count}
            />
          </div>
        </div>
      </div>
    </Link>
  )
}
