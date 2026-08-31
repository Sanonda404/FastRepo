import type { CreateTeamInput } from "../schemas/team";
import type {
  Team,
  TeamMember
} from "../interfaces";
import { api } from "./api";

import type { AddNewMemberRequest, AddExistingCollaboratorReuqest } from "../interfaces";

export async function createTeam(owner: string, repo_name: string, data: CreateTeamInput): Promise<Team> {
  return api<Team>(`/teams/${owner}/${repo_name}`, { method: "POST", body: data });
}

export async function getAllTeams(owner: string, repo_name: string): Promise<Team[]> {
  return api<Team[]>(`/teams/${owner}/${repo_name}`, { method: "GET"});
}


export async function updateTeam(owner: string, repo_name: string, team_id: number, data: CreateTeamInput): Promise<Team> {
  return api<Team>(`/teams/${owner}/${repo_name}/${team_id}`, { method: "PATCH", body: data });
}

export async function deleteTeam(owner:string, repo_name: string, data: Team): Promise<void> {
  return api<void>(`/teams/${owner}/${repo_name}/${data.id}`, { method: "DELETE"});
}

export async function addNewTeamMember(owner: string, repo_name: string, team_id: number, data: AddNewMemberRequest): Promise<TeamMember> {
  return api<TeamMember>(`/team_members/${owner}/${repo_name}/${team_id}/new`, { method: "POST", body: data });
}

export async function addExistingMember(owner: string, repo_name: string, team_id: number, data: AddExistingCollaboratorReuqest): Promise<TeamMember> {
  return api<TeamMember>(`/team_members/${owner}/${repo_name}/${team_id}`, { method: "POST", body: data });
}

