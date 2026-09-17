import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { pullReviewSchema, type PullReviewInput } from "@/lib/schemas/pull"

interface PullReviewDialogProps {
  onSubmit: (data: PullReviewInput) => Promise<void>
  loading?: boolean
}

export default function PullReviewDialog({
  onSubmit,
  loading = false,
}: PullReviewDialogProps) {
  const [open, setOpen] = useState(false)

  const form = useForm<PullReviewInput>({
    resolver: zodResolver(pullReviewSchema),
    defaultValues: {
      decision: "APPROVED",
      body: "",
    },
  })

  const handleSubmit = async (values: PullReviewInput) => {
    try {
      await onSubmit(values)
      form.reset()
      setOpen(false)
    } catch (error) {
      console.error("Failed to submit review:", error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button disabled={loading} size="sm">
          {loading ? "Submitting..." : "Submit Review"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Review Pull Request</DialogTitle>
          <DialogDescription>
            Submit your decision and review comment on this pull request.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="decision"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Decision</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select review decision" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="REQUEST_CHANGES">Request Changes</SelectItem>
                      <SelectItem value="COMMENT">Comment</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="body"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Comments</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Leave your review comments here..."
                      rows={4}
                      aria-invalid={fieldState.invalid}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}