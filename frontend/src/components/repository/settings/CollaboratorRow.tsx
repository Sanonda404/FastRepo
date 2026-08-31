import {
  MoreHorizontal,
  Shield,
  UserRoundCog,
  Trash2,
  Eye,
} from "lucide-react"

import { Button } from "@/components/ui/button"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import type { CollaboratorResponse } from "@/lib/interfaces"

import { HasRole } from "@/components/guards/HasRole"

import RoleBadge from "./RoleBadge"
import type { CollaboratorRole } from '@/lib/interfaces';

interface CollaboratorRowProps {
  collaborator: CollaboratorResponse

  currentUsername: string

  isPrivate: boolean

  loading: boolean

  onChangeRole: (
    collaborator: CollaboratorResponse,
    role: CollaboratorRole,
  ) => Promise<void>

  onDelete: (
    collaborator: CollaboratorResponse,
  ) => Promise<void>
}

export default function CollaboratorRow({
  collaborator,
  currentUsername,
  isPrivate,
  loading,
  onChangeRole,
  onDelete,
}: CollaboratorRowProps) {

  // ------------------------------------------
  // Current user
  // ------------------------------------------

  const isSelf =
    collaborator.username ===
    currentUsername

  // ------------------------------------------
  // Roles
  // ------------------------------------------

  const isAdmin =
    collaborator.role === "Admin"

  const isMaintainer =
    collaborator.role === "Maintainer"
  
  const isMember =
    collaborator.role === "Member"

  const isViewer =
    collaborator.role === "Viewer"

  return (
    <div
      className="
        group flex flex-col gap-4
        px-5 py-4
        transition-colors
        hover:bg-muted/30
        sm:flex-row
        sm:items-center
        sm:justify-between
      "
    >

      {/* ====================================== */}
      {/* User information */}
      {/* ====================================== */}

      <div className="flex min-w-0 items-center gap-3">

        {/* Avatar */}

        <div
          className="
            flex size-10 shrink-0
            items-center justify-center
            rounded-full
            bg-primary/10
            font-semibold
            text-primary
          "
        >
          {collaborator.username
            .charAt(0)
            .toUpperCase()}
        </div>

        {/* Name */}

        <div className="min-w-0">

          <div className="flex items-center gap-2">

            <p className="truncate text-sm font-medium">
              {collaborator.username}
            </p>

            {/* Show "You" on your own row */}

            {isSelf && (
              <span
                className="
                  rounded-full
                  bg-primary/10
                  px-2 py-0.5
                  text-[10px]
                  font-medium
                  text-primary
                "
              >
                You
              </span>
            )}

          </div>

          <p className="mt-0.5 text-xs text-muted-foreground">
            Repository collaborator
          </p>

        </div>
      </div>

      {/* ====================================== */}
      {/* Role + actions */}
      {/* ====================================== */}

      <div className="flex items-center gap-2">

        {/* Role */}

        <RoleBadge
          role={collaborator.role}
        />

        {/* ==================================== */}
        {/* Actions */}
        {/* ==================================== */}

        {/*
          IMPORTANT:

          Don't show actions for yourself.

          This prevents:
          - Self promotion
          - Changing your own role
          - Removing yourself
        */}

        {!isSelf && (
          <DropdownMenu>

            <DropdownMenuTrigger >
              <Button
                variant="ghost"
                size="icon"
                disabled={loading}
                className="
                  size-8
                  opacity-60
                  transition-opacity
                  group-hover:opacity-100
                "
              >
                <MoreHorizontal className="size-4" />

                <span className="sr-only">
                  Collaborator actions
                </span>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-56"
            >

              {/* ================================= */}
              {/* ADMIN MANAGEMENT */}
              {/* ================================= */}

              {/*
                Only Owner can promote someone
                to Admin.
              */}

              <HasRole roles={["Owner"]}>

                {!isAdmin && (
                  <DropdownMenuItem
                    onClick={() =>
                      onChangeRole(
                        collaborator,
                        "Admin",
                      )
                    }
                  >
                    <Shield className="mr-2 size-4" />

                    Make Admin
                  </DropdownMenuItem>
                )}

              </HasRole>

              {/* ================================= */}
              {/* MAINTAINER */}
              {/* ================================= */}

              {/*
                Owner and Admin can make someone
                a Maintainer.
              */}

              <HasRole
                roles={["Owner", "Admin"]}
              >

                {!isMaintainer && (
                  <DropdownMenuItem
                    onClick={() =>
                      onChangeRole(
                        collaborator,
                        "Maintainer",
                      )
                    }
                  >
                    <UserRoundCog className="mr-2 size-4" />

                    Make Maintainer
                  </DropdownMenuItem>
                )}

                 {!isMember && (
                  <DropdownMenuItem
                    onClick={() =>
                      onChangeRole(
                        collaborator,
                        "Member",
                      )
                    }
                  >
                    <UserRoundCog className="mr-2 size-4" />

                    Make Member
                  </DropdownMenuItem>
                )}

              </HasRole>

              {/* ================================= */}
              {/* VIEWER */}
              {/* ================================= */}

              {/*
                Viewer only exists for private
                repositories.
              */}

              {isPrivate && (
                <HasRole
                  roles={["Owner", "Admin"]}
                >

                  {!isViewer && (
                    <DropdownMenuItem
                      onClick={() =>
                        onChangeRole(
                          collaborator,
                          "Viewer",
                        )
                      }
                    >
                      <Eye className="mr-2 size-4" />

                      Make Viewer
                    </DropdownMenuItem>
                  )}

                </HasRole>
              )}

              {/* ================================= */}
              {/* DELETE */}
              {/* ================================= */}

              <DropdownMenuSeparator />

              {/* --------------------------------- */}
              {/* Remove normal collaborator */}
              {/* --------------------------------- */}

              {/*
                Admins and Owners can remove
                Maintainers/Viewers.

                Admins themselves cannot be
                removed by another Admin.
              */}

              {!isAdmin && (
                <HasRole
                  roles={["Owner", "Admin"]}
                >
                  <DropdownMenuItem
                    className="
                      text-destructive
                      focus:text-destructive
                    "
                    onClick={() =>
                      onDelete(collaborator)
                    }
                  >
                    <Trash2 className="mr-2 size-4" />

                    Remove collaborator
                  </DropdownMenuItem>
                </HasRole>
              )}

              {/* --------------------------------- */}
              {/* Remove Admin */}
              {/* --------------------------------- */}

              {/*
                ONLY Owner can remove an Admin.
              */}

              {isAdmin && (
                <HasRole roles={["Owner"]}>
                  <DropdownMenuItem
                    className="
                      text-destructive
                      focus:text-destructive
                    "
                    onClick={() =>
                      onDelete(collaborator)
                    }
                  >
                    <Trash2 className="mr-2 size-4" />

                    Remove admin
                  </DropdownMenuItem>
                </HasRole>
              )}

            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}