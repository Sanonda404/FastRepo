import { useEffect, useState } from "react"
import {
  Users,
  Settings2,
  GitBranch,
  Shield,
} from "lucide-react"
import { useParams } from "react-router-dom"
import { useAuth } from "@/lib/auth/use-auth"

import RepositoryLayout from "@/components/repository/RepositoryLayout"
import type { RepositoryRole } from "@/lib/auth/permissions"
import { getErrorMessage } from "@/lib/apis/api"
import { getRole } from "@/lib/apis/repository_apis"
import { addCollaborator, getCollaborators, updateCollaboratorRole, deleteCollaborator } from "@/lib/apis/repository_collaborator_apis"
import { getRepository } from "@/lib/apis/repository_apis"

import SettingsSidebar from "@/components/repository/settings/SettingsSidebar"
import GeneralSettings from "@/components/repository/settings/GeneralSettings"
import CollaboratorSettings from "@/components/repository/settings/CollaboratorSettings"
import BranchPermissions from "@/components/repository/settings/BranchPermissions"
import FolderPermissions from "@/components/repository/settings/FolderPermissions"
import type { CollaboratorResponse, CollaboratorRole, RepositoryResponse } from '../lib/interfaces';
import type { AddCollaboratorInput } from "@/lib/schemas/repository_collaborators"
import { RepoPermissionProvider } from "@/components/context/RepoPermissionContext"


export type SettingsTab =
  | "general"
  | "collaborators"
  | "permissions"
  | "branches"

interface SettingsTabItem {
  id: SettingsTab
  label: string
  description: string
  icon: React.ElementType
}

const SETTINGS_TABS: SettingsTabItem[] = [
  {
    id: "general",
    label: "General",
    description: "Repository information",
    icon: Settings2,
  },
  {
    id: "collaborators",
    label: "Collaborators",
    description: "Manage repository access",
    icon: Users,
  },
  {
    id: "permissions",
    label: "Access & permissions",
    description: "Configure for paths",
    icon: Shield,
  },
  {
    id: "branches",
    label: "Branches",
    description: "Branch protection",
    icon: GitBranch,
  },
]

export default function RepositorySettingsPage() {
  const {
    owner = "jane",
    repository = "fastrepo",
  } = useParams()
  const { username: currentUsername, isLoggedIn } = useAuth()

  const [role, setRole] =
    useState<RepositoryRole>("Viewer")

  const [activeTab, setActiveTab] =
    useState<SettingsTab>("general")

  const [error, setError] =
    useState<string | null>(null)
  
  const [repositoryData, setRepositoryData] =
    useState<RepositoryResponse | null>(null)

  const [displayRepository, setDisplayRepository] = useState(repository)

  const [actionLoading, setActionLoading] =
    useState(false)
  
  const [collaborators, setCollaborators] = useState<CollaboratorResponse[]>([]);

  const [actionError, setActionError] =
    useState<string | null>(null)

  useEffect(() => {
    getRole(owner, repository)
      .then((data) => {
        setRole(data)
      })
      .catch((err) => {
        setError(getErrorMessage(err))
      })
  }, [owner, repository])

  useEffect(() => {
    if (!owner || !repository) return

    const loadRepository = async () => {
      try {
        const data = await getRepository(
          owner,
          repository,
        )

        setRepositoryData(data)
      } catch (err) {
        setError(getErrorMessage(err))
      }
    }

    loadRepository()
  }, [owner, repository])

  useEffect(() => {
    if (!owner || !repository) return

    const loadCollaborators = async () => {
      try {
        const data = await getCollaborators(
          owner,
          repository,
        )

        setCollaborators(data)
      } catch (err) {
        setError(getErrorMessage(err))
      }
    }

    loadCollaborators()
  }, [owner, repository])

  const handleAddCollaborator = async (
    data: AddCollaboratorInput,
  ) => {
    if (!owner || !repository) return

    const ident = data.identifier.trim().toLowerCase()
    if (currentUsername && ident === currentUsername.toLowerCase()) {
      const msg = "You cannot add yourself as a collaborator"
      setActionError(msg)
      throw new Error(msg)
    }
    if (ident === owner.toLowerCase()) {
      const msg = "Cannot add repository owner as collaborator"
      setActionError(msg)
      throw new Error(msg)
    }

    setActionLoading(true)
    setActionError(null)

    try {
      const created = await addCollaborator(
        owner,
        repository,
        data,
      )
      setCollaborators((prev) => {
        const exists = prev.find((c) => c.id === created.id || c.username.toLowerCase() === created.username.toLowerCase())
        if (exists) {
          return prev.map((c) => (c.id === created.id || c.username.toLowerCase() === created.username.toLowerCase() ? created : c))
        }
        return [...prev, created]
      })
    } catch (err) {
      setActionError(
        getErrorMessage(err),
      )

      throw err
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteCollaborator = async (
    collaborator: CollaboratorResponse,
  ) => {
    if (!owner || !repository) return;

    setActionError(null);

    try {
      await deleteCollaborator(owner, repository, collaborator.id);

      setCollaborators((prev) =>
        prev.filter((c) => c.id !== collaborator.id)
      );
    } catch (err) {
      setActionError(getErrorMessage(err));
      throw err;
    }
  };


  const handleChangeRole = async (
    collaborator: CollaboratorResponse,
    role: CollaboratorRole,
  ) => {
    if (!owner || !repository) return;

    setActionError(null);

    try {
      // Call API → returns updated collaborator
      const updated = await updateCollaboratorRole(
        owner,
        repository,
        collaborator.id,
        role,
      );

      setCollaborators((prev) =>
        prev.map((c) =>
          c.id === updated.id ? updated : c
        )
      );
    } catch (err) {
      setActionError(getErrorMessage(err));
      throw err;
    }
  };


  // keep header title in sync immediately via effects
  useEffect(() => {
    setDisplayRepository(repository)
  }, [repository])

  useEffect(() => {
    if (repositoryData?.name) setDisplayRepository(repositoryData.name)
  }, [repositoryData?.name])

  return (
    <RepositoryLayout
      role={role}
      owner={owner}
      repository={displayRepository}
      activeTab="Settings"
    >
      <div className="rounded-xl bg-card ring-1 ring-foreground/10">
        {/* Header */}
        <div className="border-b border-foreground/10 px-6 py-5">
          <h1 className="text-xl font-semibold">
            Repository settings
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Configure how this repository behaves and
            manage who has access to it.
          </p>
        </div>

        {error && (
          <div className="mx-6 mt-5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex min-h-[600px] flex-col md:flex-row">

          {/* Sidebar */}
          <SettingsSidebar
            tabs={SETTINGS_TABS}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          {/* Content */}
          <main className="min-w-0 flex-1 p-6">
            {activeTab === "general" && (
              <GeneralSettings
                owner={owner}
                repository={displayRepository}
                initialDescription={repositoryData?.description ?? null}
              />
            )}

            {activeTab === "collaborators" && (
              !isLoggedIn ? (
                <div className="rounded-xl border border-dashed p-10 text-center">
                  <p className="text-sm font-medium">Please sign in to manage collaborators</p>
                  <p className="mt-1 text-xs text-muted-foreground">You need to be logged in and have admin access.</p>
                </div>
              ) : (
                <RepoPermissionProvider role = {role}>
                  <CollaboratorSettings
                    ownerUsername={owner}
                    isPrivate={
                      repositoryData?.is_private ?? false
                    }
                    loading={actionLoading}
                    error={actionError}
                    collaborators={collaborators}
                    onAddCollaborator={
                      handleAddCollaborator
                    }
                    onChangeRole={
                      handleChangeRole
                    }
                    onDeleteCollaborator={
                      handleDeleteCollaborator
                    }
                  />
                </RepoPermissionProvider>
              )
            )}

            {activeTab === "permissions" && (
              !isLoggedIn ? (
                <div className="rounded-xl border border-dashed p-10 text-center">
                  <p className="text-sm font-medium">Please sign in to manage folder permissions</p>
                  <p className="mt-1 text-xs text-muted-foreground">You need to be logged in and have admin access.</p>
                </div>
              ) : (
                <RepoPermissionProvider role={role}>
                  <FolderPermissions owner={owner} repository={displayRepository} />
                </RepoPermissionProvider>
              )
            )}

            {activeTab === "branches" && (
              !isLoggedIn ? (
                <div className="rounded-xl border border-dashed p-10 text-center">
                  <p className="text-sm font-medium">Please sign in to manage branch permissions</p>
                  <p className="mt-1 text-xs text-muted-foreground">You need to be logged in and have admin access.</p>
                </div>
              ) : (
                <RepoPermissionProvider role={role}>
                  <BranchPermissions owner={owner} repository={displayRepository} />
                </RepoPermissionProvider>
              )
            )}


          </main>
        </div>
      </div>
    </RepositoryLayout>
  )
}