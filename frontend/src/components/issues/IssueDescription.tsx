type Props = {
  body: string
}

export default function IssueDescription({
  body,
}: Props) {
  return (
    <section className="
      overflow-hidden
      rounded-2xl
      border
      bg-card
      shadow-sm
    ">
      <div className="
        border-b
        bg-muted/20
        px-6 py-4
      ">
        <h2 className="font-semibold">
          Description
        </h2>
      </div>

      <div className="
        px-6 py-7
        text-sm
        leading-7
        whitespace-pre-wrap
      ">
        {body || (
          <span className="
            text-muted-foreground
          ">
            No description provided.
          </span>
        )}
      </div>
    </section>
  )
}