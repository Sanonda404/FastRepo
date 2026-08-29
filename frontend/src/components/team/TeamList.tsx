import type { Team } from "@/lib/interfaces"
import { HasCapability } from "../guards/HasCapability"
import { RepoPermissionProvider } from "@/components/context/RepoPermissionContext"
import TeamMembers from "./TeamMembers"
import type { RepositoryRole } from '../../lib/auth/permissions';

interface TeamListProps {
  role : RepositoryRole,
  teams: Team[]
  onAddMember: (team: Team) => void
}

export default function TeamList({
  role,
  teams,
  onAddMember,
}: TeamListProps) {
  return (
    <RepoPermissionProvider role = {role as RepositoryRole}>
      <div className="divide-y rounded-2xl border bg-card">
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

            <HasCapability capability="canManageTeams">
              <button
                onClick={() => onAddMember(team)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Add member
              </button>
            </HasCapability>
          </div>
        ))}
      </div>
    </RepoPermissionProvider>
  )
}