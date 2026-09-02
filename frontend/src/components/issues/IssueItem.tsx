import { useState } from "react"
import { Link } from "react-router-dom"
import { CircleCheck, CircleDot, Trash2 } from "lucide-react"

import IssueStatus from "./IssueStatus"
import IssueLabels from "./IssueLabels"
import IssueMetadata from "./IssueMetadata"
import IssueActivity from "./IssueActivity"

import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import type { Issue } from "@/lib/interfaces"
import { closeOrReopenIssue, deleteIssue } from "@/lib/apis/issue_apis"
import type { RepositoryRole } from "@/lib/auth/permissions"

type IssueItemProps = {
  issue: Issue
  href: string
  owner: string
  repoName: string
  currentUsername: string | null
  currentRole: RepositoryRole
  onIssueUpdated?: (issue: Issue) => void
  onIssueDeleted?: (issueId: number) => void
}

export default function IssueItem({
  issue,
  href,
  owner,
  repoName,
  currentUsername,
  currentRole,
  onIssueUpdated,
  onIssueDeleted,
}: IssueItemProps) {
  const isOpen = issue.state === "open"
  const isReopened = issue.state === "open" && !!issue.closed_at
  const isAssignee = !!currentUsername && issue.assignees.some((a) => a.username === currentUsername)
  const canClose =
    !!currentUsername &&
    (isAssignee || currentRole === "Owner" || currentRole === "Admin" || currentRole === "Maintainer")
  // Backend: author or can_access (owner or any collaborator). Mirror as author or Member+ (non-Viewer)
  const canDelete =
    !!currentUsername &&
    (issue.author_username === currentUsername ||
      currentRole === "Owner" ||
      currentRole === "Admin" ||
      currentRole === "Maintainer" ||
      currentRole === "Member")

  const handleToggleIssue = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    try {
      const updatedIssue = await closeOrReopenIssue(owner, repoName, issue.number)
      onIssueUpdated?.(updatedIssue)
    } catch (error) {
      console.error("Failed to update issue:", error)
    }
  }

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setConfirmDeleteOpen(true)
  }

  const handleConfirmDelete = async () => {
    setDeleting(true)
    try {
      await deleteIssue(owner, repoName, issue.number)
      onIssueDeleted?.(issue.id)
      setConfirmDeleteOpen(false)
    } catch (error) {
      console.error("Failed to delete issue:", error)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Link
        to={href}
        className="
          group block
          border-b border-foreground/10
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

            {/* Actions: Close/Reopen + Delete - gated */}
            {(canClose || canDelete) && (
              <div className="flex shrink-0 items-center gap-2">
                {canClose && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToggleIssue}
                    className="gap-1.5 rounded-full text-xs"
                    aria-label={isOpen ? "Close issue" : "Reopen issue"}
                  >
                    {isOpen ? (
                      <>
                        <CircleCheck className="size-3.5" />
                        Close
                      </>
                    ) : (
                      <>
                        <CircleDot className="size-3.5" />
                        Reopen
                      </>
                    )}
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDeleteClick}
                    className="gap-1.5 rounded-full text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Delete issue"
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </Button>
                )}
              </div>
            )}

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

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete issue?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-medium text-foreground">
                #{issue.number} {issue.title}
              </span>{" "}
              and all associated comments. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete issue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}