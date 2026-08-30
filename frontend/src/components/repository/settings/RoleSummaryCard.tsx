import type { LucideIcon } from "lucide-react"

interface RoleSummaryCardProps {
  label: string
  count: number
  icon: LucideIcon
}

export default function RoleSummaryCard({
  label,
  count,
  icon: Icon,
}: RoleSummaryCardProps) {
  return (
    <div className="rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-4 text-muted-foreground" />
        </div>

        <span className="text-2xl font-semibold">
          {count}
        </span>
      </div>

      <p className="mt-3 text-xs font-medium text-muted-foreground">
        {label}
      </p>
    </div>
  )
}