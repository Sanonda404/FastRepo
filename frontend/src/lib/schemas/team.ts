import { z } from "zod"

export const createTeamSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Team name is required")
    .max(50, "Team name must be 50 characters or less"),

  parent_team_id: z.number().nullable(),
})

export type CreateTeamInput = z.infer<typeof createTeamSchema>

// ------------------------------------------
// Add existing repository collaborator
// ------------------------------------------

export const addExistingCollaboratorSchema =
  z.object({
    collaborator_id: z
      .number()
      .int()
      .positive("Please select a collaborator"),
  })

export type AddExistingCollaboratorInput =
  z.infer<
    typeof addExistingCollaboratorSchema
  >

// ------------------------------------------
// Add completely new member
// ------------------------------------------

export const addNewMemberSchema =
  z.object({
    member_identifier: z
      .string()
      .trim()
      .min(
        1,
        "Username or email is required",
      ),
  })

export type AddNewMemberInput =
  z.infer<typeof addNewMemberSchema>