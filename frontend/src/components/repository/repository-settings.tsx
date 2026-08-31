import { GitBranch } from "lucide-react"

export default function RepositorySettings() {
  return (
    <aside className="h-fit rounded-xl bg-card p-5 ring-1 ring-foreground/10">
      <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/10 text-green-600">
        <GitBranch className="h-5 w-5" />
      </div>

      <h2 className="font-semibold">Repository settings</h2>

      <div className="mt-4 space-y-4 text-sm">
        <div>
          <p className="font-medium">Visibility</p>
          <p className="mt-1 text-muted-foreground">
            Choose whether your repository is public or private.
          </p>
        </div>

        <div>
          <p className="font-medium">Default branch</p>
          <p className="mt-1 text-muted-foreground">
            New repositories start with{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">main</code>{" "}
            unless you choose another name.
          </p>
        </div>

        <div>
          <p className="font-medium">Permissions</p>
          <p className="mt-1 text-muted-foreground">
            You can configure collaborators and repository permissions after
            creation.
          </p>
        </div>
      </div>
    </aside>
  )
}