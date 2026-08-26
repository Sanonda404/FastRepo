import type { CreateTeamInput } from "./schemas/team";
import type {
  Team
} from "./interfaces";
import { api } from "./api";

export async function createTeam(owner: string, repo_name: string, data: CreateTeamInput): Promise<Team> {
  return api<Team>(`/teams/${owner}/${repo_name}`, { method: "POST", body: data });
}

export async function updateTeam(owner: string, repo_name: string, team_id: number, data: CreateTeamInput): Promise<Team> {
  return api<Team>(`/teams/${owner}/${repo_name}/${team_id}`, { method: "PATCH", body: data });
}

export async function deleteTeam(owner:string, repo_name: string, data: Team): Promise<void> {
  return api<void>(`/teams/${owner}/${repo_name}/${data.id}`, { method: "DELETE"});
}

