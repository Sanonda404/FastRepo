import {
  GitBranch,
  UserPlus,
  Plus,
  MoreHorizontal,
  Pencil,
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

import type { Team } from "@/lib/interfaces"
import TeamMembers from "./TeamMembers"
import { HasCapability } from "../guards/HasCapability"
import { RepoPermissionProvider } from "../context/RepoPermissionContext"
import type { RepositoryRole } from "@/lib/auth/permissions"

interface TeamCardProps {
  role : RepositoryRole
  team: Team
  childCount: number
  onCreateSubTeam: (team: Team) => void
  onAddMember: (team: Team) => void
  onEdit: (team: Team) => void
  onDelete: (team: Team) => void
}

export default function TeamCard({
  role,
  team,
  childCount,
  onCreateSubTeam,
  onAddMember,
  onEdit,
  onDelete,
}: TeamCardProps) {
  return (
    <RepoPermissionProvider role = {role}>
      <div className="group relative w-72 rounded-2xl border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <GitBranch className="size-5" />
          </div>

          <div className="flex items-center gap-2">
            {childCount > 0 && (
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                {childCount}{" "}
                {childCount === 1 ? "sub-team" : "sub-teams"}
              </span>
            )}

            {/* Team actions */}
            <HasCapability capability="canManageTeams">
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                  >
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">
                      Team actions
                    </span>
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => onEdit(team)}
                  >
                    <Pencil className="mr-2 size-4" />
                    Edit team
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDelete(team)}
                  >
                    <Trash2 className="mr-2 size-4" />
                    Delete team
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              </HasCapability>
          </div>
        </div>

        {/* Team name */}
        <h3 className="mt-4 text-lg font-semibold">
          {team.name}
        </h3>


        {/* Members */}
        <TeamMembers members={team.members} />

        {/* Actions */}
        <HasCapability capability="canManageTeams">
          <div className="mt-5 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCreateSubTeam(team)}
              className="flex-1 gap-1.5"
            >
              <Plus className="size-3.5" />
              Sub-team
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddMember(team)}
              className="gap-1.5"
            >
              <UserPlus className="size-3.5" />
            </Button>
          </div>
        </HasCapability>
      </div>
    </RepoPermissionProvider>
  )
}