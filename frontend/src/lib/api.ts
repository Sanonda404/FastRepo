import axios from "axios"
import type { RegisterPayload, UserResponse} from "./interfaces";

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

export const apiClient = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
})

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export async function loginApi(formData: FormData) {
  const response = await apiClient.post<{ access_token: string; token_type: string }>("/users/login", formData);
  return response.data;
}

export async function registerApi(payload: RegisterPayload): Promise<UserResponse> {
  const response = await apiClient.post<UserResponse>("/users/register", payload);
  return response.data;
}

export async function api<T>(path: string, init: { method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"; body?: unknown } = {}): Promise<T> {
  const response = await apiClient.request<T>({ url: path, method: init.method ?? "GET", data: init.body });
  return response.data;
}

export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const detail: unknown = err.response?.data?.detail
    if (typeof detail === "string") return detail
    return err.message
  }
  if (err instanceof Error) return err.message
  return "Something went wrong"
}
