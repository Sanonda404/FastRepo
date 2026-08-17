import type { RegisterPayload, UserResponse, RepositoryResponse } from "./interfaces";

const TOKEN_COOKIE = "fastrepo_token"
const AUTH_CHANGE_EVENT = "fastrepo:auth-change"

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

export function getAuthToken(): string | null {
  return getCookie(TOKEN_COOKIE)
}

export function setAuthToken(token: string): void {
  document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(token)}; path=/; SameSite=Lax`
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT))
}

export function clearAuthToken(): void {
  document.cookie = `${TOKEN_COOKIE}=; path=/; SameSite=Lax; Max-Age=0`
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT))
}

export function subscribeAuthChange(callback: () => void): () => void {
  window.addEventListener(AUTH_CHANGE_EVENT, callback)
  return () => window.removeEventListener(AUTH_CHANGE_EVENT, callback)
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return "Something went wrong"
}

async function errorDetail(response: Response): Promise<string | null> {
  try {
    const data = await response.json()
    return typeof data?.detail === "string" ? data.detail : null
  } catch {
    return null
  }
}

function authHeaders(): Record<string, string> {
  const token = getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function loginApi(formData: FormData) {
  const response = await fetch("/api/users/login", {
    method: "POST",
    body: formData,
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error((await errorDetail(response)) ?? "Failed to log in");
  }

  return response.json() as Promise<{ access_token: string; token_type: string }>;
}

export async function registerApi(payload: RegisterPayload): Promise<UserResponse> {
  const response = await fetch("/api/users/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error((await errorDetail(response)) ?? "Registration failed");
  }

  return response.json();
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...init.headers,
    },
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error((await errorDetail(response)) ?? "Request failed");
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}
