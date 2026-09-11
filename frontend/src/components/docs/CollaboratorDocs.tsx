import DocsSection from "./DocsSection"

const roles = [
  {
    name: "Owner",
    description:
      "Has full control over the repository and can perform all repository actions.",
    color: "bg-green-600/10 text-green-700",
  },
  {
    name: "Admin",
    description:
      "Can manage almost everything in the repository except deleting the repository.",
    color: "bg-blue-600/10 text-blue-700",
  },
  {
    name: "Maintainer",
    description:
      "Can manage repository content and issues but cannot manage collaborators, teams, or delete the repository.",
    color: "bg-violet-600/10 text-violet-700",
  },
  {
    name: "Member",
    description:
      "Exists through team membership and receives access from their teams.",
    color: "bg-orange-600/10 text-orange-700",
  },
  {
    name: "Viewer",
    description:
      "Private repository read-only role with no repository modification permissions.",
    color: "bg-slate-500/10 text-slate-700",
  },
]

export default function CollaboratorDocs() {
  return (
    <DocsSection
      id="collaborators"
      title="Collaborators and roles"
      description="FastRepo uses repository roles together with team-based permissions."
    >
      <div className="space-y-4">
        {roles.map((role) => (
          <div
            key={role.name}
            className="rounded-xl border bg-card p-5"
          >
            <div className="flex items-center gap-3">
              <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${role.color}`}>
                {role.name}
              </span>
            </div>

            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {role.description}
            </p>

            <RoleDetails role={role.name} />
          </div>
        ))}
      </div>
    </DocsSection>
  )
}

function RoleDetails({
  role,
}: {
  role: string
}) {
  const details: Record<string, string[]> = {
    Owner: [
      "Full control over the repository.",
      "Can manage collaborators, teams, permissions, issues, and repository settings.",
      "Can delete the repository.",
    ],

    Admin: [
      "Can manage collaborators and collaborator roles.",
      "Can create and manage teams and team members.",
      "Can manage permissions.",
      "Cannot delete the repository.",
    ],

    Maintainer: [
      "Has default write access.",
      "Can create, close, and delete issues.",
      "Cannot add or remove collaborators.",
      "Cannot update collaborator roles.",
      "Cannot create or manage teams.",
      "Cannot add or remove team members.",
      "Cannot delete the repository.",
      "Can lose write access to a branch or folder when a team permission explicitly denies writing.",
    ],

    Member: [
      "Cannot be directly added as a normal collaborator.",
      "Must belong to at least one team.",
      "Does not receive default repository write access.",
      "Inherits access from team permissions.",
      "Can belong to multiple teams.",
    ],

    Viewer: [
      "Available for private repositories.",
      "Read-only repository access.",
      "Cannot modify repository content.",
      "Can create issues.",
      "Can delete issues or comments they authored.",
    ],
  }

  return (
    <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
      {details[role].map((detail) => (
        <li key={detail} className="flex gap-2">
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-green-600" />
          {detail}
        </li>
      ))}
    </ul>
  )
}