import axios from "axios"
import type { RegisterPayload, UpdateProfilePayload, UserResponse} from "../interfaces";

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
});

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let isHandling401 = false

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const url: string = (error.config?.url as string) ?? ""
      const hadAuth = Boolean((error.config?.headers as Record<string, unknown> | undefined)?.Authorization)
      const isAuthRequest = url.includes("/users/login") || url.includes("/users/register")
      const alreadyOnLogin = window.location.pathname === "/login"
      if (!isAuthRequest && hadAuth && !isHandling401 && !alreadyOnLogin) {
        isHandling401 = true
        clearAuthToken()
        try {
          sessionStorage.setItem("fastrepo_session_expired", "1")
        } catch (e) {
          void e
        }
        window.location.href = "/login"
      }
    }
    return Promise.reject(error)
  }
)

export async function loginApi(formData: FormData) {
  console.log("loginApi called with formData:", formData);

  const response = await apiClient.post<{
    access_token: string;
    token_type: string;
  }>("/users/login", formData);

  return response.data;
}

export async function registerApi(payload: RegisterPayload): Promise<UserResponse> {
  if (payload.profilePicture) {
    const fd = new FormData();
    fd.append("username", payload.username);
    fd.append("email", payload.email);
    fd.append("password", payload.password);
    fd.append("profile_pic", payload.profilePicture);
    const response = await apiClient.post<UserResponse>("/users/register", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  }
  const { profilePicture: _omit, ...json } = payload;
  void _omit;
  const response = await apiClient.post<UserResponse>("/users/register", json);
  return response.data;
}

export async function updateProfileApi(payload: UpdateProfilePayload & { profilePicture?: File | null }): Promise<UserResponse> {
  const hasFile = !!payload.profile_pic || !!(payload as unknown as { profilePicture?: File }).profilePicture;
  const file = payload.profile_pic ?? (payload as unknown as { profilePicture?: File }).profilePicture ?? null;
  if (hasFile && file) {
    const fd = new FormData();
    if (payload.email) fd.append("email", payload.email);
    if (payload.password) fd.append("password", payload.password);
    if (payload.old_password) fd.append("old_password", payload.old_password);
    fd.append("profile_pic", file);
    const response = await apiClient.patch<UserResponse>("/users/me", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  }
  const body: Record<string, string> = {};
  if (payload.email) body.email = payload.email;
  if (payload.password) body.password = payload.password;
  if (payload.old_password) body.old_password = payload.old_password;
  // profile_pic as File not supported in JSON, already handled
  const response = await apiClient.patch<UserResponse>("/users/me", body);
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
