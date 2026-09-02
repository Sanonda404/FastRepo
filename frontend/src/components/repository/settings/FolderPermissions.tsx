import { useEffect, useState } from "react"
import { Folder, Plus, Trash2, Shield, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getAllTeams } from "@/lib/apis/team_apis"
import { listBranches, listAllFilePaths } from "@/lib/apis/repository_apis"
import { getPermissions, createPermission, deletePermission } from "@/lib/apis/permission_apis"
import type { Team } from "@/lib/interfaces"
import type { BranchResponse } from "@/lib/interfaces"
import type { PermissionResponse } from "@/lib/apis/permission_apis"
import { getErrorMessage } from "@/lib/apis/api"
import { useRepoPermissions } from "@/lib/auth/RepoPermissionManager"
import AddFolderPermissionDialog from "./AddFolderPermissionDialog"
import { toast } from "sonner"

interface Props {
  owner: string
  repository: string
}

function foldersFromPaths(paths: string[]): string[] {
  const set = new Set<string>()
  for (const p of paths) {
    const parts = p.split("/")
    for (let i = 1; i < parts.length; i++) {
      set.add(parts.slice(0, i).join("/"))
    }
  }
  return Array.from(set).sort()
}

export default function FolderPermissions({ owner, repository }: Props) {
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

  const [selectedBranch, setSelectedBranch] = useState<string>("")
  const [folders, setFolders] = useState<string[]>([])
  const [foldersLoading, setFoldersLoading] = useState(false)

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
      setPermissions(p.filter((x) => x.target_type === "folder"))
      if (b.length > 0) {
        const def = b.find((x) => x.is_default)?.name ?? b[0].name
        setSelectedBranch((prev) => prev || def)
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [owner, repository])

  useEffect(() => {
    if (!selectedBranch) return
    let active = true
    setFoldersLoading(true)
    listAllFilePaths(owner, repository, selectedBranch)
      .then((paths) => {
        if (!active) return
        setFolders(foldersFromPaths(paths))
      })
      .catch(() => {
        if (!active) return
        setFolders([])
      })
      .finally(() => {
        if (active) setFoldersLoading(false)
      })
    return () => {
      active = false
    }
  }, [owner, repository, selectedBranch])

  const handleCreate = async (data: { team_id: number; target_identifier: string; allow_write: boolean }) => {
    setActionLoading(true)
    try {
      const created = await createPermission(owner, repository, data.team_id, {
        target_type: "folder",
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
    return <div className="rounded-xl bg-card p-12 text-center text-sm text-muted-foreground ring-1 ring-foreground/10">Loading folder permissions...</div>
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Folder className="size-4" />
            </div>
            <h2 className="text-lg font-semibold">Folder permissions</h2>
          </div>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Control which teams can write to specific folders. Members without an explicit allow are denied by default.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setDialogOpen(true)} className="shrink-0 gap-2 bg-green-600 text-white hover:bg-green-700">
            <Plus className="size-4" />
            Add permission
          </Button>
        )}
        {!canManage && <p className="text-xs text-muted-foreground">Only owners and admins can manage folder permissions</p>}
      </div>

      {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

      <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Branch</span>
            <Select value={selectedBranch} onValueChange={(v) => setSelectedBranch(v ?? "")}>
              <SelectTrigger className="min-w-40">
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.name} value={b.name}>
                    {b.name} {b.is_default ? "(default)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <span className="text-xs text-muted-foreground">
            {foldersLoading ? "Loading folders..." : `${folders.length} folder${folders.length !== 1 ? "s" : ""} on ${selectedBranch || "—"}`}
          </span>
        </div>
        {!foldersLoading && folders.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {folders.map((f) => (
              <span key={f} className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                {f}
              </span>
            ))}
          </div>
        )}
        {!foldersLoading && folders.length === 0 && selectedBranch && (
          <p className="mt-3 text-xs text-muted-foreground">No folders on this branch — all files at root.</p>
        )}
      </div>

      <div className="overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-foreground/10">
        <div className="flex items-center justify-between border-b border-foreground/10 bg-muted/20 p-5">
          <h3 className="font-semibold flex items-center gap-2"><Shield className="size-4" /> Folder rules</h3>
          <span className="text-xs text-muted-foreground">{permissions.length} rule{permissions.length !== 1 ? "s" : ""}</span>
        </div>

        {permissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
              <Folder className="size-5 text-muted-foreground" />
            </div>
            <h3 className="mt-4 font-medium">No folder permissions</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">Members are denied by default. Add a rule to allow a team to write to a folder.</p>
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
                    <p className="text-sm font-medium truncate">{p.team_name} <span className="text-muted-foreground">→</span> {p.target_identifier || "/"}</p>
                    <p className="text-xs text-muted-foreground">{p.allow_write ? "Allow write" : "Deny write"} • folder</p>
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
        <p className="mt-1">Owner / Admin / Maintainer bypass folder checks. Members are allowed only if their team (or parent team) has an Allow rule matching the file path prefix. More specific folder paths take precedence; deny takes precedence over allow.</p>
      </div>

      <AddFolderPermissionDialog
        open={dialogOpen}
        teams={teams}
        branches={branches}
        owner={owner}
        repository={repository}
        loading={actionLoading}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleCreate}
      />
    </div>
  )
}
