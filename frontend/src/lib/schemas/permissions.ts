import { z } from "zod"

export const permissionSchema = z.object({
  team_id: z.number().int().positive("Team is required"),
  target_type: z.enum(["branch", "folder"]),
  target_identifier: z.string().min(1, "Branch name is required").max(255),
  allow_write: z.boolean(),
})

export type PermissionInput = z.infer<typeof permissionSchema>
