import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import {
  UserPlus,
  Users,
} from "lucide-react"


import type {
  CollaboratorResponse,
  IssueAssigneeResponse
} from "@/lib/interfaces"

import {
  issueAssigneeSchema,
  type IssueAssigneeInput,
} from "@/lib/schemas/issue"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type AssigneeDailogProps = {
  loading : boolean,
  collaborators : CollaboratorResponse[],
  assignees : IssueAssigneeResponse[],
  onSubmit: (
    data: IssueAssigneeInput
  ) => Promise<void>
}

export default function AssigneeDialog({
  loading,
  collaborators,
  assignees,
  onSubmit,
}: AssigneeDailogProps ) {
  const form = useForm<IssueAssigneeInput>({
    resolver: zodResolver(issueAssigneeSchema),
    defaultValues: {
      username: "",
    },
  })

    const availableCollaborators = collaborators.filter(
    (collaborator) =>
        !assignees.some((assignee) => assignee.username === collaborator.username)
    );

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Assign issue</DialogTitle>

        <DialogDescription>
          Select a repository collaborator to work on
          this issue.
        </DialogDescription>
      </DialogHeader>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-5"
      >
        <div className="space-y-2">
          <Label htmlFor="assignee-username">
            Collaborator
          </Label>

          {availableCollaborators.length === 0 ? (
            <div className="
              rounded-xl
              border border-dashed
              bg-muted/20
              px-4 py-5
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
                text-muted-foreground
              ">
                All repository collaborators are already
                assigned to this issue.
              </p>
            </div>
          ) : (
            <div className="relative">
              <select
                id="assignee-username"
                className="
                  flex h-10 w-full
                  appearance-none
                  rounded-lg
                  border
                  bg-background
                  px-3 pr-10
                  text-sm
                  outline-none
                  transition
                  focus-visible:border-ring
                  focus-visible:ring-2
                  focus-visible:ring-ring/30
                "
                {...form.register("username")}
              >
                <option value="">
                  Select a collaborator
                </option>

                {availableCollaborators.map(
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

              <Users className="
                pointer-events-none
                absolute
                right-3
                top-1/2
                size-4
                -translate-y-1/2
                text-muted-foreground
              " />
            </div>
          )}

          {form.formState.errors.username && (
            <p className="text-xs text-destructive">
              {
                form.formState.errors.username
                  ?.message
              }
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="submit"
            disabled={
              loading ||
              availableCollaborators.length === 0
            }
            className="rounded-lg"
          >
            <UserPlus className="mr-2 size-4" />

            {loading
              ? "Assigning..."
              : "Assign collaborator"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}