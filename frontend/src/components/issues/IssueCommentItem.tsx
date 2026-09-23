import { Trash2 } from "lucide-react"

import type {
  IssueCommentResponse,
} from "@/lib/interfaces"

import { formatRelativeDate } from "@/lib/format-date"

export function canDeleteIssueComment(
  role: string | null,
  username: string | null,
  commentAuthor: string,
  assigneeUsernames: string[],
): boolean {
  if (!username) return false
  if (username === commentAuthor) return true
  if (["Owner", "Admin", "Maintainer"].includes(role ?? "")) return true
  return assigneeUsernames.includes(username)
}

type Props = {
  comment: IssueCommentResponse
  disabled: boolean
  canDelete: boolean
  onDelete: (
    id: number
  ) => Promise<void>
}

export default function IssueCommentItem({
  comment,
  disabled,
  canDelete,
  onDelete,
}: Props) {
  return (
    <article className="
      group
      rounded-xl
      bg-background
      p-4
      ring-1 ring-foreground/10
      transition-colors
      hover:bg-muted/30
    ">
      <div className="
        flex
        items-start
        justify-between
        gap-4
      ">
        <div className="
          flex
          min-w-0
          items-center
          gap-3
        ">
          <div className="
            flex
            size-9
            shrink-0
            items-center
            justify-center
            rounded-full
            bg-primary/10
            text-xs
            font-bold
            text-primary
          ">
            {comment.author_username
              .charAt(0)
              .toUpperCase()}
          </div>

          <div className="min-w-0">
            <div className="
              flex
              flex-wrap
              items-center
              gap-2
            ">
              <span className="
                text-sm
                font-semibold
              ">
                {comment.author_username}
              </span>

              <span className="
                text-xs
                text-muted-foreground
              ">
                commented
              </span>
            </div>

            <p className="
              mt-0.5
              text-[11px]
              text-muted-foreground
            ">
              {formatRelativeDate(
                comment.created_at
              )}
            </p>
          </div>
        </div>

        {canDelete && (
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              onDelete(comment.id)
            }
            className="
              shrink-0
              rounded-lg
              p-1.5
              text-muted-foreground
              opacity-0
              transition-all
              group-hover:opacity-100
              hover:bg-destructive/10
              hover:text-destructive
              disabled:pointer-events-none
              disabled:opacity-30
            "
            title="Delete comment"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>

      <div className="
        mt-4
        rounded-xl
        bg-muted/30
        px-4 py-3
        ring-1 ring-foreground/10
        text-sm
        leading-6
        whitespace-pre-wrap
      ">
        {comment.body}
      </div>
    </article>
  )
}