interface GeneralSettingsProps {
  owner: string
  repository: string
}

export default function GeneralSettings({
  owner,
  repository,
}: GeneralSettingsProps) {
  void owner
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h2 className="text-lg font-semibold">
          General
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Manage basic information about this repository.
        </p>
      </div>

      <section className="space-y-2">
        <label className="text-sm font-medium">
          Repository name
        </label>

        <input
          defaultValue={repository}
          className="flex h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />

        <p className="text-xs text-muted-foreground">
          The name used to identify this repository.
        </p>
      </section>

      <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
        <h3 className="font-medium">
          Branch protection
        </h3>

        <p className="mt-1 text-sm text-muted-foreground">
          Require reviews before changes reach main.
        </p>

        <button className="mt-4 rounded-md border px-3 py-2 text-sm hover:bg-muted">
          Configure
        </button>
      </section>
    </div>
  )
}