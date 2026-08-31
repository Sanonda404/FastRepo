import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft } from "lucide-react"

import { getErrorMessage } from "@/lib/apis/api"
import { getIssue } from "@/lib/apis/issue_apis"
import IssueActivity from "@/components/issues/IssueActivity"
import IssueLabels from "@/components/issues/IssueLabels"
import IssueMetadata from "@/components/issues/IssueMetadata"
import IssueStatus from "@/components/issues/IssueStatus"
import type { Issue } from "@/lib/interfaces"

type IssueDetailsPageProps = {
  owner: string
  repository: string
  issueId: number
}

export default function IssueDetailsPage({ owner, repository, issueId }: IssueDetailsPageProps) {
  const [issue, setIssue] = useState<Issue | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    getIssue(owner, repository, issueId)
      .then((data) => {
        if (!active) return
        setIssue(data)
        setError(null)
      })
      .catch((err) => {
        if (!active) return
        setError(getErrorMessage(err))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [owner, repository, issueId])

  return (
    <div className="space-y-4">
      <Link
        to={`/${owner}/${repository}/issues`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="size-4" />
        Back to issues
      </Link>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && !error && (
        <div className="rounded-xl bg-card p-12 text-center text-sm text-muted-foreground ring-1 ring-foreground/10">
          Loading issue…
        </div>
      )}

      {issue && (
        <article className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
          <div className="flex flex-wrap items-start gap-3">
            <IssueStatus status={issue.state} />
            <h1 className="flex-1 text-xl font-semibold tracking-tight">
              {issue.title}
              <span className="ml-2 font-normal text-muted-foreground">#{issue.id}</span>
            </h1>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <IssueMetadata
              author={issue.author_username}
              createdAt={issue.created_at}
              closedAt={issue.closed_at || undefined}
            />
            <IssueLabels labels={issue.labels} />
          </div>

          <div className="mt-6 border-t border-foreground/10 pt-6 text-sm leading-6 text-foreground/90">
            {issue.body || <span className="text-muted-foreground">No description provided.</span>}
          </div>

          <div className="mt-6 border-t border-foreground/10 pt-6">
            <IssueActivity
              assignees={issue.assignees}
              commentsCount={issue.comments_count}
              pullRequestsCount={issue.pull_requests_count}
            />
          </div>
        </article>
      )}
    </div>
  )
}
