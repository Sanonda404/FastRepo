import type { LucideIcon } from "lucide-react"

export interface Stat {
  label: string
  value: number
  icon: LucideIcon
}

function formatCount(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`
  return String(value)
}

export default function StatCard({ label, value, icon: Icon }: Stat) {
  return (
    <div className="flex items-center gap-4 rounded-xl bg-card p-5 ring-1 ring-foreground/10">
      <div className="flex size-11 items-center justify-center rounded-lg bg-muted text-foreground">
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-2xl font-bold leading-none">{formatCount(value)}</p>
        <p className="mt-1 text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}
