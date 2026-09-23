import {Tag } from "lucide-react"

import type {
  IssueLabel,
} from "@/lib/interfaces"

import type {
  LabelInput,
} from "@/lib/schemas/issue"

import { useRepoPermissions } from "@/lib/auth/RepoPermissionManager"
import { useAuth } from "@/lib/auth/use-auth"

import IssueLabelDialog from "./IssueLabelDialog"
import IssueLabelItem from "./IssueLabelItem"
import IssueEmptyState from "./IssueEmptyState"

type Props = {
  labels: IssueLabel[]
  mutating: boolean
  isClosed?: boolean
  assigneeUsernames: string[]
  onAdd: (
    data: LabelInput
  ) => Promise<void>
  onRemove: (
    id: number
  ) => Promise<void>
}

export function canManageIssueLabels(
  role: string | null,
  username: string | null,
  assigneeUsernames: string[],
): boolean {
  if (!username) return false
  if (["Owner", "Admin", "Maintainer"].includes(role ?? "")) return true
  return assigneeUsernames.includes(username)
}

export default function IssueLabelsDisplay({
  labels,
  mutating,
  isClosed = false,
  assigneeUsernames,
  onAdd,
  onRemove,
}: Props) {
  const { username } = useAuth()
  const { role } = useRepoPermissions()
  const canManage = canManageIssueLabels(role, username, assigneeUsernames)
  return (
    <section className="
      overflow-hidden
      rounded-xl
      bg-card
      ring-1 ring-foreground/10
    ">
      <div className="
        flex
        items-center
        justify-between
        border-b border-foreground/10
        bg-muted/20
        px-5 py-4
      ">
        <div>
          <div className="
            flex
            items-center
            gap-2
          ">
            <Tag className="size-4" />

            <h2 className="
              text-sm
              font-semibold
            ">
              Labels
            </h2>
          </div>

          <p className="
            mt-1
            text-xs
            text-muted-foreground
          ">
            {labels.length === 0
              ? "No labels assigned"
              : `${labels.length} ${
                  labels.length === 1
                    ? "label"
                    : "labels"
                } assigned`}
          </p>
        </div>

        {!isClosed && canManage && (
          <IssueLabelDialog
            loading={mutating}
            onSubmit={onAdd}
          />
        )}
      </div>

      <div className="p-4">
        {labels.length === 0 ? (
          <IssueEmptyState
            icon={
              <Tag className="size-5" />
            }
            title="No labels"
            description="
              Add labels to organize and
              categorize this issue.
            "
          />
        ) : (
          <div className="space-y-2">
            {isClosed && labels.length > 0 && (
              <p className="mb-2 text-xs text-muted-foreground">
                Closed issue — labels are locked.
              </p>
            )}
            {labels.map((label) => (
              <IssueLabelItem
                key={label.id}
                label={label}
                disabled={mutating || isClosed}
                canRemove={canManage}
                onRemove={onRemove}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}