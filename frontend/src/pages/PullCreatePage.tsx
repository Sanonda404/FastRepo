import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, GitPullRequest } from "lucide-react"

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

import { pullCreateSchema } from "@/lib/schemas/pull"
import { getErrorMessage } from "@/lib/apis/api"
import { createPull } from "@/lib/apis/pull_apis"
import { getRole, listBranches, listForks } from "@/lib/apis/repository_apis"
import type { BranchResponse, RepositoryDetails } from "@/lib/interfaces"
import type { RepositoryRole } from "@/lib/auth/permissions"

type PullFormInput = z.input<typeof pullCreateSchema>
type PullFormOutput = z.output<typeof pullCreateSchema>

interface SourceOption {
  id: number | null
  owner_username: string
  name: string
}

export default function PullCreatePage() {
  const navigate = useNavigate()
  const { owner = "", repository = "" } = useParams<{
    owner: string
    repository: string
  }>()

  const [role, setRole] = useState<RepositoryRole>("Viewer")
  const [roleLoading, setRoleLoading] = useState(true)
  const [roleError, setRoleError] = useState<string | null>(null)

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

  const form = useForm<PullFormInput, unknown, PullFormOutput>({
    resolver: zodResolver(pullCreateSchema),
    defaultValues: {
      title: "",
      body: "",
      source_branch: "",
      target_branch: "",
      source_repository_id: null,
    },
  })

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceId])

  const onSubmit = async (values: PullFormOutput) => {
    setLoading(true)
    setErrorMessage(null)
    try {
      const pr = await createPull(owner, repository, values)
      navigate(`/${owner}/${repository}/pulls/${pr.id}`)
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
          <h1 className="text-2xl font-bold">Create pull request</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Propose changes from one branch into another for review.
          </p>
        </div>

        {roleLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
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
            className="rounded-xl bg-card p-6 ring-1 ring-foreground/10"
          >
            <div className="space-y-5">
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

              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-medium">
                  Title
                </label>
                <Input
                  id="title"
                  placeholder="Summarize the change briefly"
                  autoFocus
                  {...form.register("title")}
                />
                {form.formState.errors.title && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.title.message}
                  </p>
                )}
              </div>

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

              <div className="flex justify-end gap-2">
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
                  {loading ? "Creating..." : "Create pull request"}
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </RepositoryLayout>
  )
}
