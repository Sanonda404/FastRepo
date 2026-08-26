import { UsersRound, Plus, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TeamHeaderProps {
  onCreateTeam: () => void
  onAddMember: () => void
}

export default function TeamHeader({
  onCreateTeam,
  onAddMember,
}: TeamHeaderProps) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <UsersRound className="size-6" />
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Teams
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Organize your repository into hierarchical teams and
            manage who belongs to each team.
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={onAddMember}
          className="gap-2"
        >
          <UserPlus className="size-4" />
          Add member
        </Button>

        <Button
          onClick={onCreateTeam}
          className="gap-2 bg-green-600 text-white hover:bg-green-700"
        >
          <Plus className="size-4" />
          Create team
        </Button>
      </div>
    </div>
  )
}