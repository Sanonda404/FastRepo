import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import {
  createTeamSchema,
  type CreateTeamInput,
} from "@/lib/schemas/team"

import type { Team } from "@/lib/interfaces"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface CreateTeamDialogProps {
  open: boolean
  parentTeam: Team | null
  loading: boolean
  error: string | null
  onClose: () => void
  onSubmit: (data: CreateTeamInput) => void
}

export default function CreateTeamDialog({
  open,
  parentTeam,
  loading,
  error,
  onClose,
  onSubmit,
}: CreateTeamDialogProps) {
  const form = useForm<CreateTeamInput>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: {
      name: "",
      parent_team_id: null,
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        name: "",
        parent_team_id: parentTeam?.id ?? null,
      })
    }
  }, [open, parentTeam, form])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {parentTeam
              ? `Create sub-team under ${parentTeam.name}`
              : "Create team"}
          </DialogTitle>

          <DialogDescription>
            {parentTeam
              ? `Create a new team inside ${parentTeam.name}.`
              : "Create a new top-level team for this repository."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-5"
        >
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Team name
            </label>

            <Input
              placeholder="e.g. Frontend"
              {...form.register("name")}
            />

            {form.formState.errors.name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={loading}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              {loading
                ? "Creating..."
                : parentTeam
                  ? "Create sub-team"
                  : "Create team"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}