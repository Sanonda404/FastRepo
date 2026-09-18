import type { PullReview } from "@/lib/interfaces"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { REVIEW_DECISION_LABELS } from "@/lib/reviewDecision"

interface PullReviewItemProps {
  review: PullReview
  currentUsername: string
  onDeleteReview?: (reviewId: number) => Promise<void>
  isDeleting?: boolean
}

export default function PullReviewItem({
  review,
  currentUsername,
  onDeleteReview,
  isDeleting = false,
}: PullReviewItemProps) {
  const isAuthor = review.reviewer_username === currentUsername
  console.log(isAuthor, currentUsername, review.reviewer_username)

  const getDecisionBadge = (decision: PullReview["decision"]) => {
    const label = REVIEW_DECISION_LABELS[decision as keyof typeof REVIEW_DECISION_LABELS] ?? decision
    switch (decision) {
      case "APPROVED":
        return <Badge className="bg-emerald-600 hover:bg-emerald-700">{label}</Badge>
      case "REQUEST_CHANGES":
        return <Badge className="text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200 dark:border-amber-800">{label}</Badge>
      case "REJECTED":
        return <Badge variant="destructive">{label}</Badge>
      case "COMMENTED":
      default:
        return <Badge variant="secondary">{label}</Badge>
    }
  }

  return (
    <div className="rounded-lg p-4 space-y-2 bg-card text-card-foreground shadow-sm ring-1 ring-foreground/10">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="font-semibold text-sm truncate max-w-[180px]"
            title={review.reviewer_username ?? "Unregistered"}
          >
            {review.reviewer_username ?? "Unregistered"}
          </span>
          <div className="shrink-0">{getDecisionBadge(review.decision)}</div>
        </div>

        {isAuthor && onDeleteReview && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDeleteReview(review.id)}
            disabled={isDeleting}
            className="h-8 rounded-lg px-2 text-xs text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-600"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        )}
      </div>

      {review.body && (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap pt-1">
          {review.body}
        </p>
      )}
    </div>
  )
}