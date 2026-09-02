type Props = {
  icon: React.ReactNode
  label: string
  value: number
}

export default function IssueStatCard({
  icon,
  label,
  value,
}: Props) {
  return (
    <div className="
      flex
      items-center
      gap-3
      rounded-xl
      border
      bg-background
      px-4 py-3
      transition-colors
      hover:bg-muted/30
    ">
      <div className="
        flex
        size-9
        shrink-0
        items-center
        justify-center
        rounded-lg
        bg-primary/10
        text-primary
      ">
        {icon}
      </div>

      <div>
        <p className="
          text-[11px]
          font-medium
          text-muted-foreground
        ">
          {label}
        </p>

        <p className="text-sm font-semibold">
          {value}
        </p>
      </div>
    </div>
  )
}