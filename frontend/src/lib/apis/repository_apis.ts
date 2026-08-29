import type { NewRepositoryInput } from "../schemas/repository";
import type {
  BranchResponse,
  CollaboratorResponse,
  CommitSummary,
  FileResponse,
  RepositoryResponse,
  TreeResponse,
} from "../interfaces";
import { api } from "./api";
import type { RepositoryRole } from "../auth/permissions";

export async function createRepository(data: NewRepositoryInput): Promise<RepositoryResponse> {
  return api<RepositoryResponse>("/repositories/create", { method: "POST", body: data });
}

export function getRepository(owner: string, name: string): Promise<RepositoryResponse> {
  return api<RepositoryResponse>(`/repositories/${owner}/${name}`);
}

export function getRole(owner: string, name: string): Promise<RepositoryRole> {
  return api<RepositoryRole>(`/repositories/${owner}/${name}/role`);
}

export function listBranches(owner: string, name: string): Promise<BranchResponse[]> {
  return api<BranchResponse[]>(`/repositories/${owner}/${name}/branches`);
}

export function getTree(owner: string, name: string, ref: string, path: string): Promise<TreeResponse> {
  const params = new URLSearchParams({ ref });
  if (path) params.set("path", path);
  return api<TreeResponse>(`/repositories/${owner}/${name}/tree?${params}`);
}

export async function listAllFilePaths(
  owner: string,
  name: string,
  ref: string,
  path = "",
  acc: string[] = [],
): Promise<string[]> {
  const data = await getTree(owner, name, ref, path);
  await Promise.all(
    data.entries.map(async (entry) => {
      const full = path ? `${path}/${entry.name}` : entry.name;
      if (entry.type === "tree") {
        await listAllFilePaths(owner, name, ref, full, acc);
      } else {
        acc.push(full);
      }
    }),
  );
  return acc;
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

export function listCollaborators(owner: string, name: string): Promise<CollaboratorResponse[]> {
  return api<CollaboratorResponse[]>(`/collaborators/${owner}/${name}`);
}
