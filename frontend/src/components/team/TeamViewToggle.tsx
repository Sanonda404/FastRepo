import { GitBranch, List } from "lucide-react"
import { Button } from "@/components/ui/button"

export type TeamView = "hierarchy" | "list"

interface TeamViewToggleProps {
  view: TeamView
  onChange: (view: TeamView) => void
}

export default function TeamViewToggle({
  view,
  onChange,
}: TeamViewToggleProps) {
  return (
    <div className="inline-flex rounded-lg border bg-muted/40 p-1">
      <Button
        type="button"
        variant={view === "hierarchy" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => onChange("hierarchy")}
        className="gap-2"
      >
        <GitBranch className="size-4" />
        Hierarchy
      </Button>

      <Button
        type="button"
        variant={view === "list" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => onChange("list")}
        className="gap-2"
      >
        <List className="size-4" />
        Team list
      </Button>
    </div>
  )
}