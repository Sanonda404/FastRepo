import { X } from "lucide-react"

import type {
  IssueLabel,
} from "@/lib/interfaces"

import { HasRole } from "@/components/guards/HasRole"

type Props = {
  label: IssueLabel
  disabled: boolean
  onRemove: (
    id: number
  ) => Promise<void>
}

export default function IssueLabelItem({
  label,
  disabled,
  onRemove,
}: Props) {
  const color =
    label.color || "#6b7280"

  return (
    <div className="
      group
      flex
      items-center
      justify-between
      gap-3
      rounded-xl
      border
      bg-background
      px-3 py-2.5
      transition-all
      hover:border-primary/20
      hover:shadow-sm
    ">
      <div className="
        flex
        min-w-0
        items-center
        gap-3
      ">
        {/* Vibrant color indicator */}
        <span
          className="
            size-3.5
            shrink-0
            rounded-full
          "
          style={{
            backgroundColor: color,
            boxShadow: `
              0 0 0 3px ${color}30,
              0 2px 8px ${color}55
            `,
          }}
        />

        <span
          className="
            truncate
            rounded-full
            px-3 py-1
            text-xs
            font-semibold
          "
          style={{
            color,
            backgroundColor: `${color}25`,
            border: `1px solid ${color}70`,
          }}
        >
          {label.name}
        </span>
      </div>

      <HasRole
        roles={[
          "Owner",
          "Admin",
          "Maintainer",
        ]}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            onRemove(label.id)
          }
          className="
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
          title="Remove label"
        >
          <X className="size-4" />
        </button>
      </HasRole>
    </div>
  )
}