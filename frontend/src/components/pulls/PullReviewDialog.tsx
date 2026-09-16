import { useState } from "react"
import { MessageSquarePlus, Send } from "lucide-react"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import {
  pullReviewSchema,
  type PullReviewInput,
} from "@/lib/schemas/pull"

import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
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
  onSubmit: (data: PullReviewInput) => Promise<void>
}

export default function PullReviewDialog({ loading, onSubmit }: Props) {
  const [open, setOpen] = useState(false)

  const form = useForm<PullReviewInput>({
    resolver: zodResolver(pullReviewSchema),
    defaultValues: {
      body: "",
    },
  })

  const handleSubmit = async (data: PullReviewInput) => {
    try {
      await onSubmit(data)
      form.reset()
      setOpen(false)
    } catch {
      // Parent displays the API error.
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ size: "sm", className: "rounded-lg" })}>
        <MessageSquarePlus className="mr-2 size-4" />
        Add review
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a review</DialogTitle>
          <DialogDescription>
            Share feedback or questions about this pull request.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="pull-review">Review</Label>
            <textarea
              id="pull-review"
              rows={6}
              placeholder="Write your review..."
              className="flex w-full resize-none rounded-xl border bg-background px-3 py-2.5 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
              {...form.register("body")}
            />
            {form.formState.errors.body && (
              <p className="text-xs text-destructive">
                {form.formState.errors.body?.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading} className="rounded-lg">
              <Send className="mr-2 size-4" />
              {loading ? "Posting..." : "Post review"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
