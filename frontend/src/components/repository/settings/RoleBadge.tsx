import type { RepositoryRole } from "@/lib/auth/permissions"
import {
  Crown,
  Shield,
  UserRoundCog,
  User,
  Eye,
} from "lucide-react"

interface RoleBadgeProps {
  role: RepositoryRole
}

export default function RoleBadge({
  role,
}: RoleBadgeProps) {
  const config = {
    Owner: {
        icon: Crown,
        label: "Owner",
        className: "bg-amber-500/10 text-amber-600",
    },
    Admin: {
        icon: Shield,
        label: "Admin",
        className: "bg-purple-500/10 text-purple-600",
    },
    Maintainer: {
        icon: UserRoundCog,
        label: "Maintainer",
        className: "bg-blue-500/10 text-blue-600",
    },
    Member: {
        icon: User,
        label: "Member",
        className: "bg-pink-500/10 text-pink-600",
    },
    Viewer: {
        icon: Eye,
        label: "Viewer",
        className: "bg-muted text-muted-foreground",
    },
    };


  const item = config[role]
  const Icon = item.icon

  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        rounded-full px-2.5 py-1
        text-xs font-medium
        ${item.className}
      `}
    >
      <Icon className="size-3.5" />

      {item.label}
    </span>
  )
}