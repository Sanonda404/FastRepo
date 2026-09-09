import { useMemo } from "react"
import { ChevronDown, FileDiff as FileDiffIcon } from "lucide-react"
import type { FileChange } from "@/lib/interfaces"

type Props = {
  index: number
  file: FileChange
}

const MAX_LINES = 3000

type DiffLine =
  | { kind: "hunk"; text: string }
  | { kind: "add" | "del" | "ctx"; text: string }

function parseDiff(text: string): { lines: DiffLine[]; truncated: boolean } {
  const out: DiffLine[] = []
  for (const raw of text.split("\n")) {
    if (raw.startsWith("--- ") || raw.startsWith("+++ ")) continue
    if (out.length >= MAX_LINES) return { lines: out, truncated: true }
    if (raw.startsWith("@@")) out.push({ kind: "hunk", text: raw })
    else if (raw.startsWith("+")) out.push({ kind: "add", text: raw.slice(1) })
    else if (raw.startsWith("-")) out.push({ kind: "del", text: raw.slice(1) })
    else if (raw.startsWith(" ")) out.push({ kind: "ctx", text: raw.slice(1) })
    else if (raw === "") continue
    else out.push({ kind: "ctx", text: raw })
  }
  return { lines: out, truncated: false }
}

const STATUS_STYLE: Record<string, string> = {
  added: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  modified: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  deleted: "bg-red-500/10 text-red-700 dark:text-red-400",
  renamed: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  copied: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
}

export function fileAnchor(index: number): string {
  return `file-${index}`
}

export default function FileDiff({ index, file }: Props) {
  const parsed = useMemo(
    () => (file.diff ? parseDiff(file.diff) : null),
    [file.diff],
  )
  const title = file.old_path ? `${file.old_path} → ${file.path}` : file.path

  return (
    <details
      id={fileAnchor(index)}
      open
      className="scroll-mt-20 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10"
    >
      <summary
        className="flex cursor-pointer list-none flex-wrap items-center gap-2 px-4 py-3 hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden"
        aria-label={`${file.status}: ${title}`}
      >
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform [[open]_&]:-rotate-180" />
        <FileDiffIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate font-mono text-sm font-medium" title={title}>
          {title}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[file.status] ?? "bg-muted text-muted-foreground"}`}>
          {file.status}
        </span>
        <span className="font-mono text-xs text-muted-foreground">
          <span className="text-emerald-600 dark:text-emerald-400">+{file.additions}</span>
          {" "}
          <span className="text-red-600 dark:text-red-400">−{file.deletions}</span>
        </span>
      </summary>
      <div className="border-t border-foreground/10">
        {file.binary && (
          <p className="px-4 py-6 text-sm text-muted-foreground">Binary file not shown.</p>
        )}
        {!file.binary && parsed && parsed.lines.length === 0 && (
          <p className="px-4 py-6 text-sm text-muted-foreground">No content changes.</p>
        )}
        {!file.binary && parsed && parsed.lines.length > 0 && (
          <>
            <pre className="overflow-x-auto py-2 font-mono text-xs leading-5">
              {parsed.lines.map((line, i) =>
                line.kind === "hunk" ? (
                  <code key={i} className="block bg-sky-500/10 px-4 text-sky-700 dark:text-sky-400">{line.text}</code>
                ) : (
                  <code
                    key={i}
                    className={`block px-4 ${
                      line.kind === "add"
                        ? "bg-emerald-500/15 text-emerald-900 dark:text-emerald-200"
                        : line.kind === "del"
                          ? "bg-red-500/15 text-red-900 dark:text-red-200"
                          : "text-muted-foreground"
                    }`}
                  >
                    <span aria-hidden="true" className="mr-3 inline-block w-3 select-none opacity-60">
                      {line.kind === "add" ? "+" : line.kind === "del" ? "−" : " "}
                    </span>
                    {line.text || "\u00a0"}
                  </code>
                ),
              )}
            </pre>
            {parsed.truncated && (
              <p className="border-t border-foreground/10 px-4 py-2 text-xs text-muted-foreground">
                Diff truncated at {MAX_LINES} lines.
              </p>
            )}
          </>
        )}
      </div>
    </details>
  )
}
