import { useState, useRef, useEffect } from "react"
import { Link, useSearchParams, useNavigate, useLocation } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import { ArrowRight, KeyRound, Loader2, Lock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { resetPassword } from "@/lib/apis/user_apis"
import { getErrorMessage } from "@/lib/apis/api"

const resetPasswordSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tokenRef = useRef<string | null>(searchParams.get("token"))

  useEffect(() => {
    document.title = "Reset password · FastRepo"
  }, [])

  useEffect(() => {
    const t = searchParams.get("token")
    if (t) {
      tokenRef.current = t
      navigate(location.pathname, { replace: true })
    } else if (!tokenRef.current) {
      tokenRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const token = tokenRef.current

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  })

  const handleSubmit = async (data: ResetPasswordInput) => {
    try {
      setLoading(true)
      setError(null)

      if (!token) {
        setError("Invalid or missing reset token")
        return
      }

      await resetPassword({ token, new_password: data.password })

      setSuccess(true)
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Unable to reset your password. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="
      flex min-h-dvh items-center justify-center
      bg-gradient-to-br
      from-slate-50 via-emerald-50/40 to-sky-50/50
      px-5 py-10
      dark:from-background
      dark:via-background
      dark:to-background
    ">
      <div className="w-full max-w-md">

        <div className="mb-10 text-center">
          <div className="
            mx-auto mb-5 flex size-14 items-center justify-center
            rounded-2xl
            bg-gradient-to-br from-green-600 to-emerald-600
            text-white
            shadow-lg shadow-green-600/20
          ">
            <KeyRound className="size-6" />
          </div>

          <h1 className="text-3xl font-bold tracking-tight">
            Reset password
          </h1>

          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Choose a new password for your FastRepo account.
          </p>
        </div>

        {success ? (
          <div className="text-center">
            <div className="
              mb-6 rounded-xl
              bg-green-600/10
              px-5 py-5
              text-sm leading-6
              text-green-700
              dark:text-green-400
            ">
              <KeyRound className="mx-auto mb-3 size-5" />

              Your password has been reset successfully. You can now
              sign in with your new password.
            </div>

            <Link
              to="/login"
              className="
                text-sm font-semibold text-green-600
                transition-colors hover:text-green-700
              "
            >
              Go to sign in
            </Link>
          </div>
        ) : (
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            {error && (
              <div className="
                rounded-xl
                bg-destructive/10
                px-4 py-3
                text-sm text-destructive
              ">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">
                New password
              </Label>

              <div className="
                flex items-center gap-3
                rounded-xl border border-border
                bg-background px-3
                transition
                focus-within:border-green-600
                focus-within:ring-4
                focus-within:ring-green-600/10
              ">
                <Lock className="size-4 shrink-0 text-muted-foreground" />

                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="
                    h-11 w-full bg-transparent text-sm
                    outline-none
                    placeholder:text-muted-foreground
                  "
                  {...form.register("password")}
                />
              </div>

              {form.formState.errors.password && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                Confirm new password
              </Label>

              <div className="
                flex items-center gap-3
                rounded-xl border border-border
                bg-background px-3
                transition
                focus-within:border-green-600
                focus-within:ring-4
                focus-within:ring-green-600/10
              ">
                <Lock className="size-4 shrink-0 text-muted-foreground" />

                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  className="
                    h-11 w-full bg-transparent text-sm
                    outline-none
                    placeholder:text-muted-foreground
                  "
                  {...form.register("confirmPassword")}
                />
              </div>

              {form.formState.errors.confirmPassword && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="
                h-11 w-full rounded-xl
                bg-green-600 text-white
                shadow-lg shadow-green-600/20
                transition
                hover:bg-green-700
                hover:shadow-green-600/30
                disabled:opacity-60
              "
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Resetting password...
                </>
              ) : (
                <>
                  Reset password
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
    </main>
  )
}