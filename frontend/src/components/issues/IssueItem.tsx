import { Link } from "react-router-dom"
import {
  MoreHorizontal,
  GitPullRequest,
  Trash2,
  CircleCheck,
  CircleDot,
} from "lucide-react"

import IssueStatus from "./IssueStatus"
import IssueLabels from "./IssueLabels"
import IssueMetadata from "./IssueMetadata"
import IssueActivity from "./IssueActivity"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import type { Issue } from "@/lib/interfaces"
import { deleteIssue, closeOrReopenIssue } from "@/lib/apis/issue_apis"

type IssueItemProps = {
  issue: Issue
  href: string
  owner: string
  repoName: string
  onIssueUpdated?: (issue: Issue) => void
  onIssueDeleted?: (issueId: number) => void
}

export default function IssueItem({
  issue,
  href,
  owner,
  repoName,
  onIssueUpdated,
  onIssueDeleted,
}: IssueItemProps) {
  const isOpen = issue.state === "open"
  const isReopened = issue.state === "open" && !!issue.closed_at

  const handleToggleIssue = async (
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    e.preventDefault()
    e.stopPropagation()

    try {
      const updatedIssue = await closeOrReopenIssue(
        owner,
        repoName,
        issue.number
      )

      onIssueUpdated?.(updatedIssue)
    } catch (error) {
      console.error("Failed to update issue:", error)
    }
  }

  const handleDeleteIssue = async (
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    e.preventDefault()
    e.stopPropagation()

    const confirmed = window.confirm(
      `Are you sure you want to delete issue #${issue.number}?`
    )

    if (!confirmed) return

    try {
      await deleteIssue(owner, repoName, issue.number)

      onIssueDeleted?.(issue.number)
    } catch (error) {
      console.error("Failed to delete issue:", error)
    }
  }

  const handleOpenPullRequest = (
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    e.preventDefault()
    e.stopPropagation()

    // TODO: Implement "Open pull request" functionality
  }

  return (
    <Link
      to={href}
      className="
        group block
        border-b border-border/60
        px-5 py-4
        transition-colors
        last:border-b-0
        hover:bg-muted/30
      "
    >
      <div className="flex gap-4">

        {/* Status */}
        <div className="pt-1">
          <IssueStatus
            status={issue.state}
            reopened={isReopened}
          />
        </div>

        {/* Main */}
        <div className="min-w-0 flex-1">

          {/* Top row */}
          <div className="flex items-start gap-3">

            <div className="min-w-0 flex-1">

              {/* Title */}
              <h3
                className="
                  truncate
                  text-[15px]
                  font-semibold
                  tracking-tight
                  text-foreground
                  transition-colors
                  group-hover:text-primary
                "
              >
                {issue.title}

                <span className="ml-2 font-normal text-muted-foreground">
                  #{issue.number}
                </span>
              </h3>

              {/* Body */}
              {issue.body && (
                <p
                  className="
                    mt-1.5
                    line-clamp-2
                    max-w-3xl
                    text-sm
                    leading-5
                    text-muted-foreground
                  "
                >
                  {issue.body}
                </p>
              )}

            </div>

            {/* Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  className="
                    flex size-8
                    shrink-0
                    items-center
                    justify-center
                    rounded-md
                    text-muted-foreground
                    opacity-0
                    transition-all
                    hover:bg-muted
                    hover:text-foreground
                    group-hover:opacity-100
                    focus:opacity-100
                    focus:outline-none
                    focus:ring-2
                    focus:ring-ring
                  "
                  aria-label="Issue actions"
                >
                  <MoreHorizontal className="size-4" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                className="w-48"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
              >
                {/* Close / Reopen */}
                <DropdownMenuItem onClick={handleToggleIssue}>
                  {isOpen ? (
                    <>
                      <CircleCheck className="mr-2 size-4" />
                      Close issue
                    </>
                  ) : (
                    <>
                      <CircleDot className="mr-2 size-4" />
                      Reopen issue
                    </>
                  )}
                </DropdownMenuItem>

                {/* Open Pull Request */}
                <DropdownMenuItem onClick={handleOpenPullRequest}>
                  <GitPullRequest className="mr-2 size-4" />
                  Open pull request
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Delete */}
                <DropdownMenuItem
                  onClick={handleDeleteIssue}
                  className="
                    text-destructive
                    focus:bg-destructive/10
                    focus:text-destructive
                  "
                >
                  <Trash2 className="mr-2 size-4" />
                  Delete issue
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

          </div>

          {/* Labels */}
          {issue.labels.length > 0 && (
            <div className="mt-3">
              <IssueLabels labels={issue.labels} />
            </div>
          )}

          {/* Bottom metadata */}
          <div
            className="
              mt-4
              flex
              flex-wrap
              items-center
              justify-between
              gap-3
            "
          >
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