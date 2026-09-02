import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import type { Team, BranchResponse } from "@/lib/interfaces"

const schema = z.object({
  team_id: z.number().int().positive("Team is required"),
  target_identifier: z.string().min(1, "Branch name required").max(255),
  allow_write: z.boolean(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  teams: Team[]
  branches: BranchResponse[]
  loading: boolean
  onClose: () => void
  onSubmit: (data: FormValues) => Promise<void>
}

export default function AddBranchPermissionDialog({ open, teams, branches, loading, onClose, onSubmit }: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { team_id: 0, target_identifier: "", allow_write: true },
  })

  useEffect(() => {
    if (!open) form.reset({ team_id: 0, target_identifier: "", allow_write: true })
  }, [open, form])

  const handleSubmit = async (data: FormValues) => {
    await onSubmit(data)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add branch permission</DialogTitle>
          <DialogDescription>Allow or deny a team to push to a branch.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Team</label>
            <Select
              value={form.watch("team_id") ? String(form.watch("team_id")) : ""}
              onValueChange={(v) => form.setValue("team_id", Number(v ?? 0), { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select team" />
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
            {branches.length > 0 ? (
              <Select
                value={form.watch("target_identifier") || ""}
                onValueChange={(v) => form.setValue("target_identifier", v ?? "", { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select or type branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.name} value={b.name}>
                      {b.name} {b.is_default ? "(default)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            <Input placeholder="e.g. main or feature/*" {...form.register("target_identifier")} />
            {form.formState.errors.target_identifier && <p className="text-xs text-destructive">{form.formState.errors.target_identifier.message}</p>}
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
            <p className="text-xs text-muted-foreground">Deny takes precedence if multiple rules match. Members without an Allow rule are denied by default.</p>
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
