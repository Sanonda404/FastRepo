import { z } from "zod";

export const newRepositorySchema = z.object({
  name: z
    .string()
    .min(1, "Repository name is required")
    .regex(/^[A-Za-z0-9._-]+$/, "Only letters, numbers, '.', '_', and '-' are allowed"),
  description: z.string().optional(),
  is_private: z.boolean().default(false),
  default_branch: z
    .string()
    .regex(/^[A-Za-z0-9._-]+$/, "Invalid branch name")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.trim() !== "" ? v.trim() : null))
    .nullable()
    .default(null),
});


export type NewRepositoryInput = z.infer<typeof newRepositorySchema>;