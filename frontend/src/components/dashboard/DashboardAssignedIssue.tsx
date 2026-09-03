import { ClipboardList, ArrowRight } from "lucide-react"
import { Link } from "react-router-dom"

import type { AssignedIssueResponse } from "@/lib/interfaces"
import AssignedIssueItem from "@/components/profile/AssignedIssueItem"

type DashboardAssignedIssuesProps = {
  issues: AssignedIssueResponse[] | null
  error: string | null
}

export default function DashboardAssignedIssues({
  issues,
  error,
}: DashboardAssignedIssuesProps) {
  return (
    <section
      data-testid="assigned-issues"
      className="mt-10"
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="size-5 text-primary" />

            <h2 className="text-lg font-semibold">
              Assigned to you
            </h2>

            {issues && issues.length > 0 && (
              <span
                className="
                  rounded-full
                  bg-primary/10
                  px-2 py-0.5
                  text-xs
                  font-medium
                  text-primary
                "
              >
                {issues.length}
              </span>
            )}
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            Issues that need your attention.
          </p>
        </div>

        {issues && issues.length > 0 && (
          <Link
            to={`/users/${encodeURIComponent(
              // username will be supplied through URL below
              ""
            )}`}
            className="
              hidden
              items-center
              gap-1
              text-sm
              font-medium
              text-primary
              hover:underline
              sm:flex
            "
          >
            View all
            <ArrowRight className="size-4" />
          </Link>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Loading */}
      {!error && issues === null && (
        <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
          Loading assigned issues…
        </div>
      )}

      {/* Empty */}
      {!error && issues !== null && issues.length === 0 && (
        <div
          className="
            rounded-xl
            border
            bg-card
            px-6 py-8
            text-center
          "
        >
          <ClipboardList className="mx-auto size-8 text-muted-foreground/40" />

          <p className="mt-3 text-sm font-medium">
            You're all caught up
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            No issues are currently assigned to you.
          </p>
        </div>
      )}

      {/* Issues */}
      {issues !== null && issues.length > 0 && (
        <div className="overflow-hidden rounded-xl border bg-card">
          {issues.slice(0, 5).map((issue) => (
            <AssignedIssueItem
              key={`${issue.repository_id}-${issue.id}`}
              issue={issue}
            />
          ))}
        </div>
      )}

      {/* Show more */}
      {issues !== null && issues.length > 5 && (
        <p className="mt-2 text-right text-xs text-muted-foreground">
          Showing 5 of {issues.length} assigned issues
        </p>
      )}
    </section>
  )
}