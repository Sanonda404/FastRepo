import DocsSection from "./DocsSection"
import { CircleDot, Tag, UserPlus, MessageSquare, GitPullRequest } from "lucide-react"

export default function IssueDocs() {
  return (
    <DocsSection
      id="issues"
      title="Issues and pull requests"
      description="Track repository work using issues and collaborate through labels, assignees, and comments."
    >
      <div className="space-y-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Feature
            icon={CircleDot}
            title="Issues"
            text="Create and track repository tasks and problems."
          />

          <Feature
            icon={Tag}
            title="Labels"
            text="Organize issues using labels."
          />

          <Feature
            icon={UserPlus}
            title="Assignees"
            text="Assign collaborators to issues."
          />

          <Feature
            icon={MessageSquare}
            title="Comments"
            text="Discuss work directly inside an issue."
          />
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-semibold">
            Issue permissions
          </h3>

          <ul className="mt-4 space-y-2 text-sm leading-6 text-muted-foreground">
            <li>
              • Labels and assignees can be managed by collaborators
              other than viewers.
            </li>

            <li>
              • Issues can be created by repository users according to
              repository access rules.
            </li>

            <li>
              • Issues and issue comments can be deleted by their author.
            </li>

            <li>
              • Any collaborator other than a viewer can also delete
              issues and comments.
            </li>

            <li>
              • Viewers can delete issues or comments they created.
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-dashed bg-muted/20 p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-green-600/10 text-green-600">
              <GitPullRequest className="size-5" />
            </div>

            <div>
              <h3 className="font-semibold">
                Pull requests
              </h3>

              <p className="mt-1 text-sm text-muted-foreground">
                Coming soon.
              </p>
            </div>
          </div>
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
  icon: typeof CircleDot
  title: string
  text: string
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <Icon className="size-5 text-green-600" />

      <h3 className="mt-3 text-sm font-semibold">
        {title}
      </h3>

      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        {text}
      </p>
    </div>
  )
}