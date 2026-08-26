import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import {
  addTeamMemberSchema,
  type AddTeamMemberInput,
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

import { Button } from "@/components/ui/button"

interface Collaborator {
  id: number
  username: string
  avatar_url?: string | null
}

interface AddTeamMemberDialogProps {
  open: boolean
  team: Team | null
  collaborators: Collaborator[]
  loading: boolean
  error: string | null
  onClose: () => void
  onSubmit: (data: AddTeamMemberInput) => void
}

export default function AddTeamMemberDialog({
  open,
  team,
  collaborators,
  loading,
  error,
  onClose,
  onSubmit,
}: AddTeamMemberDialogProps) {
  const form = useForm<AddTeamMemberInput>({
    resolver: zodResolver(addTeamMemberSchema),
  })

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Add member
          </DialogTitle>

          <DialogDescription>
            Add a repository collaborator to{" "}
            <strong>{team?.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-5"
        >
          <select
            {...form.register("member_id", {
              valueAsNumber: true,
            })}
            className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="">
              Select a member
            </option>

            {collaborators.map((member) => (
              <option
                key={member.id}
                value={member.id}
              >
                {member.username}
              </option>
            ))}
          </select>

          {form.formState.errors.member_id && (
            <p className="text-sm text-destructive">
              {form.formState.errors.member_id.message}
            </p>
          )}

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
              {loading ? "Adding..." : "Add member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}