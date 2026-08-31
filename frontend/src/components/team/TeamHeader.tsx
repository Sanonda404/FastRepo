import { UsersRound, Plus} from "lucide-react"
import { Button } from "@/components/ui/button"
import { HasCapability } from "../guards/HasCapability"
import { RepoPermissionProvider } from "@/components/context/RepoPermissionContext"
import type { RepositoryRole } from '@/lib/auth/permissions';

interface TeamHeaderProps {
  role : RepositoryRole
  onCreateTeam: () => void
  onAddMember: () => void
}

export default function TeamHeader({
  role,
  onCreateTeam,
  onAddMember,
}: TeamHeaderProps) {
  return (
    <RepoPermissionProvider role = {role}>
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

        {/* Visible only to Admins and Owners */}
        <HasCapability capability="canManageTeams">
          <Button
          onClick={onCreateTeam}
          className="gap-2 bg-green-600 text-white hover:bg-green-700"
        >
          <Plus className="size-4" />
          Create team
        </Button>
        </HasCapability>
        
      </div>
    </div>
    </RepoPermissionProvider>
  )
}