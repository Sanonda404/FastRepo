import { z } from "zod";

export const newRepositorySchema = z.object({
  name: z.string().min(1, "Repository name is required"),
  description: z.string().optional(),
  is_private: z.boolean().default(false),
  default_branch: z.string().default("main"),
});

export type NewRepositoryInput = z.infer<typeof newRepositorySchema>;