import { CheckCircle2, Clock3 } from "lucide-react"
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
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">

      <div className="flex items-center gap-2">

        <div className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
          {author.charAt(0).toUpperCase()}
        </div>

        <span className="font-semibold text-foreground">
          {author}
        </span>

      </div>

      <span className="text-border">•</span>

      <span className="inline-flex items-center gap-1.5">
        <Clock3 className="size-3.5" />
        opened {formatRelativeDate(createdAt)}
      </span>

      {closedAt && (
        <>
          <span className="text-border">•</span>

          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-3.5" />
            closed {formatRelativeDate(closedAt)}
          </span>
        </>
      )}

    </div>
  )
}