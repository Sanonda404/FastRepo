import DocsSection from "./DocsSection"
import { Folder, GitBranch, ShieldCheck, Users } from "lucide-react"

export default function PermissionDocs() {
  return (
    <DocsSection
      id="permissions"
      title="Folder and branch permissions"
      description="FastRepo permissions are assigned to teams and can control write access to repository branches and folders."
    >
      <div className="space-y-6 text-sm leading-7 text-muted-foreground">
        <div className="grid gap-4 sm:grid-cols-3">
          <PermissionCard
            icon={Users}
            title="Team-based"
            text="Permissions are assigned to teams rather than individual users."
          />

          <PermissionCard
            icon={GitBranch}
            title="Branch rules"
            text="Control whether a team can write to a specific branch."
          />

          <PermissionCard
            icon={Folder}
            title="Folder rules"
            text="Control write access for a folder and everything inside it."
          />
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-semibold text-foreground">
            Permission inheritance
          </h3>

          <p className="mt-2">
            Permissions are inherited through the team hierarchy. A
            member can also receive permissions from multiple teams.
          </p>
        </div>

        <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-5">
          <div className="flex gap-3">
            <ShieldCheck className="size-5 shrink-0 text-orange-600" />

            <div>
              <h3 className="font-semibold text-foreground">
                Conflicting permissions
              </h3>

              <p className="mt-1">
                When permissions conflict, FastRepo treats the conflict
                as no write access by default. A deny or no-write rule
                takes priority.
              </p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-foreground">
            Folder inheritance
          </h3>

          <p className="mt-2">
            When a team receives a permission for a folder, that
            permission automatically applies to all files and
            subfolders inside that folder.
          </p>
        </div>
      </div>
    </DocsSection>
  )
}

function PermissionCard({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Folder
  title: string
  text: string
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <Icon className="size-5 text-green-600" />

      <h3 className="mt-3 text-sm font-semibold text-foreground">
        {title}
      </h3>

      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        {text}
      </p>
    </div>
  )
}