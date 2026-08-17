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

export interface RepositoryData {
  id: number
  name: string
  owner: string
  description: string
  is_private: boolean
  language: string
  stars: number
  forks: number
  open_issues: number
  default_branch: string
  updated_at: string
}
