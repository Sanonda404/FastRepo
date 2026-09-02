import {
  Users,
  Tag,
  MessageCircle,
  GitPullRequest,
} from "lucide-react"

import type { Issue } from "@/lib/interfaces"

import IssueMetadata from "@/components/issues/IssueMetadata"
import IssueStatus from "@/components/issues/IssueStatus"

import IssueStatCard from "./IssueStatCard"

type Props = {
  issue: Issue
}

export default function IssueHeader({
  issue,
}: Props) {
  return (
    <section className="
      overflow-hidden
      rounded-2xl
      border
      bg-card
      shadow-sm
    ">
      <div className="p-6">
        <div className="
          flex
          flex-wrap
          items-start
          gap-4
        ">
          <IssueStatus status={issue.state} />

          <div className="min-w-0 flex-1">
            <div className="
              flex
              flex-wrap
              items-center
              gap-2
            ">
              <h1 className="
                text-2xl
                font-bold
                tracking-tight
              ">
                {issue.title}
              </h1>

              <span className="
                text-xl
                font-medium
                text-muted-foreground
              ">
                #{issue.id}
              </span>
            </div>

            <div className="mt-3">
              <IssueMetadata
                author={
                  issue.author_username
                }
                createdAt={
                  issue.created_at
                }
                closedAt={
                  issue.closed_at ||
                  undefined
                }
              />
            </div>
          </div>
        </div>

        <div className="
          mt-6
          grid
          grid-cols-2
          gap-3
          sm:grid-cols-4
        ">
          <IssueStatCard
            icon={
              <Users className="size-4" />
            }
            label="Assignees"
            value={
              issue.assignees.length
            }
          />

          <IssueStatCard
            icon={
              <Tag className="size-4" />
            }
            label="Labels"
            value={
              issue.labels.length
            }
          />

          <IssueStatCard
            icon={
              <MessageCircle className="size-4" />
            }
            label="Comments"
            value={
              issue.comments_count
            }
          />

          <IssueStatCard
            icon={
              <GitPullRequest className="size-4" />
            }
            label="Pull requests"
            value={
              issue.pull_requests_count
            }
          />
        </div>
      </div>
    </section>
  )
}