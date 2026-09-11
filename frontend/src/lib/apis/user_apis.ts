import { api } from "./api";
import type { ForgotPasswordRequest, ResetPasswordRequest } from "../interfaces";

export async function forgotPassword(data: ForgotPasswordRequest): Promise<void> {
  return api<void>("/users/forgot-password", { method: "POST", body: data });
}

export async function resetPassword(data: ResetPasswordRequest): Promise<void> {
  return api<void>("/users/reset-password", { method: "POST", body: data });
}
