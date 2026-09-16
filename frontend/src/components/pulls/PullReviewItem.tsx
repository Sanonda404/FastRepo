import { Trash2 } from "lucide-react"

import type { PullReview } from "@/lib/interfaces"
import { formatRelativeDate } from "@/lib/format-date"

type Props = {
  review: PullReview
  disabled: boolean
  canDelete: boolean
  onDelete: (id: number) => Promise<void>
}

export default function PullReviewItem({ review, disabled, canDelete, onDelete }: Props) {
  return (
    <article className="group rounded-xl border border-foreground/10 bg-background p-4 transition-colors hover:bg-muted/30">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {(review.reviewer_username ?? "?").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{review.reviewer_username ?? "unknown"}</span>
              <span className="text-xs text-muted-foreground">reviewed</span>
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {formatRelativeDate(review.reviewed_at)}
            </p>
          </div>
        </div>

        {canDelete && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onDelete(review.id)}
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-30"
            title="Delete review"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-foreground/10 bg-muted/30 px-4 py-3">
        <p className="whitespace-pre-wrap text-sm">{review.body}</p>
      </div>
    </article>
  )
}
