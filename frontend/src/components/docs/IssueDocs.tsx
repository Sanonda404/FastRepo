import DocsSection from "./DocsSection"
import { CircleDot, Tag, UserPlus, MessageSquare, GitPullRequest, GitBranch, Link2, Eye, GitMerge } from "lucide-react"

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

        <div className="rounded-xl border border-foreground/10 bg-card p-5">
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

        <div>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-green-600/10 text-green-600">
              <GitPullRequest className="size-5" />
            </div>

            <div>
              <h3 className="font-semibold">
                Pull requests
              </h3>

              <p className="mt-1 text-sm text-muted-foreground">
                Propose, review, and merge branch changes.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Feature
              icon={GitBranch}
              title="Create"
              text="Open a pull request between branches, from a fork, or directly from an issue."
            />

            <Feature
              icon={Link2}
              title="Linked issues"
              text="Link existing issues to a pull request to track what it resolves."
            />

            <Feature
              icon={Eye}
              title="Reviews"
              text="Reviewers can approve or request changes before anything merges."
            />

            <Feature
              icon={GitMerge}
              title="Merge"
              text="Merge when ready. Merged pull requests cannot be reopened."
            />
          </div>

          <div className="mt-4 rounded-xl border border-foreground/10 bg-card p-5">
            <h3 className="font-semibold">
              Pull request permissions
            </h3>

            <ul className="mt-4 space-y-2 text-sm leading-6 text-muted-foreground">
              <li>
                • Pull requests can be opened by the repository owner,
                admins, maintainers, and members with push access to
                the source branch.
              </li>

              <li>
                • Viewers and non-collaborators cannot open pull
                requests.
              </li>

              <li>
                • Issues can be linked to a pull request by its author,
                the repository owner, an admin, or a maintainer.
              </li>

              <li>
                • Pull requests can be created directly from an issue,
                pre-filling the source branch.
              </li>

              <li>
                • Merged pull requests cannot be reopened.
              </li>
            </ul>
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
    <div className="rounded-xl border border-foreground/10 bg-card p-4">
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