import { useMemo } from "react"

type Props = {
  page: number
  totalPages: number
  onPage: (page: number) => void
}

export function pageItems(page: number, totalPages: number): (number | "…")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
  if (page <= 4) return [1, 2, 3, 4, 5, "…", totalPages]
  if (page >= totalPages - 3) return [1, "…", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
  return [1, "…", page - 1, page, page + 1, "…", totalPages]
}

const buttonClass =
  "flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"

export default function CommitPagination({ page, totalPages, onPage }: Props) {
  const items = useMemo(() => pageItems(page, totalPages), [page, totalPages])
  if (totalPages <= 1) return null
  return (
    <nav aria-label="Commit history pages" className="flex flex-wrap items-center justify-center gap-1 py-4">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        aria-label="Previous page"
        className={`${buttonClass} border border-foreground/10 hover:bg-muted`}
      >
        <span aria-hidden="true" className="sm:hidden">←</span>
        <span className="hidden sm:inline">← Previous</span>
      </button>
      {items.map((item, i) =>
        item === "…" ? (
          <span key={`gap-${i}`} aria-hidden="true" className="px-1 text-sm text-muted-foreground">…</span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onPage(item)}
            aria-current={item === page ? "page" : undefined}
            aria-label={`Page ${item}`}
            className={`${buttonClass} ${item === page ? "bg-primary font-semibold text-primary-foreground" : "hover:bg-muted"}`}
          >
            {item}
          </button>
        ),
      )}
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        aria-label="Next page"
        className={`${buttonClass} border border-foreground/10 hover:bg-muted`}
      >
        <span aria-hidden="true" className="sm:hidden">→</span>
        <span className="hidden sm:inline">Next →</span>
      </button>
    </nav>
  )
}
