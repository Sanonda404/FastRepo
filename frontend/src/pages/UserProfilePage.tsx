import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Pencil, Image as ImageIcon, X, Loader2, Mail, Lock } from "lucide-react"

import { api, getErrorMessage, updateProfileApi } from "@/lib/apis/api"
import { getAssignedIssues } from "@/lib/apis/issue_apis"
import { useAuth } from "@/lib/auth/use-auth"
import type { RepositoryResponse, UserResponse, AssignedIssueResponse } from "@/lib/interfaces"
import RepositoryCard from "@/components/repository-card"
import Footer from "@/components/footer"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import AssignedIssues from "@/components/profile/AssignedIssues"

const editSchema = z
  .object({
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    oldPassword: z.string().optional().or(z.literal("")),
    newPassword: z
      .string()
      .optional()
      .or(z.literal(""))
      .refine((v) => !v || v.length >= 6, "New password must be at least 6 characters"),
    confirmNewPassword: z.string().optional().or(z.literal("")),
    profilePicture: z.any().optional(),
  })
  .refine(
    (data) => {
      if (data.newPassword && !data.oldPassword) return false
      return true
    },
    { message: "Old password is required to change password", path: ["oldPassword"] }
  )
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  })

type EditInput = z.infer<typeof editSchema>

export default function UserProfilePage() {
  const { username } = useParams<{ username: string }>()
  const { isLoggedIn, username: currentUsername } = useAuth()
  const [user, setUser] = useState<UserResponse | null>(null)
  const [repos, setRepos] = useState<RepositoryResponse[] | null>(null)
  const [userError, setUserError] = useState<string | null>(null)
  const [reposError, setReposError] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [picBust, setPicBust] = useState(0)
  const [assignedIssues, setAssignedIssues] = useState<AssignedIssueResponse[] | null>(null)

  const [assignedIssuesError, setAssignedIssuesError] = useState<string | null>(null)

  const isOwnProfile = isLoggedIn && currentUsername !== null && username === currentUsername

  const form = useForm<EditInput>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      email: "",
      oldPassword: "",
      newPassword: "",
      confirmNewPassword: "",
      profilePicture: undefined,
    },
  })

  const watchedFile = form.watch("profilePicture")

  useEffect(() => {
    if (watchedFile) {
      const url = URL.createObjectURL(watchedFile)
      setPreview(url)
      return () => URL.revokeObjectURL(url)
    } else {
      setPreview(null)
    }
    }, [watchedFile])

    useEffect(() => {
    if (!username) return

    let active = true

    getAssignedIssues(username)
      .then((data) => {
        if (active) {
          setAssignedIssues(data)
          setAssignedIssuesError(null)
        }
      })
      .catch((err) => {
        if (active) {
          setAssignedIssuesError(getErrorMessage(err))
        }
      })

    return () => {
      active = false
    }
  }, [username])

  const fetchUser = () => {
    if (!username) return
    api<UserResponse>(`/users/${username}`)
      .then((data) => {
        setUser(data)
        setUserError(null)
        // prefill email when opening own profile
        if (isOwnProfile) {
          form.reset({
            email: data.email,
            oldPassword: "",
            newPassword: "",
            confirmNewPassword: "",
            profilePicture: undefined,
          })
        }
      })
      .catch((err) => setUserError(getErrorMessage(err)))
  }

  useEffect(() => {
    fetchUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, isOwnProfile])

  useEffect(() => {
    if (!username) return
    let active = true
    api<RepositoryResponse[]>(`/repositories/${username}`)
      .then((data) => {
        if (active) {
          setRepos(data)
          setReposError(null)
        }
      })
      .catch((err) => {
        if (active) setReposError(getErrorMessage(err))
      })
    return () => {
      active = false
    }
  }, [username])

  useEffect(() => {
    if (editOpen && user && isOwnProfile) {
      form.reset({
        email: user.email,
        oldPassword: "",
        newPassword: "",
        confirmNewPassword: "",
        profilePicture: undefined,
      })
      setPreview(null)
      setEditError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editOpen, user])

  if (userError) {
    return (
      <div className="flex min-h-dvh flex-col">
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
          <p className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive" data-testid="user-error">
            {userError}
          </p>
        </main>
        <Footer />
      </div>
    )
  }

  const avatarSrc = user?.profile_pic_url ? `${user.profile_pic_url}?t=${picBust}` : null

  const onEditSubmit = async (values: EditInput) => {
    setEditError(null)
    setSaving(true)
    try {
      const payload: {
        email?: string
        password?: string
        old_password?: string
        profilePicture?: File
      } = {}
      if (values.email && values.email !== user?.email) payload.email = values.email
      if (values.newPassword) {
        payload.password = values.newPassword
        payload.old_password = values.oldPassword
      }
      if (values.profilePicture) payload.profilePicture = values.profilePicture

      // if nothing changed
      if (!payload.email && !payload.password && !payload.profilePicture) {
        toast.info("No changes to save")
        setEditOpen(false)
        return
      }

      const updated = await updateProfileApi(payload as unknown as Parameters<typeof updateProfileApi>[0])
      setEditOpen(false)
      setUser(updated)
      setPicBust((v) => v + 1)
      toast.success("Profile updated")
      // refresh from server to ensure url updated
      fetchUser()
      // trigger auth change so navbar refreshes
      window.dispatchEvent(new Event("fastrepo:auth-change"))
    } catch (err: unknown) {
      const msg = getErrorMessage(err)
      setEditError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {user ? (
          <section data-testid="profile" className="flex items-center gap-4 rounded-xl bg-card p-5 ring-1 ring-foreground/10">
            <div
              className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-xl font-semibold text-primary-foreground"
              data-testid="profile-picture"
            >
              {avatarSrc ? (
                <img src={avatarSrc} alt={user.username} className="size-full object-cover" />
              ) : (
                user.username[0]?.toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold" data-testid="profile-username">
                {user.username}
              </p>
              <p className="text-sm text-muted-foreground" data-testid="profile-email">
                {user.email}
              </p>
            </div>
            {isOwnProfile && (
              <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogTrigger className={buttonVariants({ variant: "outline", size: "sm" })} data-testid="edit-profile-button">
                  <Pencil className="mr-2 size-4" />
                  Edit
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Edit profile</DialogTitle>
                  </DialogHeader>
                  {editError && (
                    <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" data-testid="edit-error">
                      {editError}
                    </div>
                  )}
                  <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-5">
                    <div className="space-y-2">
                      <Label>Username</Label>
                      <Input value={user.username} disabled className="bg-muted" data-testid="edit-username" />
                      <p className="text-xs text-muted-foreground">Username cannot be changed</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-email">Email</Label>
                      <div className="flex items-center gap-2 rounded-md border px-3 focus-within:ring-2 focus-within:ring-ring/30">
                        <Mail className="size-4 text-muted-foreground" />
                        <input
                          id="edit-email"
                          className="flex h-10 w-full bg-transparent text-sm outline-none"
                          placeholder="you@example.com"
                          {...form.register("email")}
                          data-testid="edit-email"
                        />
                      </div>
                      {form.formState.errors.email && (
                        <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Profile picture</Label>
                      <div className="flex items-center gap-3">
                        <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted">
                          {preview ? (
                            <img src={preview} alt="preview" className="size-full object-cover" />
                          ) : avatarSrc ? (
                            <img src={avatarSrc} alt="current" className="size-full object-cover" />
                          ) : (
                            <ImageIcon className="size-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1">
                          <Input
                            type="file"
                            accept="image/*"
                            data-testid="edit-profile-picture"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              form.setValue("profilePicture", file as unknown as File, { shouldValidate: true })
                            }}
                          />
                        </div>
                        {preview && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => {
                              form.setValue("profilePicture", undefined as unknown as File)
                              setPreview(null)
                            }}
                          >
                            <X className="size-4" />
                          </Button>
                        )}
                      </div>
                      {form.formState.errors.profilePicture && (
                        <p className="text-xs text-destructive">{String(form.formState.errors.profilePicture.message)}</p>
                      )}
                    </div>

                    <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                      <p className="text-sm font-medium">Change password</p>
                      <div className="space-y-2">
                        <Label htmlFor="oldPassword">Old password</Label>
                        <div className="flex items-center gap-2 rounded-md border bg-background px-3 focus-within:ring-2 focus-within:ring-ring/30">
                          <Lock className="size-4 text-muted-foreground" />
                          <input
                            id="oldPassword"
                            type="password"
                            placeholder="Current password"
                            className="flex h-10 w-full bg-transparent text-sm outline-none"
                            {...form.register("oldPassword")}
                            data-testid="edit-old-password"
                          />
                        </div>
                        {form.formState.errors.oldPassword && (
                          <p className="text-xs text-destructive">{form.formState.errors.oldPassword.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">New password</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          placeholder="New password (min 6)"
                          {...form.register("newPassword")}
                          data-testid="edit-new-password"
                        />
                        {form.formState.errors.newPassword && (
                          <p className="text-xs text-destructive">{form.formState.errors.newPassword.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmNewPassword">Confirm new password</Label>
                        <Input
                          id="confirmNewPassword"
                          type="password"
                          placeholder="Confirm new password"
                          {...form.register("confirmNewPassword")}
                          data-testid="edit-confirm-password"
                        />
                        {form.formState.errors.confirmNewPassword && (
                          <p className="text-xs text-destructive">{form.formState.errors.confirmNewPassword.message}</p>
                        )}
                      </div>
                    </div>

                    <DialogFooter>
                      <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={saving} data-testid="edit-save">
                        {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                        Save changes
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </section>
        ) : (
          <p className="text-sm text-muted-foreground">Loading profile…</p>
        )}

        
        {assignedIssues && assignedIssues.length > 0 && (
          <AssignedIssues
            issues={assignedIssues}
            error={assignedIssuesError}
          />
        )}


        <section data-testid="repositories" className="mt-10">
          <h2 className="mb-4 text-lg font-semibold">Repositories</h2>
          {reposError && <p className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{reposError}</p>}
          {!reposError && repos === null && <p className="text-sm text-muted-foreground">Loading repositories…</p>}
          {repos !== null && repos.length === 0 && <p className="text-sm text-muted-foreground">No repositories found.</p>}
          {repos !== null && repos.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {repos.map((repo) => (
                <RepositoryCard key={repo.id} repo={repo} owner={username!} />
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  )
}
