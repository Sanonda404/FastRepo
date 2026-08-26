import type { IssueCreateInput } from "./schemas/issue";
import type {
  Issue
} from "./interfaces";
import { api } from "./api";

export async function createIssue(owner:string, repo_name: string, data: IssueCreateInput): Promise<Issue> {
  return api<Issue>(`/issues/${owner}/${repo_name}`, { method: "POST", body: data });
}