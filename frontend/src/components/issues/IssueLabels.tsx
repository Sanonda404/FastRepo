type IssueLabel = {
  id: number | string
  name: string
  color?: string | null
}

type IssueLabelsProps = {
  labels?: IssueLabel[]
}

export default function IssueLabels({ labels = [] }: IssueLabelsProps) {
  if (!labels.length) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {labels.map((label) => (
        <span
          key={label.id}
          className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
          style={label.color ? { borderColor: label.color } : undefined}
        >
          {label.name}
        </span>
      ))}
    </div>
  )
}
