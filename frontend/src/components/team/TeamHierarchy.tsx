import { useState } from "react"
import { GitBranch, Minus, Plus, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import TeamNode from "./TeamNode"
import type { RepositoryRole } from "@/lib/auth/permissions"
import type { Team } from "@/lib/interfaces"

const MIN_ZOOM = 0.4
const MAX_ZOOM = 1.5
const ZOOM_STEP = 0.1


interface TeamHierarchyProps {
  role: RepositoryRole
  teams: Team[]
  onCreateSubTeam: (team: Team) => void
  onAddMember: (team: Team) => void
  onEdit: (team: Team) => void
  onDelete: (team: Team) => void
  onViewDetails: (team: Team) => void
}

export default function TeamHierarchy({
  role,
  teams,
  onCreateSubTeam,
  onAddMember,
  onEdit,
  onDelete,
  onViewDetails,
}: TeamHierarchyProps) {
  const [zoom, setZoom] = useState(1)

  const zoomIn = () => {
    setZoom((prev) => Math.min(MAX_ZOOM, prev + ZOOM_STEP))
  }

  const zoomOut = () => {
    setZoom((prev) => Math.max(MIN_ZOOM, prev - ZOOM_STEP))
  }

  const resetZoom = () => {
    setZoom(1)
  }

  const childrenMap = new Map<number, Team[]>()

  teams.forEach((team) => {
    if (!childrenMap.has(team.parent_team_id ?? 0)) {
      childrenMap.set(team.parent_team_id ?? 0, [])
    }

    childrenMap.get(team.parent_team_id ?? 0)!.push(team)
  })

  const rootTeams = childrenMap.get(0) ?? []

  return (
    <div className="space-y-4">
      {/* Header / Zoom Controls */}
      <div className="flex items-center justify-between rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-muted-foreground" />

          <span className="text-sm font-medium">
            Team Hierarchy
          </span>

          <span className="text-xs text-muted-foreground">
            {teams.length} teams
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={zoomOut}
            disabled={zoom <= MIN_ZOOM}
          >
            <Minus className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            className="h-8 min-w-16 px-2 text-xs"
            onClick={resetZoom}
          >
            {Math.round(zoom * 100)}%
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={zoomIn}
            disabled={zoom >= MAX_ZOOM}
          >
            <Plus className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="ml-1 h-8 w-8"
            onClick={resetZoom}
            title="Reset zoom"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Hierarchy */}
      <div className="max-h-175 overflow-auto rounded-xl bg-card ring-1 ring-foreground/10">
        <div className="flex min-w-max justify-center p-10">
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "top center",
            }}
          >
            <div className="flex justify-center gap-12">
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
                  onViewDetails={onViewDetails}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
