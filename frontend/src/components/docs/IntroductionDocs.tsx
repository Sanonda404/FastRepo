import DocsSection from "./DocsSection"
import { GitBranch, Users, ShieldCheck } from "lucide-react"

export default function IntroductionDocs() {
  return (
    <DocsSection
      id="introduction"
      title="What is FastRepo?"
      description="FastRepo is a team-focused code collaboration platform designed to work alongside your existing Git workflow."
    >
      <div className="space-y-5 text-sm leading-7 text-muted-foreground">
        <p>
          FastRepo is designed for projects where repository-level
          permissions alone are not enough. It adds team-aware
          collaboration features such as nested teams and permissions
          for specific branches and folders.
        </p>

        <p>
          You can continue using Git and your normal repository workflow
          while using FastRepo to manage how people and teams collaborate
          inside a project.
        </p>

        <div className="grid gap-4 sm:grid-cols-3">
          <Feature
            icon={GitBranch}
            title="Works with Git workflows"
            text="Use familiar repository and Git commands."
          />

          <Feature
            icon={Users}
            title="Team-aware access"
            text="Organize collaborators into teams and nested teams."
          />

          <Feature
            icon={ShieldCheck}
            title="Fine-grained permissions"
            text="Control write access for branches and folders."
          />
        </div>
      </div>
    </DocsSection>
  )
}

function Feature({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof GitBranch
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