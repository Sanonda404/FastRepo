import { useState } from "react"
import {
  MessageSquarePlus,
  Send,
} from "lucide-react"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import {
  issueCommentSchema,
  type IssueCommentInput,
} from "@/lib/schemas/issue"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

type Props = {
  loading: boolean
  onSubmit: (
    data: IssueCommentInput
  ) => Promise<void>
}

export default function IssueCommentDialog({
  loading,
  onSubmit,
}: Props) {
  const [open, setOpen] = useState(false)

  const form = useForm<IssueCommentInput>({
    resolver: zodResolver(
      issueCommentSchema
    ),
    defaultValues: {
      body: "",
    },
  })

  const handleSubmit = async (
    data: IssueCommentInput
  ) => {
    try {
      await onSubmit(data)

      form.reset()
      setOpen(false)
    } catch {
      // Parent displays the API error.
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
    >
      <DialogTrigger>
        <Button
          type="button"
          size="sm"
          className="rounded-lg"
        >
          <MessageSquarePlus className="
            mr-2
            size-4
          " />

          Add comment
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Add a comment
          </DialogTitle>

          <DialogDescription>
            Share context, progress, or
            additional information about
            this issue.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(
            handleSubmit
          )}
          className="space-y-5"
        >
          <div className="space-y-2">
            <Label htmlFor="issue-comment">
              Comment
            </Label>

            <textarea
              id="issue-comment"
              rows={6}
              placeholder="
                Write your comment...
              "
              className="
                flex
                w-full
                resize-none
                rounded-xl
                border
                bg-background
                px-3 py-2.5
                text-sm
                shadow-sm
                outline-none
                transition
                placeholder:text-muted-foreground
                focus-visible:border-ring
                focus-visible:ring-2
                focus-visible:ring-ring/30
              "
              {...form.register("body")}
            />

            {form.formState.errors.body && (
              <p className="
                text-xs
                text-destructive
              ">
                {
                  form.formState.errors.body
                    ?.message
                }
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={loading}
              className="rounded-lg"
            >
              <Send className="
                mr-2
                size-4
              " />

              {loading
                ? "Posting..."
                : "Post comment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}