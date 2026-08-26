import { CircleDot } from "lucide-react"

type IssueStatusProps = {
  status: "open" | "closed"
}

export default function IssueStatus({ status }: IssueStatusProps) {
  const isOpen = status === "open"

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        isOpen
          ? "bg-green-500/10 text-green-700 dark:text-green-300"
          : "bg-muted text-muted-foreground"
      }`}
    >
      <CircleDot className="size-3.5" />
      {isOpen ? "Open" : "Closed"}
    </span>
  )
}
