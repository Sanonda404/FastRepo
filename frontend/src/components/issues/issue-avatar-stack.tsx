export default function IssueAvatarStack({
  users,
}: {
  users: string[]
}) {
  return (
    <span className="flex items-center">
      {users.map((user, index) => (
        <span
          key={user}
          title={user}
          className={`flex size-6 items-center justify-center rounded-full border-2 border-card bg-primary text-[10px] font-semibold text-primary-foreground ${
            index > 0 ? "-ml-2" : ""
          }`}
        >
          {user.charAt(0).toUpperCase()}
        </span>
      ))}
    </span>
  )
}
