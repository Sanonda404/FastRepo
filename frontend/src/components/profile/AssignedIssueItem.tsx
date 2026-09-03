import { Link } from "react-router-dom"
import {
  CircleCheck,
  CircleDot,
  ChevronRight,
} from "lucide-react"

import { formatRelativeDate } from "@/lib/format-date"
import type { AssignedIssueResponse } from "@/lib/interfaces"

type AssignedIssueItemProps = {
  issue: AssignedIssueResponse
}

export default function AssignedIssueItem({
  issue,
}: AssignedIssueItemProps) {
  const isOpen = issue.state === "open"

  const href = `/${issue.repository_owner}/${issue.repository_name}/issues/${issue.number}`

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
      <div className="flex items-start gap-3">

        {/* Status */}
        <div className="pt-0.5">
          {isOpen ? (
            <CircleDot className="size-4 text-green-500" />
          ) : (
            <CircleCheck className="size-4 text-purple-500" />
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">

              {/* Repository */}
              <p className="mb-1 text-xs text-muted-foreground">
                {issue.repository_owner}/{issue.repository_name}
              </p>

              {/* Title */}
              <h3
                className="
                  truncate
                  text-sm
                  font-semibold
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

              {/* Metadata */}
              <p className="mt-1.5 text-xs text-muted-foreground">
                {isOpen ? "Opened" : "Closed"}{" "}
                {formatRelativeDate(
                  issue.closed_at ?? issue.created_at
                )}
                {" · "}
                by {issue.author_username}
              </p>

              {/* Labels */}
              {issue.labels?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {issue.labels.map((label) => (
                    <span
                      key={label.id}
                      className="
                        inline-flex
                        items-center
                        gap-1.5
                        rounded-full
                        px-2 py-0.5
                        text-xs
                        font-medium
                      "
                      style={{
                        color: label.color ?? "#6b7280",
                        backgroundColor: `${label.color ?? "#6b7280"}20`,
                      }}
                    >
                      <span
                        className="size-1.5 rounded-full"
                        style={{
                          backgroundColor:
                            label.color ?? "#6b7280",
                        }}
                      />

                      {label.name}
                    </span>
                  ))}
                </div>
              )}

            </div>

            <ChevronRight
              className="
                mt-1
                size-4
                shrink-0
                text-muted-foreground
                opacity-0
                transition-all
                group-hover:translate-x-0.5
                group-hover:opacity-100
              "
            />
          </div>

        </div>
      </div>
    </Link>
  )
}