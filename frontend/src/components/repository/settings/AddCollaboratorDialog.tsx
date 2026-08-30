import { useEffect } from "react"
import {
  UserPlus,
  Mail,
} from "lucide-react"
import {
  useForm,
  type SubmitHandler,
} from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { addCollaboratorSchema, type AddCollaboratorInput} from "@/lib/schemas/repository_collaborators"
import type { CollaboratorRole } from "@/lib/interfaces"
type AddableCollaboratorRole = Exclude<CollaboratorRole, "Member">

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


interface AddCollaboratorDialogProps {
  open: boolean
  isPrivate: boolean
  loading: boolean
  error: string | null
  onClose: () => void
  onSubmit: (
    data: AddCollaboratorInput,
  ) => void
}

const ROLE_INFO: {
  value: AddableCollaboratorRole
  label: string
  description: string
}[] = [
  {
    value: "Admin",
    label: "Admin",
    description:
      "Full control over the repository, including settings and collaborators.",
  },
  {
    value: "Maintainer",
    label: "Maintainer",
    description:
      "Can manage repository content, issues, and pull requests.",
  },
  {
    value: "Viewer",
    label: "Viewer",
    description:
      "Can view private repository content without making changes.",
  },
]

export default function AddCollaboratorDialog({
  open,
  isPrivate,
  loading,
  error,
  onClose,
  onSubmit,
}: AddCollaboratorDialogProps) {
  const form = useForm<AddCollaboratorInput>({
    resolver: zodResolver(addCollaboratorSchema),
    defaultValues: {
      identifier: "",
      role: "Maintainer",
    },
  })

  useEffect(() => {
    if (!open) {
      form.reset({
        identifier: "",
        role: "Maintainer",
      })
    }
  }, [open, form])

  const handleSubmit: SubmitHandler<
    AddCollaboratorInput
  > = (data) => {
    onSubmit(data)
  }

  const selectedRole = form.watch("role")

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-5" />
            Add collaborator
          </DialogTitle>

          <DialogDescription>
            Give someone access to this repository.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-6"
        >
          {/* identifier / email */}
          <div className="space-y-2">
            <label
              htmlFor="identifier"
              className="text-sm font-medium"
            >
              identifier or email
            </label>

            <div className="relative">
              <Mail
                className="
                  absolute left-3 top-1/2
                  size-4 -translate-y-1/2
                  text-muted-foreground
                "
              />

              <Input
                id="username"
                {...form.register("identifier")}
                placeholder="username or email@example.com"
                className="pl-9"
              />
            </div>

            {form.formState.errors.identifier && (
              <p className="text-xs text-destructive">
                {
                  form.formState.errors.identifier
                    .message
                }
              </p>
            )}
          </div>

          {/* Role */}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">
                Role
              </label>

              <p className="mt-1 text-xs text-muted-foreground">
                Choose the collaborator's level of
                access.
              </p>
            </div>

            <div className="space-y-2">
              {ROLE_INFO.map((item) => {
                // Viewer is only available for private
                // repositories.
                if (
                  item.value === "Viewer" &&
                  !isPrivate
                ) {
                  return null
                }

                const selected =
                  selectedRole === item.value

                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() =>
                      form.setValue(
                        "role",
                        item.value,
                        {
                          shouldValidate: true,
                        },
                      )
                    }
                    className={`
                      w-full rounded-xl border p-4
                      text-left transition-all
                      ${
                        selected
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "hover:bg-muted"
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`
                          mt-0.5 flex size-4
                          shrink-0 items-center
                          justify-center rounded-full border
                          ${
                            selected
                              ? "border-primary"
                              : "border-muted-foreground"
                          }
                        `}
                      >
                        {selected && (
                          <div className="size-2 rounded-full bg-primary" />
                        )}
                      </div>

                      <div>
                        <p className="text-sm font-medium">
                          {item.label}
                        </p>

                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
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
              className="
                gap-2 bg-green-600 text-white
                hover:bg-green-700
              "
            >
              <UserPlus className="size-4" />

              {loading
                ? "Adding..."
                : "Add collaborator"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}