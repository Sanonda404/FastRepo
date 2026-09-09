import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { HasRole } from "@/components/guards/HasRole"
import { getErrorMessage } from "@/lib/apis/api"
import { listBranches, updateRepository } from "@/lib/apis/repository_apis"
import type { BranchResponse, RepositoryResponse } from "@/lib/interfaces"

interface DefaultBranchSettingsProps {
  owner: string
  repository: string
  currentDefaultBranch: string | null
  onUpdated: (repo: RepositoryResponse) => void
}

export default function DefaultBranchSettings({
  owner,
  repository,
  currentDefaultBranch,
  onUpdated,
}: DefaultBranchSettingsProps) {
  const [branches, setBranches] = useState<BranchResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(currentDefaultBranch ?? "")
  const [saving, setSaving] = useState(false)

  const refreshBranches = async () => {
    try {
      setBranches(await listBranches(owner, repository))
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    refreshBranches().finally(() => {
      if (active) setLoading(false)
    })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner, repository])

  useEffect(() => {
    setSelected(currentDefaultBranch ?? "")
  }, [currentDefaultBranch])

  const changed = selected !== "" && selected !== (currentDefaultBranch ?? "")

  const handleSave = async () => {
    if (!changed) return
    setSaving(true)
    try {
      const updated = await updateRepository(owner, repository, { default_branch: selected })
      onUpdated(updated)
      await refreshBranches()
      toast.success(`Default branch set to ${selected}`)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <HasRole roles={["Owner"]}>
      <section className="space-y-2" data-testid="default-branch-settings">
        <label htmlFor="default-branch" className="text-sm font-medium">
          Default branch
        </label>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading branches…</p>
        ) : branches.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No branches yet. Push a branch first, then choose the default here.
          </p>
        ) : (
          <div className="flex gap-2">
            <select
              id="default-branch"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="flex h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              {currentDefaultBranch === null && (
                <option value="">Select a branch…</option>
              )}
              {branches.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name}{b.is_default ? " (current default)" : ""}
                </option>
              ))}
            </select>
            <Button onClick={handleSave} disabled={!changed || saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          The branch used for clones and as the base for new work. Changing it updates HEAD.
        </p>
      </section>
    </HasRole>
  )
}
