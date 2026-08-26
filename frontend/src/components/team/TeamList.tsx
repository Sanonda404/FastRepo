import type { Team } from "@/lib/interfaces"
import TeamMembers from "./TeamMembers"

interface TeamListProps {
  teams: Team[]
  onAddMember: (team: Team) => void
}

export default function TeamList({
  teams,
  onAddMember,
}: TeamListProps) {
  return (
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

          <button
            onClick={() => onAddMember(team)}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Add member
          </button>
        </div>
      ))}
    </div>
  )
}