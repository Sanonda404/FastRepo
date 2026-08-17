import type { UseFormReturn } from "react-hook-form"
import type { z } from "zod"
import { BookOpen, GitBranch } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

import { newRepositorySchema } from "@/lib/schemas/repository"

type RepositoryFormInput = z.input<typeof newRepositorySchema>
type RepositoryFormOutput = z.output<typeof newRepositorySchema>

interface RepositoryDetailsFieldsProps {
  form: UseFormReturn<RepositoryFormInput, unknown, RepositoryFormOutput>
}

export default function RepositoryDetailsFields({
  form,
}: RepositoryDetailsFieldsProps) {
  return (
    <>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="font-medium">Repository name</FormLabel>
            <FormControl>
              <div className="relative">
                <BookOpen className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  {...field}
                  className="h-11 pl-10"
                  placeholder="my-awesome-project"
                  autoFocus
                />
              </div>
            </FormControl>
            <p className="text-xs text-muted-foreground">
              Use a short, descriptive name for your project.
            </p>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="font-medium">
              Description{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </FormLabel>
            <FormControl>
              <Textarea
                {...field}
                value={field.value ?? ""}
                className="min-h-28 resize-y"
                placeholder="What is this repository about?"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="default_branch"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="font-medium">Default branch</FormLabel>
            <FormControl>
              <div className="relative">
                <GitBranch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  {...field}
                  value={field.value ?? ""}
                  className="h-11 pl-10"
                  placeholder="main"
                />
              </div>
            </FormControl>
            <p className="text-xs text-muted-foreground">
              The branch used as the default when working with this repository.
            </p>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  )
}