import type { ReactNode } from "react"

type DocsSectionProps = {
  id: string
  title: string
  description?: string
  children: ReactNode
}

export default function DocsSection({
  id,
  title,
  description,
  children,
}: DocsSectionProps) {
  return (
    <section id={id} className="scroll-mt-8">
      <div className="border-b pb-5">
        <h2 className="text-2xl font-bold tracking-tight">
          {title}
        </h2>

        {description && (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      <div className="mt-6">
        {children}
      </div>
    </section>
  )
}