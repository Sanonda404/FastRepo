import { useEffect, useMemo, useState } from "react"
import { FileCode2, Search } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { getErrorMessage } from "@/lib/apis/api"
import { listAllFilePaths } from "@/lib/apis/repository_apis"

type GoToFileDialogProps = {
  open: boolean
  owner: string
  repository: string
  branch: string
  onClose: () => void
  onSelect: (path: string) => void
}

export default function GoToFileDialog({
  open,
  owner,
  repository,
  branch,
  onClose,
  onSelect,
}: GoToFileDialogProps) {
  const [files, setFiles] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")

  useEffect(() => {
    if (!open) return
    let active = true
    listAllFilePaths(owner, repository, branch)
      .then((paths) => {
        if (!active) return
        setFiles(paths.sort())
        setError(null)
      })
      .catch((err) => {
        if (!active) return
        setError(getErrorMessage(err))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [open, owner, repository, branch])

  const handleClose = () => {
    setQuery("")
    onClose()
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return files
    return files.filter((path) => path.toLowerCase().includes(q))
  }, [files, query])

  const handleSelect = (path: string) => {
    onSelect(path)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Go to file</DialogTitle>
          <DialogDescription>
            Jump to any file in {owner}/{repository} on {branch}.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search files by name or path..."
            className="pl-9"
          />
        </div>

        {loading && (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading files…</p>
        )}

        {!loading && error && (
          <p className="py-8 text-center text-sm text-destructive">{error}</p>
        )}

        {!loading && !error && (
          <ul className="max-h-80 overflow-y-auto rounded-md ring-1 ring-foreground/10">
            {filtered.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-muted-foreground">
                No files found.
              </li>
            )}
            {filtered.map((path) => (
              <li key={path}>
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => handleSelect(path)}
                >
                  <FileCode2 className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{path}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
