import {
  MoreHorizontal,
  Shield,
  User,
  UserRoundCog,
  Trash2,
} from "lucide-react"

import { Button } from "@/components/ui/button"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import type { CollaboratorResponse, CollaboratorRole } from "@/lib/interfaces"

import { HasRole } from "@/components/guards/HasRole"
import RoleBadge from "./RoleBadge"

interface CollaboratorRowProps {
  collaborator: CollaboratorResponse
  isPrivate: boolean
  loading: boolean

  onChangeRole: (
    collaborator: CollaboratorResponse,
    role: CollaboratorRole
  ) => Promise<void>

  onDelete: (
    collaborator: CollaboratorResponse,
  ) => Promise<void>
}

export default function CollaboratorRow({
  collaborator,
  isPrivate,
  loading,
  onChangeRole,
  onDelete,
}: CollaboratorRowProps) {
  const isOwner =
    collaborator.role === "Owner"

  const isAdmin =
    collaborator.role === "Admin"

  return (
    <div className="group flex flex-col gap-4 px-5 py-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between">

      {/* User */}
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

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">
              {collaborator.username}
            </p>

            {isOwner && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600">
                <Shield className="size-3" />
                Owner
              </span>
            )}
          </div>

          <p className="mt-0.5 text-xs text-muted-foreground">
            Repository collaborator
          </p>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">

        <RoleBadge role={collaborator.role} />

        {/* ---------------------------------------------- */}
        {/* Actions */}
        {/* ---------------------------------------------- */}

        {!isOwner && (
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button
                variant="ghost"
                size="icon"
                disabled={loading}
                className="
                  size-8
                  opacity-70
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
              className="w-52"
            >

              {/* -------------------------------------- */}
              {/* Change role */}
              {/* -------------------------------------- */}

              {/* Admin + Owner can change roles */}
              <HasRole
                roles={["Owner", "Admin"]}
              >
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

                {isPrivate && (
                  <DropdownMenuItem
                    onClick={() =>
                      onChangeRole(
                        collaborator,
                        "Viewer",
                      )
                    }
                  >
                    <User className="mr-2 size-4" />
                    Make Viewer
                  </DropdownMenuItem>
                )}
              </HasRole>

              {/* Only Owner can promote someone to Admin */}
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

              {/* -------------------------------------- */}
              {/* Delete */}
              {/* -------------------------------------- */}

              <DropdownMenuSeparator />

              {/* Admin + Owner can remove non-admins */}
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

              {/* Only Owner can remove Admins */}
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