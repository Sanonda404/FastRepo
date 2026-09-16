import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { GitPullRequest, MessageCircle } from "lucide-react"

import RepositoryLayout from "@/components/repository/RepositoryLayout"
import { RepoPermissionProvider } from "@/components/context/RepoPermissionContext"
import ChangedFilesSidebar from "@/components/commit-report/ChangedFilesSidebar"
import FileDiff from "@/components/commit-report/FileDiff"
import PullReviewDialog from "@/components/pulls/PullReviewDialog"
import PullReviewItem from "@/components/pulls/PullReviewItem"
import { Button } from "@/components/ui/button"
import { getErrorMessage } from "@/lib/apis/api"
import {
  closeOrReopenPull,
  createPullReview,
  deletePullReview,
  getPull,
  getPullFiles,
  getPullMergeable,
  listPullReviews,
  mergePull,
} from "@/lib/apis/pull_apis"
import { getRole } from "@/lib/apis/repository_apis"
import { getCollaborators } from "@/lib/apis/repository_collaborator_apis"
import { useAuth } from "@/lib/auth/use-auth"
import { formatRelativeDate } from "@/lib/format-date"
import type {
  CollaboratorResponse,
  FileChange,
  PullMergeable,
  PullRequest,
  PullReview,
} from "@/lib/interfaces"
import type { PullReviewInput } from "@/lib/schemas/pull"
import type { RepositoryRole } from "@/lib/auth/permissions"

export default function PullDetailPage() {
  const { owner = "", repository = "", pullNumber = "" } = useParams()
  const pullId = Number(pullNumber)
  const { username } = useAuth()

  const [role, setRole] = useState<RepositoryRole>("Viewer")
  const [collaborators, setCollaborators] = useState<CollaboratorResponse[]>([])
  const [pr, setPr] = useState<PullRequest | null>(null)
  const [reviews, setReviews] = useState<PullReview[]>([])
  const [files, setFiles] = useState<FileChange[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [filesLoading, setFilesLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reviewsError, setReviewsError] = useState<string | null>(null)
  const [filesError, setFilesError] = useState<string | null>(null)
  const [mergeStatus, setMergeStatus] = useState<PullMergeable | null>(null)
  const [mergeStatusLoading, setMergeStatusLoading] = useState(false)
  const [mergeError, setMergeError] = useState<string | null>(null)
  const [filesNonce, setFilesNonce] = useState(0)
  const [mutating, setMutating] = useState(false)

  useEffect(() => {
    getRole(owner, repository)
      .then((data) => setRole(data))
      .catch((err) => console.log(getErrorMessage(err)))
    getCollaborators(owner, repository)
      .then((data) => setCollaborators(data))
      .catch(() => setCollaborators([]))
  }, [owner, repository])

  useEffect(() => {
    let active = true
    // Removed synchronous setLoading(true)
    getPull(owner, repository, pullId)
      .then((data) => {
        if (active) {
          setPr(data)
          setError(null)
        }
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [owner, repository, pullId])

  useEffect(() => {
    let active = true
    // Removed synchronous setReviewsLoading(true)
    listPullReviews(owner, repository, pullId)
      .then((data) => {
        if (active) {
          setReviews(data)
          setReviewsError(null)
        }
      })
      .catch((err) => {
        if (active) setReviewsError(getErrorMessage(err))
      })
      .finally(() => {
        if (active) setReviewsLoading(false)
      })
    return () => {
      active = false
    }
  }, [owner, repository, pullId])

  useEffect(() => {
    let active = true
    // Removed synchronous setFilesLoading(true)
    getPullFiles(owner, repository, pullId)
      .then((data) => {
        if (active) {
          setFiles(data)
          setFilesError(null)
        }
      })
      .catch((err) => {
        if (active) setFilesError(getErrorMessage(err))
      })
      .finally(() => {
        if (active) setFilesLoading(false)
      })
    return () => {
      active = false
    }
  }, [owner, repository, pullId, filesNonce])

  useEffect(() => {
    if (pr?.state !== "open") {
      return
    }
    let active = true
    getPullMergeable(owner, repository, pullId)
      .then((data) => {
        if (active) {
          setMergeStatus(data)
          setMergeError(null)
        }
      })
      .catch((err) => {
        if (active) setMergeError(getErrorMessage(err))
      })
      .finally(() => {
        if (active) setMergeStatusLoading(false)
      })
    return () => {
      active = false
    }
  }, [owner, repository, pullId, pr?.state])

  const isCollaborator =
    role === "Owner" || collaborators.some((c) => c.username === username)

  // Direct decisions from the reviews array
  const hasRejected = reviews.some((r) => r.decision === "REJECT")
  const hasRequestedChanges = reviews.some((r) => r.decision === "REQUEST_CHANGES")
  const isApproved = reviews.some((r) => r.decision === "APPROVE")

  const handleCreateReview = async (data: PullReviewInput) => {
    setMutating(true)
    try {
      const created = await createPullReview(owner, repository, pullId, data)
      setReviews((current) => [...current, created])
      setReviewsError(null)
    } catch (err) {
      setReviewsError(getErrorMessage(err))
      throw err
    } finally {
      setMutating(false)
    }
  }

  const handleDeleteReview = async (id: number) => {
    setMutating(true)
    try {
      await deletePullReview(owner, repository, pullId, id)
      setReviews((current) => current.filter((r) => r.id !== id))
    } catch (err) {
      setReviewsError(getErrorMessage(err))
    } finally {
      setMutating(false)
    }
  }

  const handleToggleState = async () => {
    if (!pr) return
    setMutating(true)
    try {
      const updated = await closeOrReopenPull(
        owner,
        repository,
        pullId,
        pr.state === "open" ? "closed" : "open",
      )
      setPr(updated)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setMutating(false)
    }
  }

  const handleMerge = async () => {
    if (!pr || pr.state !== "open") return
    setMutating(true)
    try {
      const merged = await mergePull(owner, repository, pullId)
      setPr(merged)
      setMergeError(null)
      setFilesNonce((n) => n + 1)
    } catch (err) {
      const message = getErrorMessage(err)
      setMergeError(message)
      setError(message)
    } finally {
      setMutating(false)
    }
  }

  const additions = files.reduce((n, f) => n + f.additions, 0)
  const deletions = files.reduce((n, f) => n + f.deletions, 0)
  const canModify = pr != null && (pr.author_username === username || isCollaborator)
  const isClosed = pr?.state === "closed"
  const canMerge = role === "Owner" || role === "Admin" || role === "Maintainer"

  return (
    <RepositoryLayout
      role={role}
      owner={owner}
      repository={repository}
      activeTab="Pull requests"
    >
      <RepoPermissionProvider role={role}>
        <div className="mx-auto flex max-w-6xl flex-col gap-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading pull request...</p>
          ) : error || !pr ? (
            <div role="alert" className="px-4 py-14 text-center text-sm text-destructive">
              {error ?? "Pull request not found."}
            </div>
          ) : (
            <>
              {/* Header section */}
              <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      pr.state === "open"
                        ? "bg-green-600/10 text-green-700 dark:text-green-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <GitPullRequest className="size-3" />
                    {pr.state === "open" ? "Open" : "Closed"}
                  </span>
                  <h1 className="text-lg font-semibold leading-snug">{pr.title || "(no title)"}</h1>
                  <span className="text-sm text-muted-foreground">#{pr.id}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{pr.author_username ?? "unknown"}</span>
                  <span>opened {formatRelativeDate(pr.created_at)}</span>
                  <span className="font-mono text-xs">
                    {pr.source_branch} → {pr.target_branch}
                  </span>
                  {pr.source_repository_id !== null && (
                    <span className="text-xs">from fork</span>
                  )}
                </div>
                {pr.body && (
                  <p className="mt-3 whitespace-pre-wrap text-sm">{pr.body}</p>
                )}
                {canModify && (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={mutating}
                      onClick={handleToggleState}
                    >
                      {mutating
                        ? "Working..."
                        : pr.state === "open"
                          ? "Close pull request"
                          : "Reopen pull request"}
                    </Button>
                    {canMerge && pr.state === "open" && (
                      <Button
                        type="button"
                        size="sm"
                        disabled={mutating || mergeStatusLoading || !mergeStatus?.mergeable}
                        onClick={handleMerge}
                      >
                        {mutating
                          ? "Merging..."
                          : mergeStatusLoading
                            ? "Checking..."
                            : "Merge pull request"}
                      </Button>
                    )}
                  </div>
                )}
                {canMerge && pr.state === "open" && (
                  <div className="mt-2 text-xs">
                    {mergeStatusLoading ? (
                      <span className="text-muted-foreground">Checking mergeability...</span>
                    ) : mergeStatus?.mergeable ? (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        Ready to merge — no conflicts.
                      </span>
                    ) : (
                      <span className="text-destructive">
                        {mergeStatus?.reason ?? mergeError ?? "Not mergeable."}
                      </span>
                    )}
                    {mergeStatus && mergeStatus.conflicts.length > 0 && (
                      <ul className="mt-1 space-y-0.5 font-mono">
                        {mergeStatus.conflicts.map((path) => (
                          <li key={path} className="text-destructive">conflict: {path}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </section>

              {/* Reviews section */}
              <section className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-foreground/10 bg-muted/20 px-6 py-4">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="size-4 text-primary" />
                    <h2 className="font-semibold">Reviews</h2>
                  </div>
                  {/* Cleaned Review Status Indicator */}
                  <div className="text-xs font-medium">
                    {hasRejected ? (
                      <span className="font-semibold text-destructive">Rejected</span>
                    ) : hasRequestedChanges ? (
                      <span className="text-amber-600 dark:text-amber-400">Changes requested</span>
                    ) : isApproved ? (
                      <span className="text-emerald-600 dark:text-emerald-400">Approved for merge</span>
                    ) : (
                      <span className="text-muted-foreground">Pending decisions</span>
                    )}
                  </div>
                </div>
                <div className="p-6">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {reviews.length === 0
                        ? "Start the conversation"
                        : `${reviews.length} ${reviews.length === 1 ? "review" : "reviews"}`}
                    </p>
                    {isClosed ? (
                      <span className="text-xs italic text-muted-foreground">
                        Closed pull request — reviews are locked.
                      </span>
                    ) : (
                      <PullReviewDialog loading={mutating} onSubmit={handleCreateReview} />
                    )}
                  </div>

                  {reviewsError && (
                    <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      {reviewsError}
                    </div>
                  )}

                  {reviewsLoading ? (
                    <div className="rounded-xl border border-dashed border-foreground/10 bg-muted/10 p-8 text-center text-sm text-muted-foreground">
                      Loading reviews...
                    </div>
                  ) : reviews.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-foreground/10 bg-muted/10 p-8 text-center text-sm text-muted-foreground">
                      No reviews yet.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {reviews.map((review) => (
                        <PullReviewItem
                          key={review.id}
                          review={review}
                          isDeleting={mutating}
                          onDeleteReview={
                            review.reviewer_username === username || isCollaborator
                              ? handleDeleteReview
                              : undefined
                          }
                          currentUsername={username ?? ""}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* Changes section */}
              <section aria-label="Pull request diff" className="flex flex-col gap-4">
                <div className="flex items-center gap-2 px-1">
                  <h2 className="font-semibold">Changes</h2>
                  {!filesLoading && !filesError && (
                    <span className="font-mono text-xs text-muted-foreground">
                      {files.length} file{files.length === 1 ? "" : "s"} ·{" "}
                      <span className="text-emerald-600 dark:text-emerald-400">+{additions}</span>{" "}
                      <span className="text-red-600 dark:text-red-400">−{deletions}</span>
                    </span>
                  )}
                </div>

                {filesLoading ? (
                  <p className="text-sm text-muted-foreground">Loading changes...</p>
                ) : filesError ? (
                  <div role="alert" className="rounded-xl bg-card px-4 py-12 text-center text-sm text-destructive ring-1 ring-foreground/10">
                    {filesError}
                  </div>
                ) : files.length === 0 ? (
                  <p className="rounded-xl bg-card px-4 py-12 text-center text-sm text-muted-foreground ring-1 ring-foreground/10">
                    No file changes in this pull request.
                  </p>
                ) : (
                  <div className="grid items-start gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
                    <div className="lg:sticky lg:top-4">
                      <ChangedFilesSidebar files={files} />
                    </div>
                    <div className="flex min-w-0 flex-col gap-4">
                      {files.map((f, i) => (
                        <FileDiff key={`${f.path}-${i}`} index={i} file={f} />
                      ))}
                    </div>
                  </div>
                )}
              </section>

              <Link
                to={`/${owner}/${repository}/pulls`}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Back to pull requests
              </Link>
            </>
          )}
        </div>
      </RepoPermissionProvider>
    </RepositoryLayout>
  )
}