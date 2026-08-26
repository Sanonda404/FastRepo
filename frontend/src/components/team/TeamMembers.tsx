import { Users } from "lucide-react"
import type { TeamMember } from "@/lib/interfaces"

interface TeamMembersProps {
  members: TeamMember[]
}

export default function TeamMembers({
  members,
}: TeamMembersProps) {
  if (members.length === 0) {
    return (
      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Users className="size-4" />
        No members yet
      </div>
    )
  }

  const visibleMembers = members.slice(0, 5)
  const remaining = members.length - visibleMembers.length

  return (
    <div className="mt-4 flex items-center">
      <div className="flex -space-x-2">
        {visibleMembers.map((member) => (
          <div
            key={member.id}
            title={member.username}
            className="flex size-8 items-center justify-center overflow-hidden rounded-full border-2 border-card bg-primary/10 text-xs font-medium"
          >
            { (
              member.username.charAt(0).toUpperCase()
            )}
          </div>
        ))}

        {remaining > 0 && (
          <div className="flex size-8 items-center justify-center rounded-full border-2 border-card bg-muted text-xs font-medium">
            +{remaining}
          </div>
        )}
      </div>

      <span className="ml-3 text-xs text-muted-foreground">
        {members.length}{" "}
        {members.length === 1 ? "member" : "members"}
      </span>
    </div>
  )
}