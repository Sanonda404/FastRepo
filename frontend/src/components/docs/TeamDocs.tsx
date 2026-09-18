import DocsSection from "./DocsSection"
import { GitBranch, Users, Network } from "lucide-react"

export default function TeamDocs() {
  return (
    <DocsSection
      id="teams"
      title="Teams and nested teams"
      description="Teams allow repository members to be organized according to the structure of a real project or organization."
    >
      <div className="space-y-6 text-sm leading-7 text-muted-foreground">
        <div className="grid gap-4 sm:grid-cols-3">
          <Info
            icon={Users}
            title="Multiple teams"
            text="A collaborator can belong to more than one team."
          />

          <Info
            icon={Network}
            title="Nested structure"
            text="Teams can be organized using parent and child relationships."
          />

          <Info
            icon={GitBranch}
            title="Inherited access"
            text="Team permissions are inherited through the hierarchy."
          />
        </div>

        <div>
          <h3 className="text-base font-semibold text-foreground">
            Nested teams
          </h3>

          <p className="mt-2">
            Teams can be organized in a parent-child hierarchy. A parent
            team includes the permissions inherited from its child teams.
          </p>

          <div className="mt-4 rounded-xl bg-muted/30 p-5 font-mono text-sm text-foreground ring-1 ring-foreground/10">
            Development
            <br />
            ├── Frontend
            <br />
            ├── Backend
            <br />
            └── AI Team
          </div>
        </div>

        <div>
          <h3 className="text-base font-semibold text-foreground">
            Managing teams
          </h3>

          <p className="mt-2">
            Only repository owners and administrators can create and
            manage teams and add or remove team members.
          </p>

          <p className="mt-2">
            Members receive their repository access through the
            permissions assigned to their teams.
          </p>
        </div>
      </div>
    </DocsSection>
  )
}

function Info({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Users
  title: string
  text: string
}) {
  return (
    <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
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