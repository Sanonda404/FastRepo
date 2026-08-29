import { useMemo } from "react"

import { highlightedLines } from "@/lib/highlight"

export function CodeViewer({ code, filename }: { code: string; filename?: string }) {
  const lines = useMemo(
    () => highlightedLines(code.replace(/\r\n?/g, "\n"), filename ?? ""),
    [code, filename],
  )
  return (
    <pre className="overflow-x-auto p-4 text-sm leading-6">
      {lines.map((line, index) => (
        <code key={index} className="block">
          <span className="mr-5 inline-block w-6 select-none text-right text-muted-foreground/60">{index + 1}</span>
          <span dangerouslySetInnerHTML={{ __html: line || "\u00a0" }} />
        </code>
      ))}
    </pre>
  )
}
