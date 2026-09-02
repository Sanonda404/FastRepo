import { useState } from "react"
import { Tag } from "lucide-react"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import {
  labelSchema,
  type LabelInput,
} from "@/lib/schemas/issue"

import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Input } from "@/components/ui/input"
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
    data: LabelInput
  ) => Promise<void>
}

export default function IssueLabelDialog({
  loading,
  onSubmit,
}: Props) {
  const [open, setOpen] = useState(false)

  const form = useForm<LabelInput>({
    resolver: zodResolver(labelSchema),
    defaultValues: {
      name: "",
      color: "#6b7280",
    },
  })

  const selectedColor =
    form.watch("color") || "#6b7280"

  const handleSubmit = async (
    data: LabelInput
  ) => {
    try {
      await onSubmit(data)

      form.reset()
      setOpen(false)
    } catch {
      // Parent handles error.
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
    >
      <DialogTrigger
        className={buttonVariants({ variant: "outline", size: "icon", className: "size-8 rounded-lg" })}
      >
        <Tag className="size-4" />
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Add label
          </DialogTitle>

          <DialogDescription>
            Create a label to organize this
            issue.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(
            handleSubmit
          )}
          className="space-y-5"
        >
          <div className="space-y-2">
            <Label htmlFor="label-name">
              Label name
            </Label>

            <Input
              id="label-name"
              placeholder="e.g. bug"
              className="rounded-lg"
              {...form.register("name")}
            />

            {form.formState.errors.name && (
              <p className="
                text-xs
                text-destructive
              ">
                {
                  form.formState.errors.name
                    ?.message
                }
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Color</Label>

            <div className="
              flex
              items-center
              gap-3
            ">
              <label
                className="
                  relative
                  flex
                  size-11
                  shrink-0
                  cursor-pointer
                  overflow-hidden
                  rounded-xl
                  border-2
                  shadow-sm
                  transition-transform
                  hover:scale-105
                "
                style={{
                  borderColor:
                    selectedColor,
                  boxShadow: `
                    0 3px 12px
                    ${selectedColor}55
                  `,
                }}
              >
                <span
                  className="
                    absolute
                    inset-0
                  "
                  style={{
                    backgroundColor:
                      selectedColor,
                  }}
                />

                <input
                  type="color"
                  className="
                    absolute
                    inset-0
                    size-full
                    cursor-pointer
                    opacity-0
                  "
                  {...form.register(
                    "color"
                  )}
                />
              </label>

              <Input
                placeholder="#6b7280"
                className="
                  rounded-lg
                  font-mono
                "
                {...form.register(
                  "color"
                )}
              />
            </div>

            {form.formState.errors.color && (
              <p className="
                text-xs
                text-destructive
              ">
                {
                  form.formState.errors.color
                    ?.message
                }
              </p>
            )}
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Preview</Label>

            <div className="
              rounded-xl
              border
              bg-muted/20
              p-4
            ">
              <span
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-full
                  px-3 py-1.5
                  text-xs
                  font-semibold
                "
                style={{
                  color: selectedColor,
                  backgroundColor:
                    `${selectedColor}25`,
                  border:
                    `1px solid ${selectedColor}70`,
                }}
              >
                <span
                  className="
                    size-2
                    rounded-full
                  "
                  style={{
                    backgroundColor:
                      selectedColor,
                  }}
                />

                {form.watch("name") ||
                  "label"}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={loading}
              className="rounded-lg"
            >
              <Tag className="
                mr-2
                size-4
              " />

              {loading
                ? "Adding..."
                : "Add label"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}