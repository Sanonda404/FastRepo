const labelColors: Record<string, string> = {
  enhancement: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  permissions: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  feature: "bg-green-500/10 text-green-700 dark:text-green-300",
  teams: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  security: "bg-red-500/10 text-red-700 dark:text-red-300",
  documentation: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
}

export default function IssueLabel({ label }: { label: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
        labelColors[label] ?? "bg-muted text-muted-foreground"
      }`}
    >
      {label}
    </span>
  )
}
