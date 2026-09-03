import { Link } from "react-router-dom"
import {
  CircleCheck,
  CircleDot,
  ChevronRight,
} from "lucide-react"

import type { AssignedIssueResponse } from "@/lib/interfaces"

type AssignedIssueItemProps = {
  issue: AssignedIssueResponse
}

function formatRelativeTime(date: string) {
  const diff = Date.now() - new Date(date).getTime()

  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 30) return `${days}d ago`

  return new Date(date).toLocaleDateString()
}

export default function AssignedIssueItem({
  issue,
}: AssignedIssueItemProps) {
  const isOpen = issue.state === "open"

  const href =
    `/${issue.repository_owner}` +
    `/${issue.repository_name}/issues/${issue.number}`

  return (
    <Link
      to={href}
      className="
        group flex items-center gap-3
        border-b border-foreground/10
        px-4 py-3.5
        transition-colors
        last:border-b-0
        hover:bg-muted/30
      "
    >
      {/* Status */}
      <div className="shrink-0">
        {isOpen ? (
          <CircleDot className="size-4 text-green-500" />
        ) : (
          <CircleCheck className="size-4 text-purple-500" />
        )}
      </div>

      {/* Main content */}
      <div className="min-w-0 flex-1">

        {/* Issue title */}
        <div className="flex items-center gap-2">
          <h3
            className="
              truncate
              text-sm
              font-medium
              text-foreground
              transition-colors
              group-hover:text-primary
            "
          >
            {issue.title}
          </h3>

          <span className="shrink-0 text-xs text-muted-foreground">
            #{issue.number}
          </span>
        </div>

        {/* Repository + time */}
        <p className="mt-1 text-xs text-muted-foreground">
          {issue.repository_owner}/{issue.repository_name}
          {" · "}
          {isOpen ? "opened" : "closed"}{" "}
          {formatRelativeTime(
            issue.closed_at ?? issue.created_at
          )}
        </p>

        {/* Labels */}
        {issue.labels?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {issue.labels.map((label) => {
              const color = label.color ?? "#6b7280"

              return (
                <span
                  key={label.id}
                  className="
                    inline-flex
                    items-center
                    gap-1
                    rounded-full
                    px-2 py-0.5
                    text-[11px]
                    font-medium
                  "
                  style={{
                    color,
                    backgroundColor: `${color}20`,
                  }}
                >
                  <span
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />

                  {label.name}
                </span>
              )
            })}
          </div>
        )}
      </div>

      {/* Arrow */}
      <ChevronRight
        className="
          size-4
          shrink-0
          text-muted-foreground
          opacity-0
          transition-all
          group-hover:translate-x-0.5
          group-hover:opacity-100
        "
      />
    </Link>
  )
}