import { useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  Check,
  CircleDot,
  GitPullRequest,
  MessageSquare,
  Plus,
  Tag,
  UserRound,
  UsersRound,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { mockComments, mockIssues } from "./mock-issues"
import IssueLabel from "./issue-label"
import IssueSidebar from "./issue-sidebar"
import IssueComment from "./issue-comment"

export default function IssueDetailsPage({
  owner,
  repository,
  issueId,
}: {
  owner: string
  repository: string
  issueId: number
}) {
  const navigate = useNavigate()
  const issue = useMemo(
    () => mockIssues.find((item) => item.id === issueId) ?? mockIssues[0],
    [issueId],
  )
  const [comment, setComment] = useState("")
  const [comments, setComments] = useState(mockComments[issue.id] ?? [])
  const [status, setStatus] = useState(issue.status)

  const base = `/repositories/${owner}/${repository}`

  const addComment = () => {
    const body = comment.trim()
    if (!body) return

    setComments((current) => [
      ...current,
      {
        id: Date.now(),
        author: owner,
        body,
        createdAt: "just now",
      },
    ])
    setComment("")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`${base}/issues`)}
          className="-ml-3 gap-2 text-muted-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to issues
        </Button>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setStatus(status === "open" ? "closed" : "open")
            }
            className="gap-2"
          >
            {status === "open" ? (
              <>
                <Check className="size-4" />
                Close issue
              </>
            ) : (
              <>
                <CircleDot className="size-4" />
                Reopen issue
              </>
            )}
          </Button>

          <Button asChild size="sm" className="gap-2">
            <Link to={`${base}/pulls/new?issue=${issue.id}`}>
              <GitPullRequest className="size-4" />
              Create pull request
            </Link>
          </Button>
        </div>
      </div>

      <header>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {issue.title}
          </h1>
          <span className="text-xl text-muted-foreground">#{issue.id}</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
              status === "open"
                ? "bg-green-500/10 text-green-700 dark:text-green-300"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <CircleDot className="size-3.5" />
            {status === "open" ? "Open" : "Closed"}
          </span>
          <span>
            {issue.author} opened this issue {issue.createdAt}
          </span>
          <span>·</span>
          <span>updated {issue.updatedAt}</span>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0 space-y-6">
          <article className="rounded-xl bg-card ring-1 ring-foreground/10">
            <div className="flex items-center gap-3 border-b px-5 py-3">
              <div className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {issue.author.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold">{issue.author}</p>
                <p className="text-xs text-muted-foreground">
                  opened {issue.createdAt}
                </p>
              </div>
            </div>

            <div className="whitespace-pre-wrap p-5 text-sm leading-6">
              {issue.body}
            </div>
          </article>

          <section>
            <div className="mb-4 flex items-center gap-2">
              <MessageSquare className="size-5" />
              <h2 className="font-semibold">
                {comments.length} {comments.length === 1 ? "comment" : "comments"}
              </h2>
            </div>

            <div className="space-y-4">
              {comments.map((item) => (
                <IssueComment key={item.id} comment={item} />
              ))}
            </div>

            <div className="mt-6 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                <div className="flex size-7 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  {owner.charAt(0).toUpperCase()}
                </div>
                Leave a comment
              </div>

              <Textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Write a comment..."
                className="min-h-28 resize-y"
              />

              <div className="mt-3 flex justify-end">
                <Button
                  onClick={addComment}
                  disabled={!comment.trim()}
                  className="gap-2"
                >
                  <MessageSquare className="size-4" />
                  Comment
                </Button>
              </div>
            </div>
          </section>

          <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Need to change the implementation?</p>
            <p className="mt-1">
              Create a pull request directly from this issue to connect the
              discussion with a code change.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3 gap-2">
              <Link to={`${base}/pulls/new?issue=${issue.id}`}>
                <Plus className="size-4" />
                Create pull request
              </Link>
            </Button>
          </div>
        </div>

        <IssueSidebar issue={issue} />
      </div>
    </div>
  )
}
