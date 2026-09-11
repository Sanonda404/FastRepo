import { BookOpen } from "lucide-react"

export default function DocsHero() {
  return (
    <section>
      <div className="flex size-12 items-center justify-center rounded-xl bg-green-600/10 text-green-600">
        <BookOpen className="size-6" />
      </div>

      <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
        FastRepo Documentation
      </h1>

      <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
        Learn how FastRepo helps teams organize repositories,
        collaborators, nested teams, and repository permissions.
      </p>
    </section>
  )
}