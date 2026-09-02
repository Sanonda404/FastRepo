import { CircleCheck, CircleDot, RotateCcw } from "lucide-react"

type IssueStatusProps = {
  status: "open" | "closed"
  reopened?: boolean
}

export default function IssueStatus({
  status,
  reopened = false,
}: IssueStatusProps) {
  if (reopened) {
    return (
      <div className="flex items-center gap-1.5 text-blue-500">
        <RotateCcw className="size-4" />
        <span className="text-sm font-medium">Reopened</span>
      </div>
    )
  }

  if (status === "closed") {
    return (
      <div className="flex items-center gap-1.5 text-purple-500">
        <CircleCheck className="size-4" />
        <span className="text-sm font-medium">Closed</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 text-green-500">
      <CircleDot className="size-4" />
      <span className="text-sm font-medium">Open</span>
    </div>
  )
}