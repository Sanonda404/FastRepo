import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, X } from "lucide-react"

import { getErrorMessage } from "@/lib/apis/api"

import {
  getIssueByNumber,
  addIssueAssignee,
  attachIssueLabel,
  removeIssueAssignee,
  removeIssueLabel,
  createIssueComment,
  getAllIssueComments,
  deleteIssueComment,
} from "@/lib/apis/issue_apis"

import type {
  Issue,
  IssueCommentResponse,
  CollaboratorResponse,
} from "@/lib/interfaces"

import type {
  IssueCommentInput,
  IssueAssigneeInput,
  LabelInput,
} from "@/lib/schemas/issue"

import IssueHeader from "@/components/issues/IssueHeader"
import IssueDescription from "@/components/issues/IssueDescription"
import IssueActivitySection from "@/components/issues/IssueActivitySection"
import IssueAssignees from "@/components/issues/IssueAssignees"
import IssueLabelsDisplay from "@/components/issues/IssueLabelsDisplay"

type IssueDetailsPageProps = {
  owner: string
  repository: string
  issueNumber: number
  collaborators: CollaboratorResponse[]
}

export default function IssueDetailsPage({
  owner,
  repository,
  issueNumber,
  collaborators,
}: IssueDetailsPageProps) {
  const [issue, setIssue] = useState<Issue | null>(null)
  const [comments, setComments] = useState<
    IssueCommentResponse[]
  >([])

  const [error, setError] = useState<string | null>(null)
  const [commentsError, setCommentsError] =
    useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [commentsLoading, setCommentsLoading] =
    useState(true)

  const [mutationError, setMutationError] =
    useState<string | null>(null)

  const [mutating, setMutating] = useState(false)

  /*
   * ============================================================
   * LOAD ISSUE
   * ============================================================
   */

  useEffect(() => {
    let active = true

    setLoading(true)

    getIssueByNumber(
      owner,
      repository,
      issueNumber
    )
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
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [owner, repository, issueNumber])

  /*
   * ============================================================
   * LOAD COMMENTS
   * ============================================================
   */

  useEffect(() => {
    let active = true

    setCommentsLoading(true)

    getAllIssueComments(
      owner,
      repository,
      issueNumber
    )
      .then((data) => {
        if (!active) return

        setComments(data)
        setCommentsError(null)
      })
      .catch((err) => {
        if (!active) return

        setCommentsError(getErrorMessage(err))
      })
      .finally(() => {
        if (active) {
          setCommentsLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [owner, repository, issueNumber])

  /*
   * ============================================================
   * ASSIGNEES
   * ============================================================
   */

  const handleAddAssignee = async (
    data: IssueAssigneeInput
  ) => {
    try {
      setMutating(true)
      setMutationError(null)

      const added = await addIssueAssignee(
        owner,
        repository,
        issueNumber,
        data
      )

      setIssue((current) => {
        if (!current) return current

        return {
          ...current,
          assignees: [
            ...current.assignees,
            added,
          ],
        }
      })
    } catch (err) {
      setMutationError(getErrorMessage(err))
      throw err
    } finally {
      setMutating(false)
    }
  }

  const handleRemoveAssignee = async (
    username: string
  ) => {
    try {
      setMutating(true)
      setMutationError(null)

      await removeIssueAssignee(
        owner,
        repository,
        issueNumber,
        username
      )

      setIssue((current) => {
        if (!current) return current

        return {
          ...current,
          assignees: current.assignees.filter(
            (assignee) =>
              assignee.username !== username
          ),
        }
      })
    } catch (err) {
      setMutationError(getErrorMessage(err))
    } finally {
      setMutating(false)
    }
  }

  /*
   * ============================================================
   * LABELS
   * ============================================================
   */

  const handleAddLabel = async (
    data: LabelInput
  ) => {
    try {
      setMutating(true)
      setMutationError(null)

      const added = await attachIssueLabel(
        owner,
        repository,
        issueNumber,
        data
      )

      setIssue((current) => {
        if (!current) return current

        return {
          ...current,
          labels: [
            ...current.labels,
            added,
          ],
        }
      })
    } catch (err) {
      setMutationError(getErrorMessage(err))
      throw err
    } finally {
      setMutating(false)
    }
  }

  const handleRemoveLabel = async (
    labelId: number
  ) => {
    try {
      setMutating(true)
      setMutationError(null)

      await removeIssueLabel(
        owner,
        repository,
        issueNumber,
        labelId
      )

      setIssue((current) => {
        if (!current) return current

        return {
          ...current,
          labels: current.labels.filter(
            (label) => label.id !== labelId
          ),
        }
      })
    } catch (err) {
      setMutationError(getErrorMessage(err))
    } finally {
      setMutating(false)
    }
  }

  /*
   * ============================================================
   * COMMENTS
   * ============================================================
   */

  const handleCreateComment = async (
    data: IssueCommentInput
  ) => {
    try {
      setMutating(true)
      setMutationError(null)

      const created =
        await createIssueComment(
          owner,
          repository,
          issueNumber,
          data
        )

      setComments((current) => [
        ...current,
        created,
      ])

      setIssue((current) => {
        if (!current) return current

        return {
          ...current,
          comments_count:
            current.comments_count + 1,
        }
      })
    } catch (err) {
      setMutationError(getErrorMessage(err))
      throw err
    } finally {
      setMutating(false)
    }
  }

  const handleDeleteComment = async (
    commentId: number
  ) => {
    try {
      setMutating(true)
      setMutationError(null)

      await deleteIssueComment(
        owner,
        repository,
        commentId
      )

      setComments((current) =>
        current.filter(
          (comment) =>
            comment.id !== commentId
        )
      )

      setIssue((current) => {
        if (!current) return current

        return {
          ...current,
          comments_count: Math.max(
            0,
            current.comments_count - 1
          ),
        }
      })
    } catch (err) {
      setMutationError(getErrorMessage(err))
    } finally {
      setMutating(false)
    }
  }

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Back */}
      <Link
        to={`/${owner}/${repository}/issues`}
        className="
          inline-flex
          items-center
          gap-2
          text-sm
          font-medium
          text-muted-foreground
          transition-colors
          hover:text-foreground
        "
      >
        <ArrowLeft className="size-4" />
        Back to issues
      </Link>

      {/* Error */}
      {error && (
        <div className="
          rounded-xl
          border
          border-destructive/30
          bg-destructive/10
          px-4 py-3
          text-sm
          text-destructive
        ">
          {error}
        </div>
      )}

      {/* Mutation error */}
      {mutationError && (
        <div className="
          flex
          items-center
          justify-between
          rounded-xl
          border
          border-destructive/30
          bg-destructive/10
          px-4 py-3
          text-sm
          text-destructive
        ">
          <span>{mutationError}</span>

          <button
            type="button"
            onClick={() =>
              setMutationError(null)
            }
            className="
              rounded-md
              p-1
              hover:bg-destructive/10
            "
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && !error && (
        <div className="
          rounded-2xl
          border
          bg-card
          p-16
          text-center
          text-sm
          text-muted-foreground
          shadow-sm
        ">
          Loading issue...
        </div>
      )}

      {issue && (
        <>
          <IssueHeader issue={issue} />

          <div className="
            grid
            gap-6
            lg:grid-cols-[minmax(0,1fr)_310px]
          ">
            <main className="
              min-w-0
              space-y-6
            ">
              <IssueDescription
                body={issue.body}
              />

              <IssueActivitySection
                comments={comments}
                commentsLoading={
                  commentsLoading
                }
                commentsError={
                  commentsError
                }
                issue={issue}
                mutating={mutating}
                onCreateComment={
                  handleCreateComment
                }
                onDeleteComment={
                  handleDeleteComment
                }
              />
            </main>

            <aside className="space-y-5">
              <IssueAssignees
                owner={owner}
                assignees={issue.assignees}
                collaborators={
                  collaborators
                }
                mutating={mutating}
                onAdd={
                  handleAddAssignee
                }
                onRemove={
                  handleRemoveAssignee
                }
              />

              <IssueLabelsDisplay
                labels={issue.labels}
                mutating={mutating}
                onAdd={handleAddLabel}
                onRemove={
                  handleRemoveLabel
                }
              />
            </aside>
          </div>
        </>
      )}
    </div>
  )
}