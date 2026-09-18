import { Link } from "react-router-dom"
import {
  Users,
  Tag,
  MessageCircle,
  GitPullRequest,
} from "lucide-react"

import type { Issue } from "@/lib/interfaces"

import IssueMetadata from "@/components/issues/IssueMetadata"
import IssueStatus from "@/components/issues/IssueStatus"
import { HasCapability } from "@/components/guards/HasCapability"

import IssueStatCard from "./IssueStatCard"

type Props = {
  issue: Issue
  owner: string
  repository: string
}

export default function IssueHeader({
  issue,
  owner,
  repository,
}: Props) {
  console.log(owner, repository)
  return (
    <section className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="p-6">
        <div className="flex flex-wrap items-start gap-4">
          <IssueStatus status={issue.state} />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {issue.title}
              </h1>

              <span className="text-xl font-medium text-muted-foreground">
                #{issue.number}
              </span>
            </div>

            <div className="mt-3">
              <IssueMetadata
                author={issue.author_username}
                createdAt={issue.created_at}
                closedAt={issue.closed_at || undefined}
              />
            </div>
          </div>

          <HasCapability capability="canOpenPullRequest">
            <Link
              to={`/${owner}/${repository}/pulls/new/issue?issue_id=${issue.id}`}
              className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-green-600 px-3 text-sm font-medium text-white transition-colors hover:bg-green-700"
            >
              <GitPullRequest className="size-4" />
              Create Pull Request
            </Link>
          </HasCapability>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <IssueStatCard
            icon={<Users className="size-4" />}
            label="Assignees"
            value={issue.assignees.length}
          />

          <IssueStatCard
            icon={<Tag className="size-4" />}
            label="Labels"
            value={issue.labels.length}
          />

          <IssueStatCard
            icon={<MessageCircle className="size-4" />}
            label="Comments"
            value={issue.comments_count}
          />

          <IssueStatCard
            icon={<GitPullRequest className="size-4" />}
            label="Pull requests"
            value={issue.pull_requests_count}
          />
        </div>
      </div>
    </section>
  )
}