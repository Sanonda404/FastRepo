export const REVIEW_DECISION_LABELS = {
  APPROVED: "Approved",
  REQUEST_CHANGES: "Request Changes",
  COMMENTED: "Comment",
  REJECTED: "Rejected",
} as const

export type ReviewDecision = keyof typeof REVIEW_DECISION_LABELS

export function getReviewDecisionLabel(decision: string): string {
  return (REVIEW_DECISION_LABELS as Record<string, string>)[decision] ?? decision
}
