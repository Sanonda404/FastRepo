import { useState } from "react"
import { Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { forgotPassword } from "@/lib/apis/user_apis"
import { getErrorMessage } from "@/lib/apis/api"

import {
  ArrowRight,
  Loader2,
  Mail,
  CheckCircle2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
})

type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  })

  const handleSubmit = async (data: ForgotPasswordInput) => {
    try {
      setLoading(true)
      setError(null)
      await forgotPassword(data)
      setSubmitted(true)
    } catch (err: unknown) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[420px] items-center justify-center px-4">
      <div className="w-full max-w-md">

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-green-600/10 text-green-600">
            {submitted ? (
              <CheckCircle2 className="size-6" />
            ) : (
              <Mail className="size-6" />
            )}
          </div>

          <h1 className="text-2xl font-bold tracking-tight">
            {submitted ? "Check your email" : "Forgot password?"}
          </h1>

        </div>

        {submitted ? (
          <div className="space-y-5 text-center">
            <div className="rounded-lg bg-green-600/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
              If an account exists with that email address, a reset link has been sent.
            </div>

            <Link
              to="/login"
              className="
                inline-flex text-sm font-medium text-muted-foreground
                transition-colors hover:text-green-600
              "
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-5"
          >
            {error && (
              <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">
                Email address
              </Label>

              <div className="
                flex items-center gap-2 rounded-lg border bg-background px-3
                focus-within:border-green-600
                focus-within:ring-2
                focus-within:ring-green-600/20
              ">
                <Mail className="size-4 shrink-0 text-muted-foreground" />

                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="
                    h-11 w-full bg-transparent text-sm outline-none
                    placeholder:text-muted-foreground
                  "
                  {...form.register("email")}
                />
              </div>

              {form.formState.errors.email && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="
                h-11 w-full rounded-lg bg-green-600
                font-medium text-white shadow-sm
                transition-colors hover:bg-green-700
                disabled:opacity-60
              "
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  Send reset link
                  <ArrowRight className="ml-2 size-4" />
                </>
              )}
            </Button>

            <div className="pt-1 text-center">
              <Link
                to="/login"
                className="
                  text-sm font-medium text-muted-foreground
                  transition-colors hover:text-green-600
                "
              >
                Back to sign in
              </Link>
            </div>
          </form>
        )}

      </div>
    </div>
  )
}