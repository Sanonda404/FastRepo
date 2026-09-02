import type { IssueLabel } from '../../lib/interfaces';

type IssueLabelsProps = {
  labels?: IssueLabel[]
  removable?: boolean
  onRemove?: (id: number | string) => void
}

export default function IssueLabels({
  labels = [],
  removable = false,
  onRemove,
}: IssueLabelsProps) {
  if (!labels.length) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {labels.map((label) => {
        const color = label.color || "#6b7280"

        return (
          <span
            key={label.id}
            className="group inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all hover:shadow-sm"
            style={{
              borderColor: `${color}55`,
              backgroundColor: `${color}12`,
              color,
            }}
          >
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: color }}
            />

            <span>{label.name}</span>

            {removable && onRemove && (
              <button
                type="button"
                onClick={() => onRemove(label.id)}
                className="ml-0.5 rounded-full p-0.5 opacity-50 transition-opacity hover:bg-black/10 hover:opacity-100"
                title={`Remove ${label.name}`}
              >
                <span className="sr-only">
                  Remove {label.name}
                </span>

                ×
              </button>
            )}
          </span>
        )
      })}
    </div>
  )
}