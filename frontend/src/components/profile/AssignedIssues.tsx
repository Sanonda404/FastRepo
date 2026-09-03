import { ClipboardList } from "lucide-react"

import type { AssignedIssueResponse } from "@/lib/interfaces"
import AssignedIssueItem from "./AssignedIssueItem"

type AssignedIssuesProps = {
  issues: AssignedIssueResponse[] | null
  error: string | null
}

export default function AssignedIssues({
  issues,
  error,
}: AssignedIssuesProps) {
  return (
    <section className="mt-10">

      <div className="mb-4 flex items-center gap-2">
        <ClipboardList className="size-5 text-primary" />

        <h2 className="text-lg font-semibold">
          Assigned Issues
        </h2>

        {issues && issues.length > 0 && (
          <span
            className="
              rounded-full
              bg-muted
              px-2 py-0.5
              text-xs
              font-medium
              text-muted-foreground
            "
          >
            {issues.length}
          </span>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </p>
      )}

      {!error && issues === null && (
        <div className="rounded-xl bg-card p-6 text-sm text-muted-foreground ring-1 ring-foreground/10">
          Loading assigned issues…
        </div>
      )}

      {!error && issues !== null && issues.length === 0 && (
        <div
          className="
            rounded-xl
            bg-card
            px-6 py-10
            text-center
            ring-1 ring-foreground/10
          "
        >
          <ClipboardList className="mx-auto size-8 text-muted-foreground/50" />

          <p className="mt-3 text-sm font-medium">
            No assigned issues
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            Issues assigned to this user will appear here.
          </p>
        </div>
      )}

      {issues !== null && issues.length > 0 && (
        <div
          className="
            overflow-hidden
            rounded-xl
            bg-card
            ring-1 ring-foreground/10
          "
        >
          {issues.map((issue) => (
            <AssignedIssueItem
              key={`${issue.repository_id}-${issue.id}`}
              issue={issue}
            />
          ))}
        </div>
      )}

    </section>
  )
}