import type { UseFormReturn } from "react-hook-form"
import type { z } from "zod"
import { ArrowLeft, GitBranch, Loader2, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"

import { newRepositorySchema } from "@/lib/schemas/repository"
import RepositoryDetailsFields from "./repository-details-fields"
import RepositoryVisibility from "./repository-visibility"
import RepositorySettings from "./repository-settings"

type RepositoryFormInput = z.input<typeof newRepositorySchema>
type RepositoryFormOutput = z.output<typeof newRepositorySchema>

interface RepositoryFormProps {
  form: UseFormReturn<RepositoryFormInput, unknown, RepositoryFormOutput>
  loading: boolean
  errorMessage: string | null
  onSubmit: (values: RepositoryFormOutput) => void | Promise<void>
  onCancel: () => void
}

export default function RepositoryForm({
  form,
  loading,
  errorMessage,
  onSubmit,
  onCancel,
}: RepositoryFormProps) {
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className="-ml-3 mb-6 gap-2 text-muted-foreground hover:text-foreground"
        onClick={onCancel}
        disabled={loading}
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 via-blue-500 to-violet-500 text-white shadow-sm">
          <GitBranch className="h-5 w-5" />
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Create a new repository
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Start a new project and choose who can access it.
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
            <section className="rounded-xl bg-card shadow-sm ring-1 ring-foreground/10">
              <div className="border-b border-foreground/10 px-6 py-5">
                <h2 className="text-base font-semibold">
                  Repository details
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Give your repository a name and configure its initial
                  settings.
                </p>
              </div>

              <div className="p-6">
                {errorMessage && (
                  <div
                    role="alert"
                    className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                  >
                    {errorMessage}
                  </div>
                )}

                <div className="space-y-6">
                  <RepositoryDetailsFields form={form} />

                  <RepositoryVisibility form={form} />

                  <div className="flex flex-col-reverse gap-3 border-t border-foreground/10 pt-6 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onCancel}
                      disabled={loading}
                    >
                      Cancel
                    </Button>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="gap-2 bg-green-600 text-white hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      {loading ? "Creating..." : "Create repository"}
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            <RepositorySettings />
          </div>
        </form>
      </Form>
    </>
  )
}