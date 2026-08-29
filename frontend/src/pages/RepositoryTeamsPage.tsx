import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"

import RepositoryLayout from "@/components/repository/RepositoryLayout"

import TeamHeader from "@/components/team/TeamHeader"
import TeamViewToggle from "../components/team/TeamViewToggle"
import type { TeamView } from "../components/team/TeamViewToggle"

import TeamHierarchy from "@/components/team/TeamHierarchy"
import TeamList from "@/components/team/TeamList"

import CreateTeamDialog from "@/components/team/CreateTeamDialog"
import AddTeamMemberDialog from "@/components/team/AddMemberDialog"
import EditTeamDialog from "@/components/team/EditTeamDialog"
import DeleteTeamDialog from "@/components/team/DeleteTeamDialog"

import type { Team } from "@/lib/interfaces"

import {
  type CreateTeamInput,
  type AddTeamMemberInput,
} from "@/lib/schemas/team"

import { api, getErrorMessage } from "@/lib/apis/api"
import { createTeam,getAllTeams, updateTeam, deleteTeam } from "@/lib/apis/team_apis"
import { getRole } from "@/lib/apis/repository_apis"
import type { RepositoryRole } from "@/lib/auth/permissions"

interface Collaborator {
  id: number
  username: string
  avatar_url?: string | null
}

export default function RepositoryTeamsPage() {
  const { owner, repository } = useParams<{
    owner: string
    repository: string
  }>()

  const [teams, setTeams] = useState<Team[]>([])
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [role, setRole] = useState<RepositoryRole>()

  const [view, setView] = useState<TeamView>("hierarchy")

  const [editDialogOpen, setEditDialogOpen] = useState(false)

  const [deleteDialogOpen, setDeleteDialogOpen] =
    useState(false)

  const [selectedEditTeam, setSelectedEditTeam] =
    useState<Team | null>(null)

  const [selectedDeleteTeam, setSelectedDeleteTeam] =
    useState<Team | null>(null)

  const [loading, setLoading] = useState(true)

  const [createDialogOpen, setCreateDialogOpen] =
    useState(false)

  const [memberDialogOpen, setMemberDialogOpen] =
    useState(false)

  const [selectedParentTeam, setSelectedParentTeam] =
    useState<Team | null>(null)

  const [selectedTeam, setSelectedTeam] =
    useState<Team | null>(null)

  const [actionLoading, setActionLoading] =
    useState(false)

  const [error, setError] =
    useState<string | null>(null)

  useEffect(() => {
    if (!owner || !repository) return

    let active = true

    getAllTeams(owner, repository)
      .then((data) => {
        if (!active) return

        setTeams(data)
        setLoading(false)
      })
      .catch((err) => {
        if (!active) return

        setError(getErrorMessage(err))
        setLoading(false)
      })

      getRole(owner, repository)
      .then((data) => {
        if (!active) return

        setRole(data)
        setLoading(false)
      })
      .catch((err) => {
        if (!active) return

        setError(getErrorMessage(err))
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [owner, repository])

  const openCreateTeam = () => {
    setSelectedParentTeam(null)
    setCreateDialogOpen(true)
  }

  const openCreateSubTeam = (team: Team) => {
    setSelectedParentTeam(team)
    setCreateDialogOpen(true)
  }

  const openAddMember = (team?: Team) => {
    setSelectedTeam(team ?? null)
    setMemberDialogOpen(true)
  }

  const openEditTeam = (team: Team) => {
    setSelectedEditTeam(team)
    setError(null)
    setEditDialogOpen(true)
  }

  const openDeleteTeam = (team: Team) => {
    setSelectedDeleteTeam(team)
    setError(null)
    setDeleteDialogOpen(true)
  }

  const handleEditTeam = async (
    data: CreateTeamInput,
  ) => {
    if (!selectedEditTeam) return

    setActionLoading(true)
    setError(null)

    try {
      if (!owner || !repository) return
      const updatedTeam = await updateTeam(owner, repository, selectedEditTeam.id, data)

      setTeams((current) =>
        current.map((team) =>
          team.id === updatedTeam.id
            ? updatedTeam
            : team,
        ),
      )

      setEditDialogOpen(false)
      setSelectedEditTeam(null)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  const handleCreateTeam = async (
    data: CreateTeamInput,
  ) => {
    if (!owner || !repository) return

    setActionLoading(true)

    try {
      const newTeam = await createTeam(owner, repository, data)

      setTeams((current) => [
        ...current,
        newTeam,
      ])

      setCreateDialogOpen(false)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteTeam = async () => {
    if (!owner || !repository) return
    if (!selectedDeleteTeam) return

    setActionLoading(true)
    setError(null)

    try {
      await deleteTeam(owner, repository, selectedDeleteTeam)

      const deletedId = selectedDeleteTeam.id

      setTeams((current) =>
        current.filter(
          (team) => team.id !== deletedId,
        ),
      )

      setDeleteDialogOpen(false)
      setSelectedDeleteTeam(null)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  const handleAddMember = async (
    data: AddTeamMemberInput,
  ) => {
    if (!selectedTeam) return

    setActionLoading(true)

    try {
      await api(
        `/teams/${selectedTeam.id}/members`,
        {
          method: "POST",
          body: JSON.stringify(data),
        },
      )

      setMemberDialogOpen(false)

      // Refresh teams so member information is updated.
      if (owner && repository) {
        const updatedTeams = await api<Team[]>(
          `/teams/${owner}/${repository}`,
        )

        setTeams(updatedTeams)
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  if (!owner || !repository) {
    return <div>Invalid repository.</div>
  }

  return (
    <RepositoryLayout
      role = {role ?? "Viewer"}
      owner={owner}
      repository={repository}
      activeTab="Teams"
    >
      <div className="space-y-6">

        {role && (
          <TeamHeader
            role={role}
            onCreateTeam={openCreateTeam}
            onAddMember={() => openAddMember()}
          />
        )}

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <TeamViewToggle
          view={view}
          onChange={setView}
        />

        {loading ? (
          <div className="rounded-2xl border p-12 text-center text-sm text-muted-foreground">
            Loading teams...
          </div>
        ) : view === "hierarchy" ? (
          <TeamHierarchy
            role = {role ?? "Viewer"}
            teams={teams}
            onCreateSubTeam={openCreateSubTeam}
            onAddMember={openAddMember}
            onEdit={openEditTeam}
            onDelete={openDeleteTeam}
          />
        ) : (
          <TeamList
            role={role ?? "Viewer"}
            teams={teams}
            onAddMember={openAddMember}
          />
        )}

        <CreateTeamDialog
          open={createDialogOpen}
          parentTeam={selectedParentTeam}
          loading={actionLoading}
          error={error}
          onClose={() => setCreateDialogOpen(false)}
          onSubmit={handleCreateTeam}
        />

        <AddTeamMemberDialog
          open={memberDialogOpen}
          team={selectedTeam}
          collaborators={collaborators}
          loading={actionLoading}
          error={error}
          onClose={() => setMemberDialogOpen(false)}
          onSubmit={handleAddMember}
        />

        <EditTeamDialog
          open={editDialogOpen}
          team={selectedEditTeam}
          loading={actionLoading}
          error={error}
          onClose={() => {
            setEditDialogOpen(false)
            setSelectedEditTeam(null)
          }}
          onSubmit={handleEditTeam}
        />

        <DeleteTeamDialog
          open={deleteDialogOpen}
          team={selectedDeleteTeam}
          hasChildren={
            selectedDeleteTeam
              ? teams.some(
                  (team) =>
                    team.parent_team_id ===
                    selectedDeleteTeam.id,
                )
              : false
          }
          loading={actionLoading}
          onClose={() => {
            setDeleteDialogOpen(false)
            setSelectedDeleteTeam(null)
          }}
          onConfirm={handleDeleteTeam}
        />
      </div>
    </RepositoryLayout>
  )
}