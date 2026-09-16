import type { PullCreateInput, PullReviewInput } from "../schemas/pull";
import type {
  FileChange,
  MergePullResult,
  PullMergeable,
  PullRequest,
  PullReview,
} from "../interfaces";
import { api } from "./api";

export async function createPull(owner: string, repo_name: string, data: PullCreateInput): Promise<PullRequest> {
  return api<PullRequest>(`/pulls/${owner}/${repo_name}`, { method: "POST", body: data });
}

export async function listPulls(owner: string, repo_name: string): Promise<PullRequest[]> {
  return api<PullRequest[]>(`/pulls/${owner}/${repo_name}`, { method: "GET" });
}

export async function getPull(owner: string, repo_name: string, pull_id: number): Promise<PullRequest> {
  return api<PullRequest>(`/pulls/${owner}/${repo_name}/${pull_id}`, { method: "GET" });
}

export async function closeOrReopenPull(owner: string, repo_name: string, pull_id: number, state: "open" | "closed"): Promise<PullRequest> {
  return api<PullRequest>(`/pulls/${owner}/${repo_name}/${pull_id}`, { method: "PATCH", body: { state } });
}

export async function getPullFiles(owner: string, repo_name: string, pull_id: number): Promise<FileChange[]> {
  return api<FileChange[]>(`/pulls/${owner}/${repo_name}/${pull_id}/files`, { method: "GET" });
}

export async function getPullMergeable(owner: string, repo_name: string, pull_id: number): Promise<PullMergeable> {
  return api<PullMergeable>(`/pulls/${owner}/${repo_name}/${pull_id}/mergeable`, { method: "GET" });
}

export async function mergePull(owner: string, repo_name: string, pull_id: number): Promise<MergePullResult> {
  return api<MergePullResult>(`/pulls/${owner}/${repo_name}/${pull_id}/merge`, { method: "POST" });
}

export async function createPullReview(owner: string, repo_name: string, pull_id: number, data: PullReviewInput): Promise<PullReview> {
  return api<PullReview>(`/pulls/${owner}/${repo_name}/${pull_id}/reviews`, {
    method: "POST",
    body: { ...data, decision: "comment" },
  });
}

export async function listPullReviews(owner: string, repo_name: string, pull_id: number): Promise<PullReview[]> {
  return api<PullReview[]>(`/pulls/${owner}/${repo_name}/${pull_id}/reviews`, { method: "GET" });
}

export async function deletePullReview(owner: string, repo_name: string, pull_id: number, review_id: number): Promise<void> {
  return api<void>(`/pulls/${owner}/${repo_name}/${pull_id}/reviews/${review_id}`, { method: "DELETE" });
}
