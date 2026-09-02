import {Tag } from "lucide-react"

import type {
  IssueLabel,
} from "@/lib/interfaces"

import type {
  LabelInput,
} from "@/lib/schemas/issue"

import { HasRole } from "@/components/guards/HasRole"

import IssueLabelDialog from "./IssueLabelDialog"
import IssueLabelItem from "./IssueLabelItem"
import IssueEmptyState from "./IssueEmptyState"

type Props = {
  labels: IssueLabel[]
  mutating: boolean
  onAdd: (
    data: LabelInput
  ) => Promise<void>
  onRemove: (
    id: number
  ) => Promise<void>
}

export default function IssueLabelsDisplay({
  labels,
  mutating,
  onAdd,
  onRemove,
}: Props) {
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

        <HasRole
          roles={[
            "Owner",
            "Admin",
            "Maintainer",
          ]}
        >
          <IssueLabelDialog
            loading={mutating}
            onSubmit={onAdd}
          />
        </HasRole>
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
            {labels.map((label) => (
              <IssueLabelItem
                key={label.id}
                label={label}
                disabled={mutating}
                onRemove={onRemove}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}