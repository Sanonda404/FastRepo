import {
  AlertTriangle,
  Trash2,
} from "lucide-react"

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

import type { Team } from "@/lib/interfaces"

interface DeleteTeamDialogProps {
  open: boolean
  team: Team | null
  hasChildren: boolean
  loading: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function DeleteTeamDialog({
  open,
  team,
  hasChildren,
  loading,
  onClose,
  onConfirm,
}: DeleteTeamDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="size-5" />
          </div>

          <AlertDialogTitle>
            Delete "{team?.name}"?
          </AlertDialogTitle>

          <AlertDialogDescription>
            This action cannot be undone.

            {hasChildren && (
              <span className="mt-2 block font-medium text-destructive">
                This team has sub-teams. Deleting it will
                also delete its entire team hierarchy.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>
            Cancel
          </AlertDialogCancel>

          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            <Trash2 className="mr-2 size-4" />

            {loading ? "Deleting..." : "Delete team"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}