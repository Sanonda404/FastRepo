import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ChevronRight, ChevronDown, Folder, FolderOpen, Check } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { Team, BranchResponse } from "@/lib/interfaces"
import { listAllFilePaths } from "@/lib/apis/repository_apis"

const schema = z.object({
  team_id: z.number().int().positive("Team is required"),
  target_identifier: z.string().min(1, "Folder path required").max(255),
  allow_write: z.boolean(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  teams: Team[]
  branches: BranchResponse[]
  owner: string
  repository: string
  loading: boolean
  onClose: () => void
  onSubmit: (data: FormValues) => Promise<void>
}

interface TreeNode {
  name: string
  path: string
  children: Record<string, TreeNode>
}

// Convert flat paths into a nested tree structure
function buildFolderTree(paths: string[]): TreeNode {
  const root: TreeNode = { name: "", path: "", children: {} }
  for (const path of paths) {
    const parts = path.split("/")
    let current = root
    let currentPath = ""
    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part
      if (!current.children[part]) {
        current.children[part] = { name: part, path: currentPath, children: {} }
      }
      current = current.children[part]
    }
  }
  return root
}

function foldersFromPaths(paths: string[]): string[] {
  const set = new Set<string>()
  for (const p of paths) {
    const parts = p.split("/")
    for (let i = 1; i < parts.length; i++) set.add(parts.slice(0, i).join("/"))
  }
  return Array.from(set).sort()
}

function FolderTreeNode({
  node,
  selectedPath,
  onSelect,
}: {
  node: TreeNode
  selectedPath: string
  onSelect: (path: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const hasChildren = Object.keys(node.children).length > 0
  const isSelected = selectedPath === node.path

  return (
    <div className="pl-3">
      <div
        className={cn(
          "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-accent transition-colors",
          isSelected && "bg-primary/10 text-primary font-medium"
        )}
        onClick={() => onSelect(node.path)}
      >
        {hasChildren ? (
          <button
            type="button"
            className="p-0.5 hover:bg-muted rounded text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation()
              setIsOpen(!isOpen)
            }}
          >
            {isOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          </button>
        ) : (
          <span className="w-4" />
        )}

        {isOpen ? (
          <FolderOpen className="size-4 text-amber-500 shrink-0" />
        ) : (
          <Folder className="size-4 text-amber-500 shrink-0" />
        )}

        <span className="truncate flex-1">{node.name}</span>

        {isSelected && <Check className="size-3.5 text-primary shrink-0" />}
      </div>

      {isOpen && hasChildren && (
        <div className="border-l border-border/50 ml-2">
          {Object.values(node.children).map((child) => (
            <FolderTreeNode
              key={child.path}
              node={child}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function FolderTreePicker({
  paths,
  selectedPath,
  onSelect,
}: {
  paths: string[]
  selectedPath: string
  onSelect: (path: string) => void
}) {
  const tree = buildFolderTree(paths)

  return (
    <div className="max-h-52 overflow-y-auto rounded-md border border-input bg-background p-2 shadow-inner">
      <div
        className={cn(
          "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-accent transition-colors",
          selectedPath === "/" && "bg-primary/10 text-primary font-medium"
        )}
        onClick={() => onSelect("/")}
      >
        <Folder className="size-4 text-amber-500 shrink-0" />
        <span className="truncate flex-1">/ (Root Directory)</span>
        {selectedPath === "/" && <Check className="size-3.5 text-primary shrink-0" />}
      </div>

      {Object.values(tree.children).map((child) => (
        <FolderTreeNode
          key={child.path}
          node={child}
          selectedPath={selectedPath}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}

export default function AddFolderPermissionDialog({ open, teams, branches, owner, repository, loading, onClose, onSubmit }: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { team_id: 0, target_identifier: "", allow_write: true },
  })

  const [branch, setBranch] = useState<string>(branches.find((b) => b.is_default)?.name ?? branches[0]?.name ?? "")
  const [folders, setFolders] = useState<string[]>([])
  const [foldersLoading, setFoldersLoading] = useState(false)

  useEffect(() => {
    if (!open) {
      form.reset({ team_id: 0, target_identifier: "", allow_write: true })
      return
    }
    const def = branches.find((b) => b.is_default)?.name ?? branches[0]?.name ?? ""
    setBranch(def)
  }, [open, form, branches])

  useEffect(() => {
    if (!open || !branch) {
      setFolders([])
      return
    }
    let active = true
    setFoldersLoading(true)
    listAllFilePaths(owner, repository, branch)
      .then((paths) => {
        if (!active) return
        setFolders(foldersFromPaths(paths))
      })
      .catch(() => {
        if (active) setFolders([])
      })
      .finally(() => {
        if (active) setFoldersLoading(false)
      })
    return () => {
      active = false
    }
  }, [open, branch, owner, repository])

  const handleSubmit = async (data: FormValues) => {
    await onSubmit(data)
  }

  const selectedTarget = form.watch("target_identifier")

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add folder permission</DialogTitle>
          <DialogDescription>Allow or deny a team to write to a folder path.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Team</label>
            <Select
              value={form.watch("team_id") ? String(form.watch("team_id")) : ""}
              onValueChange={(v) => form.setValue("team_id", Number(v ?? 0), { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select team">
                  {teams.find((t) => t.id === form.watch("team_id"))?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.team_id && <p className="text-xs text-destructive">{form.formState.errors.team_id.message}</p>}
            {teams.length === 0 && <p className="text-xs text-muted-foreground">No teams — create one on Teams tab first.</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Branch</label>
            <Select value={branch} onValueChange={(v) => setBranch(v ?? "")}>
              <SelectTrigger>
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
            <p className="text-xs text-muted-foreground">Select a branch to explore its folder structure.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Browse Folders</label>
            {foldersLoading ? (
              <p className="text-xs text-muted-foreground py-2">Loading repository tree for {branch}...</p>
            ) : folders.length > 0 ? (
              <FolderTreePicker
                paths={folders}
                selectedPath={selectedTarget}
                onSelect={(path) => form.setValue("target_identifier", path, { shouldValidate: true })}
              />
            ) : (
              <p className="text-xs text-muted-foreground py-1">No subfolders found on {branch || "this branch"}. You can enter a path manually below.</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Selected Path</label>
            <Input
              placeholder="e.g. src or src/components"
              {...form.register("target_identifier")}
            />
            {form.formState.errors.target_identifier && <p className="text-xs text-destructive">{form.formState.errors.target_identifier.message}</p>}
            <p className="text-xs text-muted-foreground">Selected from tree or typed manually.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Access</label>
            <Select
              value={form.watch("allow_write") ? "allow" : "deny"}
              onValueChange={(v) => form.setValue("allow_write", (v ?? "allow") === "allow")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="allow">Allow write</SelectItem>
                <SelectItem value="deny">Deny write</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">More specific folder paths win; deny takes precedence.</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-green-600 text-white hover:bg-green-700">
              {loading ? "Saving..." : "Add permission"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}