import { MoreHorizontal } from "lucide-react"
import type { MockComment } from "./mock-issues"

export default function IssueComment({
  comment,
}: {
  comment: MockComment
}) {
  return (
    <article className="rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <div className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {comment.author.charAt(0).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <span className="text-sm font-semibold">{comment.author}</span>
          <span className="ml-2 text-xs text-muted-foreground">
            commented {comment.createdAt}
          </span>
        </div>

        <button
          type="button"
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Comment actions"
        >
          <MoreHorizontal className="size-4" />
        </button>
      </div>

      <div className="whitespace-pre-wrap px-4 py-4 text-sm leading-6">
        {comment.body}
      </div>
    </article>
  )
}
