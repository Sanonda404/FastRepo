import type { AddCollaboratorRequest, CollaboratorResponse, CollaboratorRole } from "../interfaces";
import { api } from "./api";

export async function addCollaborator(owner:string, repo_name: string, data: AddCollaboratorRequest): Promise<CollaboratorResponse> {
  return api<CollaboratorResponse>(`/collaborators/${owner}/${repo_name}`, { method: "POST", body: data });
}

export async function getCollaborators(owner:string, repo_name: string): Promise<CollaboratorResponse[]> {
  return api<CollaboratorResponse[]>(`/collaborators/${owner}/${repo_name}`, { method: "GET"});
}

export async function updateCollaboratorRole(owner:string, repo_name: string, collaborator_id :number, role  : CollaboratorRole): Promise<CollaboratorResponse> {
  return api<CollaboratorResponse>(`/collaborators/${owner}/${repo_name}/${collaborator_id}`, { method: "PATCH", body: { role }});
}

export async function deleteCollaborator(owner:string, repo_name: string, collaborator_id : number): Promise<CollaboratorResponse> {
  return api<CollaboratorResponse>(`/collaborators/${owner}/${repo_name}/${collaborator_id}`, { method: "DELETE" });
}