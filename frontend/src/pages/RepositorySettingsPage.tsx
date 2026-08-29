import { useParams } from "react-router-dom"
import RepositoryLayout from "@/components/repository/RepositoryLayout"
import type { RepositoryRole }from '@/lib/auth/permissions';
import { getErrorMessage } from "@/lib/apis/api";
import { useState, useEffect } from "react";
import { getRole } from "@/lib/apis/repository_apis";

export default function RepositorySettingsPage() {
  const { owner = "jane", repository = "fastrepo" } = useParams()

  const [role, setRole] = useState<RepositoryRole>('Viewer')
  
    useEffect(() => {
      getRole(owner,repository).then((data) => {
  
          setRole(data)
        })
        .catch((err) => {
  
          console.log(getErrorMessage(err))
        })
    }, [owner, repository])

  return (
    <RepositoryLayout role = {role} owner={owner} repository={repository} activeTab="Settings">
      <div className="rounded-xl bg-card ring-1 ring-foreground/10">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">Settings</h2>
          <p className="mt-1 text-sm text-muted-foreground">Configure how this repository behaves.</p>
        </div>
        <div className="space-y-6 p-5">
  <div className="max-w-xl">
    <label className="text-sm font-medium">Repository name</label>
    <input defaultValue="fastrepo" className="mt-2 flex h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
  </div>
  <div className="rounded-lg border p-4">
    <p className="text-sm font-medium">Branch protection</p>
    <p className="mt-1 text-xs text-muted-foreground">Require reviews before changes reach main.</p>
    <button className="mt-3 rounded-md border px-3 py-2 text-sm hover:bg-muted">Configure</button>
  </div>
  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
    <p className="text-sm font-semibold text-destructive">Danger zone</p>
    <p className="mt-1 text-xs text-muted-foreground">Permanently delete this repository.</p>
    <button className="mt-3 rounded-md bg-destructive px-3 py-2 text-sm text-destructive-foreground">Delete</button>
  </div>
</div>
      </div>
    </RepositoryLayout>
  )
}
