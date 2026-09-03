import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { deleteRepository, updateRepository } from "@/lib/apis/repository_apis"
import { getErrorMessage } from "@/lib/apis/api"
import { HasCapability } from "@/components/guards/HasCapability"

interface GeneralSettingsProps {
  owner: string
  repository: string
  initialDescription?: string | null
}

export default function GeneralSettings({
  owner,
  repository,
  initialDescription,
}: GeneralSettingsProps) {
  const navigate = useNavigate()

  const [name, setName] = useState(repository)
  const [description, setDescription] = useState(initialDescription ?? "")
  const [nameSaving, setNameSaving] = useState(false)
  const [descSaving, setDescSaving] = useState(false)
  const [confirmNameOpen, setConfirmNameOpen] = useState(false)

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setName(repository)
  }, [repository])

  useEffect(() => {
    setDescription(initialDescription ?? "")
  }, [initialDescription])

  const trimmedName = name.trim()
  const nameChanged = trimmedName !== repository && trimmedName.length > 0
  const descChanged = description !== (initialDescription ?? "")

  const handleConfirmRename = async () => {
    if (!nameChanged) return
    setNameSaving(true)
    try {
      const updated = await updateRepository(owner, repository, { name: trimmedName })
      toast.success("Repository renamed")
      setConfirmNameOpen(false)
      navigate(`/${owner}/${updated.name}/settings`, { replace: true })
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setNameSaving(false)
    }
  }

  const handleSaveDescription = async () => {
    setDescSaving(true)
    try {
      await updateRepository(owner, repository, { description: description.trim() === "" ? null : description })
      toast.success("Description updated")
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setDescSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteRepository(owner, repository)
      toast.success("Repository deleted")
      setConfirmDeleteOpen(false)
      navigate("/")
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h2 className="text-lg font-semibold">General</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage basic information about this repository.
        </p>
      </div>

      <section className="space-y-2">
        <label htmlFor="repo-name" className="text-sm font-medium">
          Repository name
        </label>
        <div className="flex gap-2">
          <input
            id="repo-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <Button
            onClick={() => setConfirmNameOpen(true)}
            disabled={!nameChanged || nameSaving}
          >
            {nameSaving ? "Saving..." : "Rename"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          The name used to identify this repository. Renaming will change its URL.
        </p>
      </section>

      <section className="space-y-2">
        <label htmlFor="repo-description" className="text-sm font-medium">
          Description
        </label>
        <textarea
          id="repo-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add a short description..."
          rows={3}
          className="flex min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <p className="text-xs text-muted-foreground">
          Describe what this repository does.
        </p>
        <Button
          onClick={handleSaveDescription}
          disabled={!descChanged || descSaving}
          variant="outline"
        >
          {descSaving ? "Saving..." : "Save description"}
        </Button>
      </section>

      <HasCapability capability = "canDeleteRepo">
        <section className="rounded-xl border border-destructive/30 p-5">
          <h3 className="font-medium text-destructive">Delete repository</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Permanently delete this repository. This action cannot be undone.
          </p>
          
            <Button
              variant="destructive"
              className="mt-4 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => setConfirmDeleteOpen(true)}
              data-testid="delete-repository-button"
            >
              Delete repository
            </Button>
          
        </section>
      </HasCapability>

      <AlertDialog open={confirmNameOpen} onOpenChange={setConfirmNameOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm rename?</AlertDialogTitle>
            <AlertDialogDescription>
              This will rename <span className="font-medium text-foreground">{owner}/{repository}</span> to{" "}
              <span className="font-medium text-foreground">{owner}/{trimmedName}</span>. The URL will change.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={nameSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRename} disabled={nameSaving}>
              {nameSaving ? "Renaming..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete repository?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-medium text-foreground">{owner}/{repository}</span> and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
