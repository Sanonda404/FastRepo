import { api } from "./api"

export interface PermissionResponse {
  id: number
  repository_id: number
  team_id: number
  team_name: string
  target_type: "branch" | "folder"
  target_identifier: string
  allow_write: boolean
}

export interface PermissionAddRequest {
  target_type: "branch" | "folder"
  target_identifier: string
  allow_write: boolean
}

export function getPermissions(owner: string, repo: string): Promise<PermissionResponse[]> {
  return api<PermissionResponse[]>(`/permissions/${owner}/${repo}`)
}

export function createPermission(
  owner: string,
  repo: string,
  teamId: number,
  data: PermissionAddRequest
): Promise<PermissionResponse> {
  return api<PermissionResponse>(`/permissions/${owner}/${repo}/${teamId}`, { method: "POST", body: data })
}

export function deletePermission(owner: string, repo: string, permissionId: number): Promise<void> {
  return api<void>(`/permissions/${owner}/${repo}/${permissionId}`, { method: "DELETE" })
}
