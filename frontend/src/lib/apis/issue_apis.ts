import type { IssueCreateInput } from "../schemas/issue";
import type {
  Issue,
} from "../interfaces";
import { api } from "./api";

export async function createIssue(owner:string, repo_name: string, data: IssueCreateInput): Promise<Issue> {
  return api<Issue>(`/issues/${owner}/${repo_name}`, { method: "POST", body: data });
}

export async function getIssues(owner:string, repo_name: string): Promise<Issue[]> {
  return api<Issue[]>(`/issues/${owner}/${repo_name}`, { method: "GET"});
}

export async function getIssue(owner: string, repo_name: string, issueId: number): Promise<Issue> {
  const issues = await api<Issue[]>(`/issues/${owner}/${repo_name}`)
  const issue = issues.find((item) => item.id === issueId)
  if (!issue) throw new Error("Issue not found")
  return issue
}