import { Clock3 } from "lucide-react"
import { formatRelativeDate } from "@/lib/format-date"

type IssueMetadataProps = {
  author: string
  createdAt: string
  closedAt?: string
}

export default function IssueMetadata({
  author,
  createdAt,
  closedAt,
}: IssueMetadataProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">{author}</span>
      <span>·</span>
      <span className="inline-flex items-center gap-1">
        <Clock3 className="size-3.5" />
        opened {formatRelativeDate(createdAt)}
      </span>

      {closedAt && (
        <>
          <span>·</span>
          <span>Closed At {formatRelativeDate(closedAt)}</span>
        </>
      )}
    </div>
  )
}
