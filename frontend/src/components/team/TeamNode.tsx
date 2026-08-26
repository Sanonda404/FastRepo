import type { Team } from "@/lib/interfaces"
import TeamCard from "./TeamCard"

interface TeamNodeProps {
  team: Team
  childrenMap: Map<number, Team[]>
  onCreateSubTeam: (team: Team) => void
  onAddMember: (team: Team) => void
  onEdit: (team: Team) => void
  onDelete: (team: Team) => void
}

export default function TeamNode({
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
          <div className="h-8 w-px bg-border" />

          {/* Horizontal connection */}
          <div className="relative flex gap-8 border-t border-border pt-8">
            {children.map((child) => (
              <div
                key={child.id}
                className="relative"
              >
                {/* Connection to child */}
                <div className="absolute -top-8 left-1/2 h-8 w-px bg-border" />

                <TeamNode
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