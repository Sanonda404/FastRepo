import { z } from "zod"

export const createTeamSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Team name is required")
    .max(50, "Team name must be 50 characters or less"),

  parent_team_id: z.number().nullable(),
})

export const addTeamMemberSchema = z.object({
  member_id: z.number({
    message: "Please select a member",
  }),
})

export type CreateTeamInput = z.infer<typeof createTeamSchema>
export type AddTeamMemberInput = z.infer<typeof addTeamMemberSchema>