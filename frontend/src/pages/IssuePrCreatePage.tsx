import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import type { IssuePrFormInput, IssuePrFormOutput } from "@/lib/schemas/pull"
import { zodResolver } from "@hookform/resolvers/zod"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { ArrowLeft, GitPullRequest, Check } from "lucide-react"
import { issuePrCreateSchema } from "@/lib/schemas/pull"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import RepositoryLayout from "@/components/repository/RepositoryLayout"

import { getErrorMessage } from "@/lib/apis/api"
import { getIssues } from "@/lib/apis/issue_apis"
import { createIssuePr } from "@/lib/apis/pull_apis"
import { getRole, listBranches, listForks } from "@/lib/apis/repository_apis"
import type { BranchResponse, RepositoryDetails, Issue } from "@/lib/interfaces"
import type { RepositoryRole } from "@/lib/auth/permissions"



interface SourceOption {
  id: number | null
  owner_username: string
  name: string
}

export default function IssuePullCreatePage() {
  const navigate = useNavigate()
  const { owner = "", repository = "", issueId } = useParams<{
    owner: string
    repository: string
    issueId?: string
  }>()

  const [searchParams] = useSearchParams()
  // Extract initial issue ID from route params (e.g. /issues/:issueId/pull/new) or query string (?issue_id=123)
  const initialIssueIdStr = issueId || searchParams.get("issue_id")
  const preselectedIssueId = initialIssueIdStr ? Number(initialIssueIdStr) : null

  const [role, setRole] = useState<RepositoryRole>("Viewer")
  const [roleLoading, setRoleLoading] = useState(true)
  const [roleError, setRoleError] = useState<string | null>(null)

  const [issues, setIssues] = useState<Issue[]>([])
  const [issuesLoading, setIssuesLoading] = useState(true)

  const [sources, setSources] = useState<SourceOption[]>([
    { id: null, owner_username: owner, name: repository },
  ])
  const [forkCount, setForkCount] = useState(0)
  const selfLabel = `${owner}/${repository}`
  const [sourceId, setSourceId] = useState<string>(selfLabel)
  const [targetBranches, setTargetBranches] = useState<BranchResponse[]>([])
  const [sourceBranches, setSourceBranches] = useState<BranchResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const form = useForm<IssuePrFormInput, unknown, IssuePrFormOutput>({
    resolver: zodResolver(issuePrCreateSchema),
    defaultValues: {
      title: "",
      body: "",
      source_branch: "",
      target_branch: "",
      source_repository_id: null,
      issue_ids: preselectedIssueId ? [preselectedIssueId] : [],
    },
  })

  // 1. Fetch User Role
  useEffect(() => {
    let active = true
    setRoleLoading(true)
    getRole(owner, repository)
      .then((data) => {
        if (active) {
          setRole(data)
          setRoleError(null)
        }
      })
      .catch((err) => {
        if (active) setRoleError(getErrorMessage(err))
      })
      .finally(() => {
        if (active) setRoleLoading(false)
      })
    return () => {
      active = false
    }
  }, [owner, repository])

  // 2. Fetch Issues & Auto-select current issue
  useEffect(() => {
    let active = true
    setIssuesLoading(true)

    getIssues(owner, repository)
      .then((data) => {
        if (!active) return
        setIssues(data)

        if (preselectedIssueId && !isNaN(preselectedIssueId)) {
          const currentSelected = form.getValues("issue_ids") || []
          if (!currentSelected.includes(preselectedIssueId)) {
            form.setValue("issue_ids", [...currentSelected, preselectedIssueId], {
              shouldValidate: true,
            })
          }

          // Pre-populate title if issue exists
          const currentIssue = data.find((i) => i.id === preselectedIssueId)
          if (currentIssue && !form.getValues("title")) {
            form.setValue("title", `Fix: ${currentIssue.title}`)
          }
        }
      })
      .catch((err) => {
        if (active) setErrorMessage(getErrorMessage(err))
      })
      .finally(() => {
        if (active) setIssuesLoading(false)
      })

    return () => {
      active = false
    }
  }, [owner, repository, preselectedIssueId, form])

  // 3. Fetch Branches and Forks
  useEffect(() => {
    let active = true
    listBranches(owner, repository)
      .then((branches) => {
        if (!active) return
        setTargetBranches(branches)
        const def = branches.find((b) => b.is_default) ?? branches[0]
        if (def) form.setValue("target_branch", def.name)
      })
      .catch((err) => {
        if (active) setErrorMessage(getErrorMessage(err))
      })

    listForks(owner, repository)
      .then((forks: RepositoryDetails[]) => {
        if (!active) return
        setForkCount(forks.length)
        setSources([
          { id: null, owner_username: owner, name: repository },
          ...forks.map((f) => ({
            id: f.id,
            owner_username: f.owner_username,
            name: f.name,
          })),
        ])
      })
      .catch(() => {
        if (active) setSources([{ id: null, owner_username: owner, name: repository }])
      })

    return () => {
      active = false
    }
  }, [owner, repository, form])

  const sourceKey = (s: SourceOption) => `${s.owner_username}/${s.name}`
  const activeSource: SourceOption =
    sources.find((s) => sourceKey(s) === sourceId) ?? sources[0]

  useEffect(() => {
    let active = true
    form.setValue("source_repository_id", activeSource.id)
    form.setValue("source_branch", "")
    listBranches(activeSource.owner_username, activeSource.name)
      .then((branches) => {
        if (active) setSourceBranches(branches.filter((b) => b.sha))
      })
      .catch((err) => {
        if (active) setErrorMessage(getErrorMessage(err))
      })
    return () => {
      active = false
    }
  }, [sourceId, activeSource, form])

  const selectedIssueIds = form.watch("issue_ids") || []

  const toggleIssueSelection = (id: number) => {
    const current = new Set(form.getValues("issue_ids") || [])
    if (current.has(id)) {
      current.delete(id)
    } else {
      current.add(id)
    }
    form.setValue("issue_ids", Array.from(current), { shouldValidate: true })
  }

  const onSubmit = async (values: IssuePrFormOutput) => {
    setLoading(true)
    setErrorMessage(null)
    try {
      const pr = await createIssuePr(owner, repository, values)
      navigate(`/${owner}/${repository}/pulls/${pr}`)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <RepositoryLayout
      role={role}
      owner={owner}
      repository={repository}
      activeTab="Pull requests"
    >
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          to={`/${owner}/${repository}/pulls`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to pull requests
        </Link>

        <div>
          <h1 className="text-2xl font-bold">Create Pull Request for Issues</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Link and automatically close issues by opening a pull request.
          </p>
        </div>

        {roleLoading ? (
          <p className="text-sm text-muted-foreground">Loading permissions...</p>
        ) : roleError ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {roleError}
          </div>
        ) : role === "Viewer" && forkCount === 0 ? (
          <div className="rounded-xl bg-card p-10 text-center ring-1 ring-foreground/10">
            <p className="text-sm font-medium">You don't have permission to open pull requests</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Only collaborators can propose changes to this repository.
            </p>
          </div>
        ) : (
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="rounded-xl bg-card p-6 ring-1 ring-foreground/10 space-y-5"
          >
            {errorMessage && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {errorMessage}
              </div>
            )}

            {role === "Viewer" && (
              <div className="rounded-md border border-foreground/10 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                As an outside contributor you can only propose changes from one of your forks.
              </div>
            )}

            {/* Issue Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Linked Issues <span className="text-destructive">*</span>
              </label>
              {issuesLoading ? (
                <p className="text-xs text-muted-foreground">Loading issues...</p>
              ) : issues.length === 0 ? (
                <p className="text-xs text-muted-foreground">No open issues found.</p>
              ) : (
                <div className="max-h-48 overflow-y-auto rounded-md p-2 space-y-1 ring-1 ring-foreground/10">
                  {issues.map((issue) => {
                    const isSelected = selectedIssueIds.includes(issue.id)
                    return (
                      <div
                        key={issue.id}
                        onClick={() => toggleIssueSelection(issue.id)}
                        className={`flex items-center justify-between p-2 rounded-md cursor-pointer text-sm transition-colors ${
                          isSelected
                            ? "bg-accent text-accent-foreground font-medium"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-muted-foreground">#{issue.id}</span>
                          <span className="truncate">{issue.title}</span>
                        </div>
                        {isSelected && <Check className="size-4 text-primary" />}
                      </div>
                    )
                  })}
                </div>
              )}
              {form.formState.errors.issue_ids && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.issue_ids.message}
                </p>
              )}
            </div>

            {/* Title */}
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">
                Title
              </label>
              <Input
                id="title"
                placeholder="Summarize the change briefly"
                {...form.register("title")}
              />
              {form.formState.errors.title && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>

            {/* Body */}
            <div className="space-y-2">
              <label htmlFor="body" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="body"
                placeholder="Explain what changed and why..."
                className="min-h-32"
                {...form.register("body")}
              />
              {form.formState.errors.body && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.body.message}
                </p>
              )}
            </div>

            {/* Source Repository */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Source repository</label>
              <Select value={sourceId} onValueChange={(v) => setSourceId(v ?? selfLabel)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select repository" />
                </SelectTrigger>
                <SelectContent>
                  {sources.map((s) => (
                    <SelectItem key={sourceKey(s)} value={sourceKey(s)}>
                      {s.owner_username}/{s.name}
                      {s.id === null ? " (This repository)" : " (Fork)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Branch Pickers */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Source branch</label>
                <Select
                  value={form.watch("source_branch") || ""}
                  onValueChange={(v) =>
                    form.setValue("source_branch", v ?? "", { shouldValidate: true })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceBranches.map((b) => (
                      <SelectItem key={b.name} value={b.name}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.source_branch && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.source_branch.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Target branch</label>
                <Select
                  value={form.watch("target_branch") || ""}
                  onValueChange={(v) =>
                    form.setValue("target_branch", v ?? "", { shouldValidate: true })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {targetBranches.map((b) => (
                      <SelectItem key={b.name} value={b.name}>
                        {b.name}
                        {b.is_default ? " (default)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.target_branch && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.target_branch.message}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="gap-2 bg-green-600 text-white hover:bg-green-700"
              >
                <GitPullRequest className="size-4" />
                {loading ? "Creating..." : "Create PR for Issue"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </RepositoryLayout>
  )
}