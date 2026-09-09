import type { FileChange } from "@/lib/interfaces"
import { fileAnchor } from "./FileDiff"

type Props = {
  files: FileChange[]
}

function groupLabel(path: string): string {
  const i = path.lastIndexOf("/")
  return i < 0 ? "/" : path.slice(0, i)
}

export default function ChangedFilesSidebar({ files }: Props) {
  const jump = (index: number) => {
    const el = document.getElementById(fileAnchor(index))
    if (el) {
      const top = el.getBoundingClientRect().top + document.documentElement.scrollTop - 80
      document.body.scrollTop = top
      document.documentElement.scrollTop = top
    }
    window.history.replaceState(null, "", `#${fileAnchor(index)}`)
  }

  let lastGroup: string | null = null

  return (
    <nav aria-label="Changed files" className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <p className="border-b border-foreground/10 px-4 py-3 text-sm font-semibold">
        Changed files{" "}
        <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {files.length}
        </span>
      </p>
      <ul className="max-h-[70vh] overflow-y-auto py-1">
        {files.map((f, i) => {
          const group = groupLabel(f.path)
          const showGroup = group !== lastGroup
          lastGroup = group
          return (
            <li key={`${f.path}-${i}`}>
              {showGroup && (
                <p className="px-4 pb-0.5 pt-2 font-mono text-[11px] text-muted-foreground" aria-hidden="true">
                  {group}
                </p>
              )}
              <button
                type="button"
                onClick={() => jump(i)}
                title={f.old_path ? `${f.old_path} → ${f.path}` : f.path}
                className="flex w-full items-center gap-2 rounded-md px-4 py-1.5 text-left text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
              >
                <span
                  aria-hidden="true"
                  className={`size-2 shrink-0 rounded-full ${
                    f.status === "added"
                      ? "bg-emerald-500"
                      : f.status === "deleted"
                        ? "bg-red-500"
                        : f.status === "renamed" || f.status === "copied"
                          ? "bg-sky-500"
                          : "bg-amber-500"
                  }`}
                />
                <span className="min-w-0 flex-1 truncate font-mono text-xs">
                  {f.path.split("/").pop()}
                </span>
                <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                  <span className="text-emerald-600 dark:text-emerald-400">+{f.additions}</span>
                  {" "}
                  <span className="text-red-600 dark:text-red-400">−{f.deletions}</span>
                </span>
                <span className="sr-only">{f.status}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
