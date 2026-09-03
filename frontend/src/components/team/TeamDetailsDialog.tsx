import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  Shield,
  GitBranch,
  User,
  Folder
} from "lucide-react"

import type { Team, PermissionResponse } from "@/lib/interfaces"
import type { RepositoryRole } from "@/lib/auth/permissions"


interface TeamDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void

  team: Team | null

  /**
   * Current user's repository/team permission.
   * Used only to decide whether permission details are visible.
   */
  currentUserRole: RepositoryRole

  permissions?: PermissionResponse[]
}

export function TeamDetailsDialog({
  open,
  onOpenChange,
  team,
  currentUserRole,
  permissions,
}: TeamDetailsDialogProps) {
  if (!team) return null

  const canViewPermissions =
    currentUserRole === "Owner" ||
    currentUserRole === "Admin" ||
    currentUserRole === "Maintainer"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10 text-green-500">
              <Users className="h-6 w-6" />
            </div>

            <div className="min-w-0 flex-1">
              <DialogTitle className="text-xl">
                {team.name}
              </DialogTitle>

              <DialogDescription className="mt-1">
                Team details, members and permissions
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Team overview */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <InfoCard
              icon={<Users className="h-4 w-4" />}
              label="Members"
              value={team.members.length.toString()}
            />

            <InfoCard
              icon={<GitBranch className="h-4 w-4" />}
              label="Team type"
              value={team.parent_team_id ? "Sub-team" : "Root team"}
            />

            <InfoCard
              icon={<Shield className="h-4 w-4" />}
              label="Your role"
              value={currentUserRole}
            />
          </div>

          {/* Members */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />

              <h3 className="font-semibold">Team Members</h3>

              <Badge variant="secondary">{team.members.length}</Badge>
            </div>

            {team.members.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No members have been added to this team yet.
              </div>
            ) : (
              <div className="divide-y rounded-lg border">
                {team.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>

                      <div>
                        <p className="text-sm font-medium">
                          {member.username}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Collaborator #{member.collaborator_id}
                        </p>
                      </div>
                    </div>

                    <Badge variant="outline">Member</Badge>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Permissions */}
          {canViewPermissions && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />

                <div>
                  <h3 className="font-semibold">Team Permissions</h3>
                  <p className="text-xs text-muted-foreground">
                    Permissions granted to members of this team
                  </p>
                </div>
              </div>

              {permissions && permissions.length > 0 ? (
                <div className="space-y-2">
                  {permissions.map((permission) => (
                    <PermissionRow
                      key={permission.id}
                      permission={permission}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
                  This team has no specific permissions configured.
                </div>
              )}
            </section>
          )}

        </div>
      </DialogContent>
    </Dialog>
  )
}


interface InfoCardProps {
  icon: React.ReactNode
  label: string
  value: string
}

function InfoCard({
  icon,
  label,
  value,
}: InfoCardProps) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs">
          {label}
        </span>
      </div>

      <p className="text-sm font-semibold">
        {value}
      </p>
    </div>
  )
}

interface PermissionRowProps {
  permission: PermissionResponse
}

function PermissionRow({
  permission,
}: PermissionRowProps) {
  const isBranch = permission.target_type === "branch"

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          {isBranch ? (
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Folder className="h-4 w-4 text-muted-foreground" />
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs capitalize text-muted-foreground">
              {permission.target_type}
            </span>

            <span className="text-sm font-medium truncate">
              {permission.target_identifier}
            </span>
          </div>

          <p className="text-xs text-muted-foreground">
            {permission.allow_write
              ? "Team members can write"
              : "Read only access"}
          </p>
        </div>
      </div>

      <Badge
        variant={permission.allow_write ? "default" : "secondary"}
        className="shrink-0"
      >
        {permission.allow_write ? "Write" : "Read only"}
      </Badge>
    </div>
  )
}