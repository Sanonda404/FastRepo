import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import {
  addExistingCollaboratorSchema,
  addNewMemberSchema,
  type AddExistingCollaboratorInput,
  type AddNewMemberInput,
} from "@/lib/schemas/team"

import type {
  Team,
  CollaboratorResponse,
} from "@/lib/interfaces"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { Button } from "@/components/ui/button"

interface AddTeamMemberDialogProps {
  open: boolean
  team: Team | null
  collaborators: CollaboratorResponse[]
  loading: boolean
  error: string | null

  onClose: () => void

  onAddExisting: (
    data: AddExistingCollaboratorInput,
  ) => Promise<void>

  onAddNew: (
    data: AddNewMemberInput,
  ) => Promise<void>
}

type AddMemberMode =
  | "existing"
  | "new"

export default function AddTeamMemberDialog({
  open,
  team,
  collaborators,
  loading,
  error,
  onClose,
  onAddExisting,
  onAddNew,
}: AddTeamMemberDialogProps) {
  const [mode, setMode] = useState<AddMemberMode>("existing")

  // ------------------------------------------
  // Existing collaborator form
  // ------------------------------------------

  const existingForm =
    useForm<AddExistingCollaboratorInput>({
      resolver: zodResolver(
        addExistingCollaboratorSchema,
      ),
      defaultValues: {
        collaborator_id: 0,
      },
    })

  // ------------------------------------------
  // New member form
  // ------------------------------------------

  const newMemberForm =
    useForm<AddNewMemberInput>({
      resolver: zodResolver(
        addNewMemberSchema,
      ),
      defaultValues: {
        member_identifier: "",
      },
    })

  // ------------------------------------------
  // Reset forms when dialog closes
  // ------------------------------------------

  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMode("existing")

      existingForm.reset({
        collaborator_id: 0,
      })

      newMemberForm.reset({
        member_identifier: "",
      })
    }
  }, [
    open,
    existingForm,
    newMemberForm,
  ])

  // ------------------------------------------
  // Existing member submit
  // ------------------------------------------

  const handleExistingSubmit =
    async (
      data: AddExistingCollaboratorInput,
    ) => {
      await onAddExisting(data)
    }

  // ------------------------------------------
  // New member submit
  // ------------------------------------------

  const handleNewSubmit =
    async (
      data: AddNewMemberInput,
    ) => {
      await onAddNew(data)
    }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value && !loading) {
          onClose()
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">

        {/* ================================== */}
        {/* Header */}
        {/* ================================== */}

        <DialogHeader>
          <DialogTitle>
            Add team member
          </DialogTitle>

          <DialogDescription>
            Add someone to{" "}
            <strong>
              {team?.name}
            </strong>
            .
          </DialogDescription>
        </DialogHeader>

        {/* ================================== */}
        {/* Mode selector */}
        {/* ================================== */}

        <div className="grid grid-cols-2 rounded-lg bg-muted p-1">

          <button
            type="button"
            disabled={loading}
            onClick={() =>
              setMode("existing")
            }
            className={`
              rounded-md px-3 py-2
              text-sm font-medium
              transition-all
              ${
                mode === "existing"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }
            `}
          >
            Existing member
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() =>
              setMode("new")
            }
            className={`
              rounded-md px-3 py-2
              text-sm font-medium
              transition-all
              ${
                mode === "new"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }
            `}
          >
            Add new member
          </button>

        </div>

        {/* ================================== */}
        {/* Existing collaborator */}
        {/* ================================== */}

        {mode === "existing" && (
          <form
            onSubmit={existingForm.handleSubmit(
              handleExistingSubmit,
            )}
            className="space-y-5"
          >

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Repository collaborator
              </label>

              <select
                {...existingForm.register(
                  "collaborator_id",
                  {
                    valueAsNumber: true,
                  },
                )}
                disabled={loading}
                className="
                  flex h-10 w-full
                  rounded-md border
                  bg-background
                  px-3 py-2
                  text-sm
                  outline-none
                  focus:ring-2
                  focus:ring-ring
                "
              >
                <option value={0}>
                  Select a collaborator
                </option>

                {collaborators.map(
                  (member) => (
                    <option
                      key={member.id}
                      value={member.id}
                    >
                      {member.username}
                    </option>
                  ),
                )}
              </select>

              {existingForm.formState
                .errors.collaborator_id && (
                <p className="text-sm text-destructive">
                  {
                    existingForm.formState
                      .errors
                      .collaborator_id
                      .message
                  }
                </p>
              )}

              <p className="text-xs text-muted-foreground">
                Select someone who already has
                access to this repository.
              </p>
            </div>

            {/* Error */}

            {error && (
              <div
                className="
                  rounded-md
                  bg-destructive/10
                  p-3 text-sm
                  text-destructive
                "
              >
                {error}
              </div>
            )}

            {/* Footer */}

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
                className="
                  bg-green-600
                  text-white
                  hover:bg-green-700
                "
              >
                {loading
                  ? "Adding..."
                  : "Add member"}
              </Button>
            </DialogFooter>

          </form>
        )}

        {/* ================================== */}
        {/* New member */}
        {/* ================================== */}

        {mode === "new" && (
          <form
            onSubmit={newMemberForm.handleSubmit(
              handleNewSubmit,
            )}
            className="space-y-5"
          >

            <div className="space-y-2">

              <label className="text-sm font-medium">
                Username or email
              </label>

              <input
                {...newMemberForm.register(
                  "member_identifier",
                )}
                disabled={loading}
                placeholder="username or email"
                className="
                  flex h-10 w-full
                  rounded-md border
                  bg-background
                  px-3 py-2
                  text-sm
                  outline-none
                  placeholder:text-muted-foreground
                  focus:ring-2
                  focus:ring-ring
                "
              />

              {newMemberForm.formState
                .errors.member_identifier && (
                <p className="text-sm text-destructive">
                  {
                    newMemberForm.formState
                      .errors
                      .member_identifier
                      .message
                  }
                </p>
              )}

              <p className="text-xs text-muted-foreground">
                Enter the username or email of
                someone who isn't currently a
                repository collaborator.
              </p>

            </div>

            {/* Information box */}

            <div
              className="
                rounded-lg
                border
                bg-muted/30
                p-3
                text-xs
                text-muted-foreground
              "
            >
              <p className="font-medium text-foreground">
                New member
              </p>
            </div>

            {/* Error */}

            {error && (
              <div
                className="
                  rounded-md
                  bg-destructive/10
                  p-3 text-sm
                  text-destructive
                "
              >
                {error}
              </div>
            )}

            {/* Footer */}

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
                className="
                  bg-green-600
                  text-white
                  hover:bg-green-700
                "
              >
                {loading
                  ? "Adding..."
                  : "Add member"}
              </Button>
            </DialogFooter>

          </form>
        )}

      </DialogContent>
    </Dialog>
  )
}