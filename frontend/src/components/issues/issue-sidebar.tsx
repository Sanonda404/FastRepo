import { useState } from "react"
import { Check, ChevronDown, Tag, UserRound, UsersRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { MockIssue } from "./mock-issues"
import IssueLabel from "./issue-label"

export default function IssueSidebar({ issue }: { issue: MockIssue }) {
  const [assignees, setAssignees] = useState(issue.assignees)
  const [labels, setLabels] = useState(issue.labels)

  const toggleAssignee = (user: string) => {
    setAssignees((current) =>
      current.includes(user)
        ? current.filter((item) => item !== user)
        : [...current, user],
    )
  }

  const toggleLabel = (label: string) => {
    setLabels((current) =>
      current.includes(label)
        ? current.filter((item) => item !== label)
        : [...current, label],
    )
  }

  return (
    <aside className="space-y-5">
      <IssueMetadataSection
        icon={<UserRound className="size-4" />}
        title="Assignees"
        action="Edit"
      >
        <div className="space-y-2">
          {assignees.map((user) => (
            <div key={user} className="flex items-center gap-2 text-sm">
              <div className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {user.charAt(0).toUpperCase()}
              </div>
              {user}
            </div>
          ))}

          {!assignees.length && (
            <p className="text-sm text-muted-foreground">No assignees.</p>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {["jane", "alex", "maria"].map((user) => (
              <Button
                key={user}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => toggleAssignee(user)}
                className="h-8 gap-1"
              >
                {assignees.includes(user) && <Check className="size-3" />}
                {user}
              </Button>
            ))}
          </div>
        </div>
      </IssueMetadataSection>

      <IssueMetadataSection
        icon={<Tag className="size-4" />}
        title="Labels"
        action="Edit"
      >
        <div className="flex flex-wrap gap-2">
          {labels.map((label) => (
            <IssueLabel key={label} label={label} />
          ))}
          {!labels.length && (
            <span className="text-sm text-muted-foreground">
              No labels.
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {["bug", "feature", "enhancement", "security", "documentation"].map(
            (label) => (
              <Button
                key={label}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => toggleLabel(label)}
                className="h-8 gap-1"
              >
                {labels.includes(label) && <Check className="size-3" />}
                {label}
              </Button>
            ),
          )}
        </div>
      </IssueMetadataSection>

      <IssueMetadataSection
        icon={<UsersRound className="size-4" />}
        title="Team"
        action="Edit"
      >
        <button className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm hover:bg-muted">
          <span>Engineering</span>
          <ChevronDown className="size-4 text-muted-foreground" />
        </button>
      </IssueMetadataSection>

      <IssueMetadataSection
        icon={<Check className="size-4" />}
        title="Development"
        action=""
      >
        <div className="rounded-lg bg-muted/50 p-3 text-sm">
          <p className="font-medium">No linked branches</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Pull requests created from this issue will appear here.
          </p>
        </div>
      </IssueMetadataSection>
    </aside>
  )
}

function IssueMetadataSection({
  icon,
  title,
  action,
  children,
}: {
  icon: React.ReactNode
  title: string
  action: string
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between text-sm">
        <h2 className="flex items-center gap-2 font-semibold">
          {icon}
          {title}
        </h2>
        {action && (
          <button className="text-xs text-muted-foreground hover:text-foreground">
            {action}
          </button>
        )}
      </div>
      {children}
    </section>
  )
}
