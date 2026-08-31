import type { UseFormReturn } from "react-hook-form"
import type { z } from "zod"
import { Check, Globe2, Lock } from "lucide-react"

import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form"

import { newRepositorySchema } from "@/lib/schemas/repository"

type RepositoryFormInput = z.input<typeof newRepositorySchema>
type RepositoryFormOutput = z.output<typeof newRepositorySchema>

interface RepositoryVisibilityProps {
  form: UseFormReturn<RepositoryFormInput, unknown, RepositoryFormOutput>
}

export default function RepositoryVisibility({
  form,
}: RepositoryVisibilityProps) {
  const isPrivate = form.watch("is_private")

  return (
    <FormField
      control={form.control}
      name="is_private"
      render={({ field }) => (
        <FormItem>
          <div
            className={`rounded-xl p-4 ring-1 transition-colors ${
              isPrivate
                ? "bg-green-500/5 ring-green-500/40"
                : "bg-card ring-foreground/10"
            }`}
          >
            <label
              htmlFor="repository-private"
              className="flex cursor-pointer items-start gap-3"
            >
              <FormControl>
                <input
                  id="repository-private"
                  type="checkbox"
                  checked={field.value ?? false}
                  onChange={(event) => field.onChange(event.target.checked)}
                  onBlur={field.onBlur}
                  ref={field.ref}
                  className="mt-1 h-4 w-4 cursor-pointer accent-green-600"
                />
              </FormControl>

              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {isPrivate ? (
                    <Lock className="h-4 w-4 text-green-600" />
                  ) : (
                    <Globe2 className="h-4 w-4 text-muted-foreground" />
                  )}
                  Make this repository private
                </span>

                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  {isPrivate
                    ? "Only you and explicitly authorized collaborators will be able to access it."
                    : "Anyone with access to FastRepo can discover and view this repository."}
                </span>
              </span>

              {isPrivate && (
                <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-white">
                  <Check className="h-3.5 w-3.5" />
                </span>
              )}
            </label>
          </div>

          <FormMessage />
        </FormItem>
      )}
    />
  )
}