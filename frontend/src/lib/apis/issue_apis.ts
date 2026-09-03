import type { IssueCreateInput, IssueCommentInput, IssueAssigneeInput, LabelInput } from "../schemas/issue";
import type {
  Issue,
  IssueAssigneeResponse,
  IssueLabel,
  IssueCommentResponse,
  AssignedIssueResponse,
} from "../interfaces";
import { api } from "./api";

export async function createIssue(owner:string, repo_name: string, data: IssueCreateInput): Promise<Issue> {
  return api<Issue>(`/issues/${owner}/${repo_name}`, { method: "POST", body: data });
}

export async function getIssues(owner:string, repo_name: string): Promise<Issue[]> {
  return api<Issue[]>(`/issues/${owner}/${repo_name}`, { method: "GET"});
}

export async function getIssueByNumber(owner:string, repo_name: string, issue_number : number): Promise<Issue> {
  return api<Issue>(`/issues/${owner}/${repo_name}/${issue_number}`, { method: "GET"});
}

export async function closeOrReopenIssue(owner:string, repo_name: string, issue_number : number): Promise<Issue> {
  return api<Issue>(`/issues/${owner}/${repo_name}/${issue_number}`, { method: "PATCH"});
}

export async function deleteIssue(owner:string, repo_name: string, issue_number : number): Promise<Issue> {
  return api<Issue>(`/issues/${owner}/${repo_name}/${issue_number}`, { method: "DELETE"});
}


export async function createIssueComment(owner:string, repo_name: string, issue_id : number, data: IssueCommentInput): Promise<IssueCommentResponse> {
  return api<IssueCommentResponse>(`/comments/${owner}/${repo_name}/${issue_id}`, { method: "POST", body: data });
}

export async function getAllIssueComments(owner:string, repo_name: string, issue_id : number): Promise<IssueCommentResponse[]> {
  return api<IssueCommentResponse[]>(`/comments/${owner}/${repo_name}/${issue_id}`, { method: "GET"});
}

export async function deleteIssueComment(owner:string, repo_name: string, issue_cmnt_id : number): Promise<IssueCommentResponse> {
  return api<IssueCommentResponse>(`/comments/${owner}/${repo_name}/${issue_cmnt_id}`, { method: "DELETE" });
}

export async function addIssueAssignee(owner:string, repo_name: string, issue_id : number, data: IssueAssigneeInput): Promise<IssueAssigneeResponse> {
  return api<IssueAssigneeResponse>(`/issues/${owner}/${repo_name}/${issue_id}/assignees`, { method: "POST", body: data });
}

export async function attachIssueLabel(owner:string, repo_name: string, issue_id : number, data: LabelInput): Promise<IssueLabel> {
  return api<IssueLabel>(`/issues/${owner}/${repo_name}/${issue_id}/labels`, { method: "POST", body: data });
}

export async function removeIssueAssignee(owner:string, repo_name: string, issue_id : number, username: string): Promise<IssueAssigneeResponse> {
  return api<IssueAssigneeResponse>(`/issues/${owner}/${repo_name}/${issue_id}/assignees/${username}`, { method: "DELETE"});
}

export async function removeIssueLabel(owner:string, repo_name: string, issue_id : number, label_id: number): Promise<IssueLabel> {
  return api<IssueLabel>(`/issues/${owner}/${repo_name}/${issue_id}/labels/${label_id}`, { method: "DELETE"});
}

export async function getAllIssueAssignees(owner:string, repo_name: string, issue_id : number): Promise<IssueAssigneeResponse[]> {
  return api<IssueAssigneeResponse[]>(`/issues/${owner}/${repo_name}/${issue_id}/assignees`, { method: "GET"});
}



export async function getAllIssueLabels(owner:string, repo_name: string, issue_id : number): Promise<IssueLabel[]> {
  return api<IssueLabel[]>(`/issues/${owner}/${repo_name}/${issue_id}/labels`, { method: "GET"});
}

export async function getAssignedIssues(username: string): Promise<AssignedIssueResponse[]> {
  return api<AssignedIssueResponse[]>(`/issues/assigned/${username}`, { method: "GET"});
}