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

export interface CollaboratorResponse {
  id: number;
  repository_id: number;
  user_id: number;
  username: string;
  email: string;
  role: string;
}
