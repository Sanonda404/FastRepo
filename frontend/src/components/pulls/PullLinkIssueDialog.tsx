import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Issue } from "@/lib/interfaces"

interface PullLinkIssueDialogProps {
  availableIssues: Issue[]
  onSubmit: (issueId: number) => Promise<void>
  loading?: boolean
}

export default function PullLinkIssueDialog({
  availableIssues,
  onSubmit,
  loading = false,
}: PullLinkIssueDialogProps) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!selected) return
    setSubmitting(true)
    try {
      await onSubmit(Number(selected))
      setSelected("")
      setOpen(false)
    } catch (error) {
      console.error("Failed to link issue:", error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            className="rounded-lg text-xs"
          />
        }
      >
        Link issue
      </DialogTrigger>
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>Link issue to pull request</DialogTitle>
          <DialogDescription>
            {availableIssues.length === 0
              ? "No unlinked issues in this repository."
              : "Select an issue from this repository to link."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Select value={selected} onValueChange={(v) => setSelected(v ?? "")}>
            <SelectTrigger>
              <SelectValue placeholder="Select issue" />
            </SelectTrigger>
            <SelectContent>
              {availableIssues.map((issue) => (
                <SelectItem key={issue.id} value={String(issue.id)}>
                  #{issue.number} {issue.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !selected}
            >
              {submitting ? "Linking..." : "Link"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
