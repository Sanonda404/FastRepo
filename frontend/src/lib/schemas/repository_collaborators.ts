import { z } from "zod"

export const addCollaboratorSchema = z.object({
  identifier : z
    .string()
    .min(1, "Username or email is required"),

  role: z.enum([
    "Admin",
    "Maintainer",
    "Viewer",
  ]),
})

export type AddCollaboratorInput =
  z.infer<typeof addCollaboratorSchema>