import type { NewRepositoryInput } from "./schemas/repository";
import type { RepositoryResponse } from "./interfaces";
import { api } from "./api";

export async function createRepository(data: NewRepositoryInput): Promise<RepositoryResponse> {
  return api<RepositoryResponse>("/repositories/create", {
    method: "POST",
    body: JSON.stringify(data),
  });
}