import z from "zod";

export const issueCreateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required"),

  body: z
    .string()
    .trim()
    .min(1, "Description is required"),
})

export type IssueCreateInput = z.infer<typeof issueCreateSchema>;

export const issueCommentSchema = z.object({
  body: z.string().min(1, "Comment cannot be empty"),
})

export const issueAssigneeSchema = z.object({
  username: z.string().min(1, "Username is required"),
})

export const labelSchema = z.object({
  name: z.string().min(1, "Label name is required"),
  color: z
    .string()
    .regex(
      /^#[0-9a-fA-F]{6}$/,
      "Color must be a valid hex color",
    )
    .optional(),
})

export type IssueCommentInput =
  z.infer<typeof issueCommentSchema>

export type IssueAssigneeInput =
  z.infer<typeof issueAssigneeSchema>

export type LabelInput =
  z.infer<typeof labelSchema>