import {
  Users,
} from "lucide-react"

import type {
  CollaboratorResponse,
  IssueAssigneeResponse,
} from "@/lib/interfaces"

import type {
  IssueAssigneeInput,
} from "@/lib/schemas/issue"

import { HasRole } from "@/components/guards/HasRole"
import { useAuth } from "@/lib/auth/use-auth"
import { useRepoPermissions } from "@/lib/auth/RepoPermissionManager"
import { Button } from "@/components/ui/button"

import IssueAssigneeDialog from "./IssueAssigneeDialog"
import IssueEmptyState from "./IssueEmptyState"

type Props = {
  owner: string
  assignees: IssueAssigneeResponse[]
  collaborators: CollaboratorResponse[]
  mutating: boolean
  isClosed?: boolean
  onAdd: (
    data: IssueAssigneeInput
  ) => Promise<void>
  onRemove: (
    username: string
  ) => Promise<void>
}

export default function IssueAssignees({
  owner,
  assignees,
  collaborators,
  mutating,
  isClosed = false,
  onAdd,
  onRemove,
}: Props) {
  const { username: currentUsername } = useAuth()
  const { role } = useRepoPermissions()
  const isSelfAssigned = !!currentUsername && assignees.some((a) => a.username === currentUsername)
  const canSelfAssign =
    !!currentUsername &&
    !isSelfAssigned &&
    !isClosed &&
    !mutating &&
    role !== "Viewer" &&
    role !== null

  return (
    <section className="
      overflow-hidden
      rounded-xl
      bg-card
      ring-1 ring-foreground/10
    ">
      <div className="
        flex
        items-center
        justify-between
        border-b border-foreground/10
        bg-muted/20
        px-5 py-4
      ">
        <div>
          <div className="
            flex
            items-center
            gap-2
          ">
            <Users className="size-4" />

            <h2 className="
              text-sm
              font-semibold
            ">
              Assignees
            </h2>
          </div>

          <p className="
            mt-1
            text-xs
            text-muted-foreground
          ">
            {assignees.length === 0
              ? "Nobody is assigned yet"
              : `${assignees.length} ${
                  assignees.length === 1
                    ? "person"
                    : "people"
                } working on this issue`}
          </p>
        </div>

        {!isClosed && (
          <div className="flex items-center gap-2">
            {canSelfAssign && (
              <Button
                variant="outline"
                size="sm"
                disabled={mutating}
                onClick={() => onAdd({ username: currentUsername! })}
                className="rounded-lg text-xs"
              >
                Assign to me
              </Button>
            )}
            <HasRole
              roles={[
                "Owner",
                "Admin",
                "Maintainer",
                "Member",
              ]}
            >
              <IssueAssigneeDialog
                loading={mutating}
                owner={owner}
                collaborators={collaborators}
                assignedUsernames={assignees.map(
                  (a) => a.username
                )}
                onSubmit={onAdd}
              />
            </HasRole>
          </div>
        )}
      </div>

      <div className="p-4">
        {assignees.length === 0 ? (
          <IssueEmptyState
            icon={
              <Users className="size-5" />
            }
            title="No assignees"
            description="
              Assign a collaborator to start
              working on this issue.
            "
          />
        ) : (
          <div className="space-y-2">
            {isClosed && assignees.length > 0 && (
              <p className="mb-2 text-xs text-muted-foreground">
                Closed issue — assignees are locked.
              </p>
            )}
            {assignees.map(
              (assignee) => (
                <div
                  key={
                    assignee.username
                  }
                  className="
                    group
                    flex
                    items-center
                    justify-between
                    rounded-xl
                    border border-foreground/10
                    bg-background
                    px-3 py-2.5
                    transition-colors
                    hover:bg-muted/30
                  "
                >
                  <div className="
                    flex
                    min-w-0
                    items-center
                    gap-3
                  ">
                    <div className="
                      flex
                      size-8
                      shrink-0
                      items-center
                      justify-center
                      rounded-full
                      bg-primary/10
                      text-xs
                      font-bold
                      text-primary
                    ">
                      {assignee.username
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <span className="
                      truncate
                      text-sm
                      font-medium
                    ">
                      {assignee.username}
                    </span>
                  </div>

                  {assignee.username === currentUsername ? (
                    <button
                      type="button"
                      disabled={mutating || isClosed}
                      onClick={() => onRemove(assignee.username)}
                      className="
                        rounded-lg
                        p-1.5
                        text-muted-foreground
                        opacity-0
                        transition-all
                        group-hover:opacity-100
                        hover:bg-destructive/10
                        hover:text-destructive
                        disabled:pointer-events-none
                        disabled:opacity-30
                      "
                      title="Remove assignee"
                    >
                      <span className="sr-only">Remove assignee</span>×
                    </button>
                  ) : (
                    <HasRole roles={["Owner", "Admin", "Maintainer", "Member"]}>
                      <button
                        type="button"
                        disabled={mutating || isClosed}
                        onClick={() => onRemove(assignee.username)}
                        className="
                          rounded-lg
                          p-1.5
                          text-muted-foreground
                          opacity-0
                          transition-all
                          group-hover:opacity-100
                          hover:bg-destructive/10
                          hover:text-destructive
                          disabled:pointer-events-none
                          disabled:opacity-30
                        "
                        title="Remove assignee"
                      >
                        <span className="sr-only">Remove assignee</span>×
                      </button>
                    </HasRole>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </div>
    </section>
  )
}