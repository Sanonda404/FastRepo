import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import RepositoryLayout from "@/components/repository/RepositoryLayout"

import { issueCreateSchema } from "@/lib/schemas/issue"
import { getErrorMessage } from "@/lib/apis/api"
import { createIssue } from "@/lib/apis/issue_apis"

type IssueFormInput = z.input<typeof issueCreateSchema>
type IssueFormOutput = z.output<typeof issueCreateSchema>

export default function RepositoryIssueNew() {
  const navigate = useNavigate()

  const {
    owner = "",
    repository = "",
  } = useParams<{
    owner: string
    repository: string
  }>()

  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const form = useForm<IssueFormInput, unknown, IssueFormOutput>({
    resolver: zodResolver(issueCreateSchema),
    defaultValues: {
      title: "",
      body: "",
    },
  })

  const onSubmit = async (values: IssueFormOutput) => {
    setLoading(true)
    setErrorMessage(null)

    try {
      await createIssue(owner, repository, values)

      navigate(`/${owner}/${repository}/issues`)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <RepositoryLayout
      owner={owner}
      repository={repository}
      activeTab="Issues"
    >
      <div className="mx-auto max-w-3xl space-y-6">

        {/* Back */}
        <Link
          to={`/${owner}/${repository}/issues`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to issues
        </Link>

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">
            Create new issue
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Describe the problem or idea so your team can work on it.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="rounded-xl bg-card p-6 ring-1 ring-foreground/10"
        >
          <div className="space-y-5">

            {/* Backend error */}
            {errorMessage && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {errorMessage}
              </div>
            )}

            {/* Title */}
            <div className="space-y-2">
              <label
                htmlFor="title"
                className="text-sm font-medium"
              >
                Title
              </label>

              <Input
                id="title"
                placeholder="Describe the issue briefly"
                autoFocus
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
              <label
                htmlFor="body"
                className="text-sm font-medium"
              >
                Description
              </label>

              <Textarea
                id="body"
                placeholder="Explain what happened, what you expected, or what should be changed..."
                className="min-h-44"
                {...form.register("body")}
              />

              {form.formState.errors.body && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.body.message}
                </p>
              )}
            </div>

            {/* Buttons */}
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
                <Plus className="size-4" />

                {loading ? "Creating..." : "Create issue"}
              </Button>
            </div>

          </div>
        </form>
      </div>
    </RepositoryLayout>
  )
}