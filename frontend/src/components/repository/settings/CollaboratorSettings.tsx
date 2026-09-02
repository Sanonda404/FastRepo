import { useAuth } from "@/lib/auth/use-auth"
import { useMemo, useState } from "react"
import {
  Check,
  Shield,
  UserPlus,
  Users,
} from "lucide-react"
import { HasRole } from "@/components/guards/HasRole"
import { useRepoPermissions } from "@/lib/auth/RepoPermissionManager"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import AddCollaboratorDialog from "./AddCollaboratorDialog"
import CollaboratorRow from "./CollaboratorRow"
import OwnerRow from "./OwnerRow"
import RoleSummaryCard from "./RoleSummaryCard"

import type { AddCollaboratorInput } from "@/lib/schemas/repository_collaborators"
import type { CollaboratorResponse } from "@/lib/interfaces"
import type { CollaboratorRole } from '@/lib/interfaces';


interface CollaboratorSettingsProps {
  ownerUsername: string
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
  ownerUsername,
  isPrivate,
  loading,
  error,
  collaborators,
  onAddCollaborator,
  onChangeRole,
  onDeleteCollaborator,
}: CollaboratorSettingsProps) {
  const { username } = useAuth()
  let canManage = false
  try {
    const perms = useRepoPermissions()
    canManage = perms.role === "Owner" || perms.role === "Admin"
  } catch {
    canManage = false
  }

  const [dialogOpen, setDialogOpen] =
    useState(false)

  const [roleFilter, setRoleFilter] =
    useState<RoleFilter>("All")

  const [actionLoading, setActionLoading] =
    useState<number | null>(null)

  // ------------------------------------------
  // Filter collaborators
  // ------------------------------------------

  const filteredCollaborators = useMemo(() => {
    if (roleFilter === "All") {
      return collaborators
    }

    return collaborators.filter(
      (collaborator) =>
        collaborator.role === roleFilter,
    )
  }, [collaborators, roleFilter])

  // ------------------------------------------
  // Owner should never be treated as a normal
  // collaborator.
  // ------------------------------------------

  const visibleCollaborators = useMemo(() => {
    return filteredCollaborators.filter(
      (collaborator) =>
        collaborator.username !== ownerUsername,
    )
  }, [
    filteredCollaborators,
    ownerUsername,
  ])

  // ------------------------------------------
  // Role counts
  // ------------------------------------------

  const adminCount = collaborators.filter(
    (collaborator) =>
      collaborator.role === "Admin",
  ).length

  const maintainerCount =
    collaborators.filter(
      (collaborator) =>
        collaborator.role === "Maintainer",
    ).length

  const memberCount =
    collaborators.filter(
      (collaborator) =>
        collaborator.role === "Member",
    ).length

  const viewerCount =
    collaborators.filter(
      (collaborator) =>
        collaborator.role === "Viewer",
    ).length

  // ------------------------------------------
  // Add collaborator
  // ------------------------------------------

  const handleSubmit = async (
    data: AddCollaboratorInput,
  ) => {
    const ident = data.identifier.trim().toLowerCase()
    if (username && ident === username.toLowerCase()) {
      toast.error("You cannot add yourself as a collaborator")
      return
    }
    if (ident === ownerUsername.toLowerCase()) {
      toast.error("Cannot add repository owner as collaborator")
      return
    }
    try {
      await onAddCollaborator(data)
      setDialogOpen(false)
    } catch {
      // keep dialog open to show error
    }
  }

  // ------------------------------------------
  // Change collaborator role
  // ------------------------------------------

  const handleRoleChange = async (
    collaborator: CollaboratorResponse,
    role: CollaboratorRole,
  ) => {
    // Never allow changing the owner's role.
    if (
      collaborator.username ===
      ownerUsername
    ) {
      return
    }

    // Never allow a user to change their own role.
    if (
      collaborator.username ===
      username
    ) {
      return
    }

    if (role === collaborator.role) {
      return
    }

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

  // ------------------------------------------
  // Delete collaborator
  // ------------------------------------------

  const handleDelete = async (
    collaborator: CollaboratorResponse,
  ) => {
    // Never allow removing the owner.
    if (
      collaborator.username ===
      ownerUsername
    ) {
      return
    }

    // Never allow removing yourself.
    if (
      collaborator.username ===
      username
    ) {
      return
    }

    try {
      setActionLoading(collaborator.id)

      await onDeleteCollaborator(
        collaborator,
      )
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="max-w-4xl space-y-8">

      {/* ====================================== */}
      {/* Header */}
      {/* ====================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div
              className="
                flex size-9 items-center
                justify-center rounded-lg
                bg-primary/10 text-primary
              "
            >
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

        <HasRole roles={["Owner", "Admin"]}>
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
        </HasRole>
        {!canManage && (
          <p className="text-xs text-muted-foreground">Only owners and admins can manage collaborators</p>
        )}
      </div>

      {/* ====================================== */}
      {/* Error */}
      {/* ====================================== */}

      {error && (
        <div
          className="
            rounded-xl border
            border-destructive/30
            bg-destructive/10
            px-4 py-3
            text-sm text-destructive
          "
        >
          {error}
        </div>
      )}

      {/* ====================================== */}
      {/* Role summary */}
      {/* ====================================== */}

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

        <RoleSummaryCard
          label="Members"
          count={memberCount}
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

      {/* ====================================== */}
      {/* Repository access */}
      {/* ====================================== */}

      <div
        className="
          overflow-hidden rounded-xl
          bg-card shadow-sm ring-1 ring-foreground/10
        "
      >

        {/* ------------------------------------ */}
        {/* Toolbar */}
        {/* ------------------------------------ */}

        <div
          className="
            flex flex-col gap-4
            border-b border-foreground/10 bg-muted/20 p-5
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <div>
            <h3 className="font-semibold">
              Repository access
            </h3>

            <p className="mt-1 text-xs text-muted-foreground">
              {collaborators.length + 1}{" "}
              {collaborators.length + 1 === 1
                ? "person"
                : "people"}{" "}
              with access
            </p>
          </div>

          {/* Role filter */}

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
                  Owner
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

        {/* ==================================== */}
        {/* Owner filter */}
        {/* ==================================== */}

        {roleFilter === "Owner" ? (
          <OwnerRow
            username={ownerUsername}
          />
        ) : (
          <div className="divide-y divide-foreground/10">

            {/* -------------------------------- */}
            {/* Owner */}
            {/* -------------------------------- */}

            <OwnerRow
              username={ownerUsername}
            />

            {/* -------------------------------- */}
            {/* Collaborators */}
            {/* -------------------------------- */}

            {visibleCollaborators.length ===
            0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                <div
                  className="
                    flex size-12 items-center
                    justify-center rounded-xl
                    bg-muted
                  "
                >
                  <Users className="size-5 text-muted-foreground" />
                </div>

                <h3 className="mt-4 font-medium">
                  No collaborators found
                </h3>

                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  {roleFilter === "All"
                    ? "There are no collaborators with access to this repository yet."
                    : `There are no collaborators with the ${roleFilter} role.`}
                </p>

                {roleFilter === "All" && canManage && (
                  <HasRole roles={["Owner", "Admin"]}>
                    <Button
                      variant="outline"
                      className="mt-5 gap-2"
                      onClick={() =>
                        setDialogOpen(true)
                      }
                    >
                      <UserPlus className="size-4" />
                      Add collaborator
                    </Button>
                  </HasRole>
                )}
              </div>
            ) : (
              visibleCollaborators.map(
                (collaborator) => (
                  <CollaboratorRow
                    key={collaborator.id}
                    collaborator={
                      collaborator
                    }
                    currentUsername={
                      username ?? ""
                    }
                    isPrivate={isPrivate}
                    loading={
                      actionLoading ===
                      collaborator.id
                    }
                    onChangeRole={
                      handleRoleChange
                    }
                    onDelete={
                      handleDelete
                    }
                  />
                ),
              )
            )}
          </div>
        )}
      </div>

      {/* ====================================== */}
      {/* Add collaborator dialog */}
      {/* ====================================== */}

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