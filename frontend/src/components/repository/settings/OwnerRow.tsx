import { Crown } from "lucide-react"

interface OwnerRowProps {
  username: string
}

export default function OwnerRow({
  username,
}: OwnerRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 bg-amber-500/[0.03] px-5 py-4">
      <div className="flex min-w-0 items-center gap-3">

        {/* Avatar */}
        <div
          className="
            flex size-10 shrink-0
            items-center justify-center
            rounded-full
            bg-amber-500/10
            font-semibold
            text-amber-600
          "
        >
          {username
            .charAt(0)
            .toUpperCase()}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold">
              {username}
            </p>

            <span
              className="
                inline-flex items-center gap-1.5
                rounded-full
                bg-amber-500/10
                px-2.5 py-1
                text-xs font-medium
                text-amber-600
              "
            >
              <Crown className="size-3.5" />
              Owner
            </span>
          </div>

          <p className="mt-0.5 text-xs text-muted-foreground">
            Repository owner
          </p>
        </div>
      </div>

      {/* Deliberately no actions */}
    </div>
  )
}