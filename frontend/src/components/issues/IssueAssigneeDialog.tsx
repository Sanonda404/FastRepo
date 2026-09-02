import { Users, UserPlus } from "lucide-react"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import type {
  CollaboratorResponse,
} from "@/lib/interfaces"

import {
  issueAssigneeSchema,
  type IssueAssigneeInput,
} from "@/lib/schemas/issue"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

type Props = {
  loading: boolean
  owner: string
  collaborators: CollaboratorResponse[]
  assignedUsernames: string[]
  onSubmit: (
    data: IssueAssigneeInput
  ) => Promise<void>
}

export default function IssueAssigneeDialog({
  loading,
  owner,
  collaborators,
  assignedUsernames,
  onSubmit,
}: Props) {
  const form = useForm<IssueAssigneeInput>({
    resolver: zodResolver(
      issueAssigneeSchema
    ),
    defaultValues: {
      username: "",
    },
  })

  const available = collaborators.filter(
    (collaborator) =>
      collaborator.role !== "Viewer" &&
      !assignedUsernames.includes(collaborator.username)
  );


  const handleSubmit = async (
    data: IssueAssigneeInput
  ) => {
    try {
      await onSubmit(data)

      form.reset()
    } catch {
      // Parent handles error.
    }
  }

  return (
    <Dialog>
      <DialogTrigger>
        <Button
          variant="outline"
          size="icon"
          className="size-8 rounded-lg"
        >
          <UserPlus className="size-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Assign issue
          </DialogTitle>

          <DialogDescription>
            Select a repository collaborator
            to work on this issue.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(
            handleSubmit
          )}
          className="space-y-5"
        >
          <div className="space-y-2">
            <Label htmlFor="assignee">
              Collaborator
            </Label>

            {available.length === 0 ? (
              <div className="
                rounded-xl
                border
                border-dashed
                bg-muted/20
                px-4 py-6
                text-center
              ">
                <Users className="
                  mx-auto
                  size-5
                  text-muted-foreground
                " />

                <p className="
                  mt-2
                  text-sm
                  font-medium
                ">
                  No collaborators available
                </p>

                <p className="
                  mt-1
                  text-xs
                  leading-5
                  text-muted-foreground
                ">
                  All repository collaborators
                  are already assigned.
                </p>
              </div>
            ) : (
              <select
                id="assignee"
                className="
                  h-10
                  w-full
                  rounded-lg
                  border
                  bg-background
                  px-3
                  text-sm
                  outline-none
                  focus-visible:border-ring
                  focus-visible:ring-2
                  focus-visible:ring-ring/30
                "
                {...form.register("username")}
              >
                <option value="">
                  Select a collaborator
                </option>

                {/* Repository owner */}
                {!assignedUsernames.includes(owner) && (
                  <option value={owner}>
                    {owner}
                  </option>
                )}

                {/* Other collaborators */}
                {available.map(
                  (collaborator) => (
                    <option
                      key={collaborator.id}
                      value={collaborator.username}
                    >
                      {collaborator.username}
                    </option>
                  )
                )}
              </select>
            )}

            {form.formState.errors.username && (
              <p className="
                text-xs
                text-destructive
              ">
                {
                  form.formState.errors
                    .username?.message
                }
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={
                loading ||
                available.length === 0
              }
              className="rounded-lg"
            >
              <UserPlus className="
                mr-2
                size-4
              " />

              {loading
                ? "Assigning..."
                : "Assign collaborator"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}