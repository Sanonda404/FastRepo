import type { RepositoryRole } from "./auth/permissions";

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

export interface UserResponse {
  id: number;
  username: string;
  email: string;
}

export interface RepositoryResponse {
  id: number;
  name: string;
  description?: string;
  is_private: boolean;
  default_branch: string;
  owner_id: number;
  parent_repository_id?: number;
  created_at: string;
  role:RepositoryRole;
}

export interface RepositoryDetails {
  id: number;
  name: string;
  description?: string;
  is_private: boolean;
  default_branch: string;
  owner_id: number;
  owner_username : string;
  parent_repository_id?: number;
  created_at: string;
  role:RepositoryRole;
}

export interface BranchResponse {
  name: string;
  sha: string;
  is_default: boolean;
}

export interface CommitSummary {
  sha: string;
  author: string;
  author_email: string | null;
  author_date: string;
  message: string;
}

export interface TreeEntry {
  name: string;
  type: "blob" | "tree";
  mode: number;
  sha: string;
  size?: number;
}

export interface TreeResponse {
  commit: string;
  tree: string;
  path: string;
  entries: TreeEntry[];
}

export interface FileResponse {
  name: string;
  path: string;
  sha: string;
  size: number;
  binary: boolean;
  content: string;
}

export type CollaboratorRole =
  | "Admin"
  | "Maintainer"
  | "Member"
  | "Viewer"

export interface AddCollaboratorRequest {
  identifier : string
  role: CollaboratorRole
}


export interface CollaboratorResponse {
  id: number;
  repository_id: number;
  user_id: number;
  username: string;
  email: string;
  role: RepositoryRole;
}


export type IssueStatus = "open" | "closed"

export interface IssueLabel {
  id: number
  name: string
  color?: string | null
}

export interface Issue {
  id: number

  title: string
  body : string

  state: IssueStatus

  author_username: string

  labels: IssueLabel[]
  assignees: string[]

  comments_count: number
  pull_requests_count: number

  created_at: string
  closed_at : string
}

export interface IssuesWitRole {
  issues : Issue[],
  role : RepositoryRole
}

export interface TeamMember {
  id: number
  collaborator_id : number
  username: string
}

export interface Team {
  id: number
  repository_id: number
  name: string
  parent_team_id: number | null
  members: TeamMember[]
}

export interface TeamsWithRole {
  teams : Team[]
  role : RepositoryRole
}

export interface AddNewMemberRequest{
  member_identifier : string
}

export interface AddExistingCollaboratorReuqest {
  collaborator_id : number
}