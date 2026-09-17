import z from "zod";

export const pullCreateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required"),

  body: z
    .string()
    .trim(),

  source_branch: z
    .string()
    .min(1, "Source branch is required"),

  target_branch: z
    .string()
    .min(1, "Target branch is required"),

  source_repository_id: z
    .number()
    .nullable(),
});

export type PullCreateInput = z.infer<typeof pullCreateSchema>;

export const pullReviewSchema = z.object({
  body: z.string().min(1, { message: "Review comment cannot be empty" }),
  decision: z.enum(["COMMENT", "APPROVED", "REQUEST_CHANGES", "REJECTED"], {
    message: "Please select a decision type",
  }),
});

export type PullReviewInput = z.infer<typeof pullReviewSchema>;

export const issuePrCreateSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  body: z.string().trim().min(1, "Description is required"),
  source_branch: z.string().min(1, "Source branch is required"),
  target_branch: z.string().min(1, "Target branch is required"),
  source_repository_id: z.number().nullable(),
  issue_ids: z
    .array(z.number().int().positive())
    .min(1, "Select at least one issue"),
})

export type IssuePrFormInput = z.infer<typeof issuePrCreateSchema>;

export type IssuePrFormOutput = z.output<typeof issuePrCreateSchema>