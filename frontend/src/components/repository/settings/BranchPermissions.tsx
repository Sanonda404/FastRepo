import { useEffect, useState } from "react"
import { GitBranch, Plus, Trash2, Shield, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getAllTeams } from "@/lib/apis/team_apis"
import { listBranches } from "@/lib/apis/repository_apis"
import { getPermissions, createPermission, deletePermission } from "@/lib/apis/permission_apis"
import type { Team } from "@/lib/interfaces"
import type { BranchResponse } from "@/lib/interfaces"
import type { PermissionResponse } from "@/lib/apis/permission_apis"
import { getErrorMessage } from "@/lib/apis/api"
import { useRepoPermissions } from "@/lib/auth/RepoPermissionManager"
import AddBranchPermissionDialog from "./AddBranchPermissionDialog"
import { toast } from "sonner"

interface Props {
  owner: string
  repository: string
}

export default function BranchPermissions({ owner, repository }: Props) {
  const { role } = useRepoPermissions()
  const canManage = role === "Owner" || role === "Admin"

  const [teams, setTeams] = useState<Team[]>([])
  const [branches, setBranches] = useState<BranchResponse[]>([])
  const [permissions, setPermissions] = useState<PermissionResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [t, b, p] = await Promise.all([
        getAllTeams(owner, repository),
        listBranches(owner, repository).catch(() => [] as BranchResponse[]),
        getPermissions(owner, repository).catch(() => [] as PermissionResponse[]),
      ])
      setTeams(t)
      setBranches(b)
      // only branch type for this view
      setPermissions(p.filter((x) => x.target_type === "branch"))
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [owner, repository])

  const handleCreate = async (data: { team_id: number; target_identifier: string; allow_write: boolean }) => {
    setActionLoading(true)
    try {
      const created = await createPermission(owner, repository, data.team_id, {
        target_type: "branch",
        target_identifier: data.target_identifier,
        allow_write: data.allow_write,
      })
      setPermissions((prev) => [...prev, created])
      setDialogOpen(false)
      toast.success("Permission created")
    } catch (err) {
      toast.error(getErrorMessage(err))
      throw err
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    setDeleteId(id)
    try {
      await deletePermission(owner, repository, id)
      setPermissions((prev) => prev.filter((p) => p.id !== id))
      toast.success("Permission removed")
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setDeleteId(null)
    }
  }

  if (loading) {
    return <div className="rounded-xl bg-card p-12 text-center text-sm text-muted-foreground ring-1 ring-foreground/10">Loading branch permissions...</div>
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <GitBranch className="size-4" />
            </div>
            <h2 className="text-lg font-semibold">Branch permissions</h2>
          </div>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Control which teams can push to specific branches. Members without explicit allow are denied by default.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setDialogOpen(true)} className="shrink-0 gap-2 bg-green-600 text-white hover:bg-green-700">
            <Plus className="size-4" />
            Add permission
          </Button>
        )}
        {!canManage && <p className="text-xs text-muted-foreground">Only owners and admins can manage branch permissions</p>}
      </div>

      {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

      <div className="overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-foreground/10">
        <div className="flex items-center justify-between border-b border-foreground/10 bg-muted/20 p-5">
          <h3 className="font-semibold flex items-center gap-2"><Shield className="size-4" /> Branch rules</h3>
          <span className="text-xs text-muted-foreground">{permissions.length} rule{permissions.length !== 1 ? "s" : ""}</span>
        </div>

        {permissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
              <GitBranch className="size-5 text-muted-foreground" />
            </div>
            <h3 className="mt-4 font-medium">No branch permissions</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">Members are denied by default. Add a rule to allow a team to push to a branch.</p>
            {canManage && teams.length === 0 && (
              <p className="mt-3 text-xs text-muted-foreground">Create a team first on the Teams tab.</p>
            )}
            {canManage && teams.length > 0 && (
              <Button variant="outline" className="mt-5 gap-2" onClick={() => setDialogOpen(true)}>
                <Plus className="size-4" /> Add permission
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-foreground/10">
            {permissions.map((p) => (
              <div key={p.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Users className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.team_name} <span className="text-muted-foreground">→</span> {p.target_identifier}</p>
                    <p className="text-xs text-muted-foreground">{p.allow_write ? "Allow write" : "Deny write"} • {p.target_type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${p.allow_write ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"}`}>
                    {p.allow_write ? "Allow" : "Deny"}
                  </span>
                  {canManage && (
                    <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => handleDelete(p.id)} disabled={deleteId === p.id}>
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">How it works</p>
        <p className="mt-1">Owner / Admin / Maintainer bypass branch checks. Members are allowed only if their team (or parent team) has an <span className="font-medium">Allow</span> rule for that branch. Deny rules take precedence.</p>
      </div>

      <AddBranchPermissionDialog
        open={dialogOpen}
        teams={teams}
        branches={branches}
        loading={actionLoading}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleCreate}
      />
    </div>
  )
}
