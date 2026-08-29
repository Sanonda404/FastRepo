import { GitBranch } from "lucide-react"

import type { Team } from "@/lib/interfaces"
import TeamNode from "./TeamNode"
import type { RepositoryRole } from "@/lib/auth/permissions"

interface TeamHierarchyProps {
  role : RepositoryRole,
  teams: Team[]
  onCreateSubTeam: (team: Team) => void
  onAddMember: (team: Team) => void
  onEdit: (team: Team) => void
  onDelete: (team: Team) => void
}

export default function TeamHierarchy({
  role,
  teams,
  onCreateSubTeam,
  onAddMember,
  onEdit,
  onDelete,
}: TeamHierarchyProps) {
  const childrenMap = new Map<number, Team[]>()

  teams.forEach((team) => {
    if (team.parent_team_id === null) return

    const children = childrenMap.get(team.parent_team_id) ?? []

    children.push(team)

    childrenMap.set(team.parent_team_id, children)
  })

  const rootTeams = teams.filter(
    (team) => team.parent_team_id === null,
  )

  if (teams.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed p-12 text-center">
        <GitBranch className="mx-auto size-10 text-muted-foreground" />

        <h3 className="mt-4 font-semibold">
          No teams yet
        </h3>

        <p className="mt-1 text-sm text-muted-foreground">
          Create your first team to start building your
          repository hierarchy.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border bg-muted/20 p-10">
      <div className="flex min-w-max justify-center gap-12">
        {rootTeams.map((team) => (
         <TeamNode
            role = {role}
            key={team.id}
            team={team}
            childrenMap={childrenMap}
            onCreateSubTeam={onCreateSubTeam}
            onAddMember={onAddMember}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  )
}