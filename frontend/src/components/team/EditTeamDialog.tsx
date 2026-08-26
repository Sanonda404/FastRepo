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

interface EditTeamDialogProps {
  open: boolean
  team: Team | null
  loading: boolean
  error: string | null
  onClose: () => void
  onSubmit: (data: CreateTeamInput) => void
}

export default function EditTeamDialog({
  open,
  team,
  loading,
  error,
  onClose,
  onSubmit,
}: EditTeamDialogProps) {
  const form = useForm<CreateTeamInput>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: {
      name: "",
      parent_team_id: null,
    },
  })

  useEffect(() => {
    if (team) {
      form.reset({
        name: team.name,
        parent_team_id: team.parent_team_id,
      })
    }
  }, [team, form])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Edit team
          </DialogTitle>

          <DialogDescription>
            Update the name of {team?.name}.
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
              {...form.register("name")}
              placeholder="Team name"
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
              {loading ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}