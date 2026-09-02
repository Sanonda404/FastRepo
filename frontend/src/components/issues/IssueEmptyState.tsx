type Props = {
  icon: React.ReactNode
  title: string
  description: string
}

export default function IssueEmptyState({
  icon,
  title,
  description,
}: Props) {
  return (
    <div className="
      rounded-xl
      border border-dashed border-foreground/10
      bg-muted/10
      p-6
      text-center
    ">
      <div className="
        mx-auto
        flex
        size-10
        items-center
        justify-center
        rounded-xl
        bg-muted
        text-muted-foreground
      ">
        {icon}
      </div>

      <p className="
        mt-3
        text-sm
        font-medium
      ">
        {title}
      </p>

      <p className="
        mt-1
        text-xs
        leading-5
        text-muted-foreground
      ">
        {description}
      </p>
    </div>
  )
}