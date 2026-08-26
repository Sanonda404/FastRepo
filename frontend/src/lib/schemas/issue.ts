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