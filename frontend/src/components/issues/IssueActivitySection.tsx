import {
  MessageCircle,
} from "lucide-react"

import type {
  Issue,
  IssueCommentResponse,
} from "@/lib/interfaces"

import IssueActivity from "@/components/issues/IssueActivity"

import IssueCommentItem from "./IssueCommentItem"
import IssueCommentDialog from "./IssueCommentDialog"
import IssueEmptyState from "./IssueEmptyState"

type Props = {
  issue: Issue
  comments: IssueCommentResponse[]
  commentsLoading: boolean
  commentsError: string | null
  mutating: boolean
  onCreateComment: (
    data: {
      body: string
    }
  ) => Promise<void>
  onDeleteComment: (
    id: number
  ) => Promise<void>
}

export default function IssueActivitySection({
  issue,
  comments,
  commentsLoading,
  commentsError,
  mutating,
  onCreateComment,
  onDeleteComment,
}: Props) {
  return (
    <section className="
      overflow-hidden
      rounded-2xl
      border
      bg-card
      shadow-sm
    ">
      <div className="
        flex
        flex-wrap
        items-center
        justify-between
        gap-3
        border-b
        bg-muted/20
        px-6 py-4
      ">
        <div className="
          flex
          items-center
          gap-2
        ">
          <MessageCircle className="
            size-4
            text-primary
          " />

          <h2 className="font-semibold">
            Activity
          </h2>
        </div>

        <IssueActivity
          assignees={issue.assignees}
          commentsCount={
            issue.comments_count
          }
          pullRequestsCount={
            issue.pull_requests_count
          }
        />
      </div>

      <div className="p-6">
        <div className="
          mb-5
          flex
          items-center
          justify-between
          gap-3
        ">
          <div>
            <h3 className="text-sm font-semibold">
              Discussion
            </h3>

            <p className="
              mt-0.5
              text-xs
              text-muted-foreground
            ">
              {comments.length === 0
                ? "Start the conversation"
                : `${comments.length} ${
                    comments.length === 1
                      ? "comment"
                      : "comments"
                  }`}
            </p>
          </div>

          {/* Anyone can comment */}
          <IssueCommentDialog
            loading={mutating}
            onSubmit={
              onCreateComment
            }
          />
        </div>

        {commentsError && (
          <div className="
            mb-4
            rounded-xl
            border
            border-destructive/30
            bg-destructive/10
            px-4 py-3
            text-sm
            text-destructive
          ">
            {commentsError}
          </div>
        )}

        {commentsLoading ? (
          <div className="
            rounded-xl
            border
            border-dashed
            p-8
            text-center
            text-sm
            text-muted-foreground
          ">
            Loading discussion...
          </div>
        ) : comments.length === 0 ? (
          <IssueEmptyState
            title="No comments yet"
            description="
              Start a discussion to share context,
              progress, or questions about this issue.
            "
            icon={
              <MessageCircle className="size-5" />
            }
          />
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <IssueCommentItem
                key={comment.id}
                comment={comment}
                disabled={mutating}
                onDelete={
                  onDeleteComment
                }
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}