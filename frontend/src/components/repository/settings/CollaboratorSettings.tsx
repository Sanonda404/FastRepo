import { useAuth } from "@/lib/auth/use-auth"
import { useMemo, useState } from "react"
import {
  Check,
  Crown,
  LogOut,
  Shield,
  UserPlus,
  Users,
} from "lucide-react"
import { HasRole } from "@/components/guards/HasRole"
import { useRepoPermissions } from "@/lib/auth/RepoPermissionManager"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import AddCollaboratorDialog from "./AddCollaboratorDialog"
import CollaboratorRow from "./CollaboratorRow"
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

  onLeaveRepository: () => Promise<void>
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
  onLeaveRepository,
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

  const [leaving, setLeaving] =
    useState(false)

  const [leaveOpen, setLeaveOpen] =
    useState(false)

  // ------------------------------------------
  // Current user is a non-owner collaborator.
  // ------------------------------------------

  const isSelfCollaborator =
    !!username &&
    username !== ownerUsername &&
    collaborators.some(
      (collaborator) =>
        collaborator.username === username,
    )

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
  // Owner is not part of the collaborator
  // listing (SQL excludes the owner row), so
  // it is rendered statically.
  // ------------------------------------------

  const ownerBlock = (
    <div className="flex items-center justify-between gap-4 bg-amber-500/[0.03] px-5 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className="
            flex size-10 shrink-0
            items-center
            justify-center
            rounded-full
            bg-amber-500/10
            font-semibold
            text-amber-600
          "
        >
          {ownerUsername
            .charAt(0)
            .toUpperCase()}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold">
              {ownerUsername}
            </p>

            <span
              className="
                inline-flex items-center gap-1.5
                rounded-full
                bg-amber-500/10
                px-2.5 py-1
                text-xs font-medium
                text-amber-600
              "
            >
              <Crown className="size-3.5" />
              Owner
            </span>
          </div>

          <p className="mt-0.5 text-xs text-muted-foreground">
            Repository owner
          </p>
        </div>
      </div>

      {/* Deliberately no actions */}
    </div>
  )

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

  // ------------------------------------------
  // Leave repository (self removal)
  // ------------------------------------------

  const handleLeave = () => {
    setLeaveOpen(true)
  }

  const handleConfirmLeave = async () => {
    try {
      setLeaving(true)

      await onLeaveRepository()

      setLeaveOpen(false)
    } finally {
      setLeaving(false)
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

      {isSelfCollaborator && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-foreground/10 bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground">
            You are a collaborator on this repository.
          </p>

          <Button
            variant="outline"
            disabled={leaving}
            onClick={handleLeave}
            className="shrink-0 gap-2 text-destructive hover:text-destructive"
          >
            {leaving ? "Leaving..." : "Leave repository"}
          </Button>
        </div>
      )}

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
        {/* Owner + collaborators */}
        {/* ==================================== */}

        {roleFilter === "Owner" ? (
          ownerBlock
        ) : (
          <div className="divide-y divide-foreground/10">

            {ownerBlock}

            {filteredCollaborators.length ===
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
              filteredCollaborators.map(
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
        }
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

      {/* ====================================== */}
      {/* Leave repository dialog */}
      {/* ====================================== */}

      <AlertDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Leave this repository?
            </AlertDialogTitle>

            <AlertDialogDescription>
              You will lose access immediately.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={leaving}
            >
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={handleConfirmLeave}
              disabled={leaving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <LogOut className="mr-2 size-4" />

              {leaving ? "Leaving..." : "Leave repository"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}