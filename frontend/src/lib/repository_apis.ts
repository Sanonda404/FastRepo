import type { NewRepositoryInput } from "./schemas/repository";
import type {
  BranchResponse,
  CommitSummary,
  FileResponse,
  RepositoryResponse,
  TreeResponse,
} from "./interfaces";
import { api } from "./api";

export async function createRepository(data: NewRepositoryInput): Promise<RepositoryResponse> {
  return api<RepositoryResponse>("/repositories/create", { method: "POST", body: data });
}

export function getRepository(owner: string, name: string): Promise<RepositoryResponse> {
  return api<RepositoryResponse>(`/repositories/${owner}/${name}`);
}

export function listBranches(owner: string, name: string): Promise<BranchResponse[]> {
  return api<BranchResponse[]>(`/repositories/${owner}/${name}/branches`);
}

export function getTree(owner: string, name: string, ref: string, path: string): Promise<TreeResponse> {
  const params = new URLSearchParams({ ref });
  if (path) params.set("path", path);
  return api<TreeResponse>(`/repositories/${owner}/${name}/tree?${params}`);
}

export function getFile(owner: string, name: string, filePath: string, ref: string): Promise<FileResponse> {
  return api<FileResponse>(`/repositories/${owner}/${name}/file`, {
    method: "POST",
    body: { path: filePath, ref },
  });
}

export function listCommits(owner: string, name: string, ref: string, limit = 1): Promise<CommitSummary[]> {
  const params = new URLSearchParams({ ref, limit: String(limit) });
  return api<CommitSummary[]>(`/repositories/${owner}/${name}/commits?${params}`);
}
