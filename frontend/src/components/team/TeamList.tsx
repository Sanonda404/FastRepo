import type { Team } from "@/lib/interfaces"
import { HasCapability } from "../guards/HasCapability"
import { RepoPermissionProvider } from "@/components/context/RepoPermissionContext"
import TeamMembers from "./TeamMembers"
import type { RepositoryRole } from '../../lib/auth/permissions';
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Info, MoreHorizontal, Pencil, Trash2, UserPlus } from "lucide-react";

interface TeamListProps {
  role : RepositoryRole,
  teams: Team[]
  onAddMember: (team: Team) => void
  onViewDetails: (team: Team) => void
  onEdit: (team: Team) => void
  onDelete: (team: Team) => void
}

export default function TeamList({
  role,
  teams,
  onAddMember,
  onViewDetails,
  onEdit,
  onDelete,
}: TeamListProps) {
  return (
    <RepoPermissionProvider role = {role as RepositoryRole}>
      <div className="divide-y divide-foreground/10 rounded-xl bg-card ring-1 ring-foreground/10">
        {teams.map((team) => (
          <div
            key={team.id}
            className="flex items-center justify-between gap-4 p-5"
          >
            <div>
              <h3 className="font-semibold">
                {team.name}
              </h3>

              {team.parent_team_id !== null && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Sub-team of team #{team.parent_team_id}
                </p>
              )}

              <TeamMembers members={team.members} />
            </div>

            <div className="mt-4 flex items-center gap-2">
              {/* Add member */}
              <HasCapability capability="canManageTeams">
                <Button
                  onClick={() => onAddMember(team)}
                  variant="secondary"
                  size="sm"
                  className="flex items-center gap-1.5"
                >
                  <UserPlus className="size-4" />
                  Add member
                </Button>
              </HasCapability>

              {/* View details */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewDetails(team)}
                className="flex items-center gap-1.5"
              >
                <Info className="size-4" />
                Details
              </Button>

              {/* Team actions dropdown */}
              <HasCapability capability="canManageTeams">
                <DropdownMenu>
                  <DropdownMenuTrigger >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                    >
                      <MoreHorizontal className="size-4" />
                      <span className="sr-only">Team actions</span>
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(team)}>
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
        ))}
      </div>
    </RepoPermissionProvider>
  )
}