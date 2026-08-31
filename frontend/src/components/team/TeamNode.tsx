import type { Team } from "@/lib/interfaces"
import TeamCard from "./TeamCard"
import type { RepositoryRole } from "@/lib/auth/permissions"

interface TeamNodeProps {
  role : RepositoryRole
  team: Team
  childrenMap: Map<number, Team[]>
  onCreateSubTeam: (team: Team) => void
  onAddMember: (team: Team) => void
  onEdit: (team: Team) => void
  onDelete: (team: Team) => void
}

export default function TeamNode({
  role,
  team,
  childrenMap,
  onCreateSubTeam,
  onAddMember,
  onEdit,
  onDelete,
}: TeamNodeProps) {
  const children = childrenMap.get(team.id) ?? []

  return (
    <div className="flex flex-col items-center">
      <TeamCard
        role={role}
        team={team}
        childCount={children.length}
        onCreateSubTeam={onCreateSubTeam}
        onAddMember={onAddMember}
        onEdit={onEdit}
        onDelete={onDelete}
      />

      {children.length > 0 && (
        <>
          {/* Vertical connection */}
          <div className="h-8 w-px bg-foreground/10" />

          {/* Horizontal connection */}
          <div className="relative flex gap-8 border-t border-foreground/10 pt-8">
            {children.map((child) => (
              <div
                key={child.id}
                className="relative"
              >
                {/* Connection to child */}
                <div className="absolute -top-8 left-1/2 h-8 w-px bg-foreground/10" />

                <TeamNode
                  role={role}
                  team={child}
                  childrenMap={childrenMap}
                  onCreateSubTeam={onCreateSubTeam}
                  onAddMember={onAddMember}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}