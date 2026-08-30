import { useMemo, useState } from "react"
import {
  Check,
  Shield,
  UserPlus,
  Users,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import AddCollaboratorDialog from "./AddCollaboratorDialog"

import type { AddCollaboratorInput } from "@/lib/schemas/repository_collaborators"
import type { CollaboratorResponse, CollaboratorRole} from "@/lib/interfaces"
import RoleSummaryCard from "./RoleSummaryCard"
import CollaboratorRow from "./CollaboratorRow"

interface CollaboratorSettingsProps {
  isPrivate: boolean
  loading: boolean
  error: string | null
  collaborators: CollaboratorResponse[]

  onAddCollaborator: (
    data: AddCollaboratorInput,
  ) => Promise<void>

  onChangeRole: (
    collaborator: CollaboratorResponse,
    role: CollaboratorRole,
  ) => Promise<void>

  onDeleteCollaborator: (
    collaborator: CollaboratorResponse,
  ) => Promise<void>
}

type RoleFilter =
  | "All"
  | "Owner"
  | "Admin"
  | "Maintainer"
  | "Member"
  | "Viewer"

export default function CollaboratorSettings({
  isPrivate,
  loading,
  error,
  collaborators,
  onAddCollaborator,
  onChangeRole,
  onDeleteCollaborator,
}: CollaboratorSettingsProps) {
  const [dialogOpen, setDialogOpen] =
    useState(false)

  const [roleFilter, setRoleFilter] =
    useState<RoleFilter>("All")

  const [actionLoading, setActionLoading] =
    useState<number | null>(null)

  const handleSubmit = async (
    data: AddCollaboratorInput,
  ) => {
    await onAddCollaborator(data)
    setDialogOpen(false)
  }

  const filteredCollaborators = useMemo(() => {
    if (roleFilter === "All") {
      return collaborators
    }

    return collaborators.filter(
      (collaborator) =>
        collaborator.role === roleFilter,
    )
  }, [collaborators, roleFilter])

  const handleRoleChange = async (
    collaborator: CollaboratorResponse,
    role: CollaboratorRole
  ) => {
    if (role === collaborator.role) return

    try {
      setActionLoading(collaborator.id)

      await onChangeRole(
        collaborator,
        role,
      )
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (
    collaborator: CollaboratorResponse,
  ) => {
    try {
      setActionLoading(collaborator.id)

      await onDeleteCollaborator(
        collaborator,
      )
    } finally {
      setActionLoading(null)
    }
  }

  const adminCount = collaborators.filter(
    (c) => c.role === "Admin",
  ).length

  const maintainerCount =
    collaborators.filter(
      (c) => c.role === "Maintainer",
    ).length

  const viewerCount =
    collaborators.filter(
      (c) => c.role === "Viewer",
    ).length

  return (
    <div className="max-w-4xl space-y-8">

      {/* ------------------------------------------------ */}
      {/* Header */}
      {/* ------------------------------------------------ */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="size-4" />
            </div>

            <h2 className="text-lg font-semibold">
              Collaborators
            </h2>
          </div>

          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Control who can access this repository
            and give each collaborator exactly the
            permissions they need.
          </p>
        </div>

        <Button
          onClick={() => setDialogOpen(true)}
          className="
            shrink-0 gap-2
            bg-green-600 text-white
            shadow-sm
            hover:bg-green-700
          "
        >
          <UserPlus className="size-4" />
          Add collaborator
        </Button>
      </div>

      {/* ------------------------------------------------ */}
      {/* Error */}
      {/* ------------------------------------------------ */}

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* ------------------------------------------------ */}
      {/* Role overview */}
      {/* ------------------------------------------------ */}

      <div className="grid gap-3 sm:grid-cols-3">
        <RoleSummaryCard
          label="Admins"
          count={adminCount}
          icon={Shield}
        />

        <RoleSummaryCard
          label="Maintainers"
          count={maintainerCount}
          icon={Users}
        />

        {isPrivate && (
          <RoleSummaryCard
            label="Viewers"
            count={viewerCount}
            icon={Check}
          />
        )}
      </div>

      {/* ------------------------------------------------ */}
      {/* Collaborators container */}
      {/* ------------------------------------------------ */}

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">

        {/* Toolbar */}
        <div className="flex flex-col gap-4 border-b bg-muted/20 p-5 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <h3 className="font-semibold">
              Repository access
            </h3>

            <p className="mt-1 text-xs text-muted-foreground">
              {collaborators.length}{" "}
              {collaborators.length === 1
                ? "person"
                : "people"}{" "}
              with access
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Filter:
            </span>

            <Select
              value={roleFilter}
              onValueChange={(value) =>
                setRoleFilter(
                  value as RoleFilter,
                )
              }
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="All">
                  All roles
                </SelectItem>

                <SelectItem value="Owner">
                  Owners
                </SelectItem>

                <SelectItem value="Admin">
                  Admins
                </SelectItem>

                <SelectItem value="Maintainer">
                  Maintainers
                </SelectItem>

                {isPrivate && (
                  <SelectItem value="Viewer">
                    Viewers
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ------------------------------------------------ */}
        {/* Empty state */}
        {/* ------------------------------------------------ */}

        {filteredCollaborators.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
              <Users className="size-6 text-muted-foreground" />
            </div>

            <h3 className="mt-4 font-medium">
              No collaborators found
            </h3>

            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {roleFilter === "All"
                ? "There are no collaborators with access to this repository yet."
                : `There are no collaborators with the ${roleFilter} role.`}
            </p>
          </div>
        ) : (
          /* ------------------------------------------------ */
          /* Collaborator list */
          /* ------------------------------------------------ */

          <div className="divide-y">
            {filteredCollaborators.map(
              (collaborator) => (
                <CollaboratorRow
                  key={collaborator.id}
                  collaborator={collaborator}
                  isPrivate={isPrivate}
                  loading={
                    actionLoading ===
                    collaborator.id
                  }
                  onChangeRole={
                    handleRoleChange
                  }
                  onDelete={handleDelete}
                />
              ),
            )}
          </div>
        )}
      </div>

      {/* ------------------------------------------------ */}
      {/* Add collaborator dialog */}
      {/* ------------------------------------------------ */}

      <AddCollaboratorDialog
        open={dialogOpen}
        isPrivate={isPrivate}
        loading={loading}
        error={error}
        onClose={() =>
          setDialogOpen(false)
        }
        onSubmit={handleSubmit}
      />
    </div>
  )
}