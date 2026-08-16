export async function loginApi(formData: FormData) {
  const response = await fetch("/api/users/login", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Failed to log in");
  }

  return response.json() as Promise<{ access_token: string; token_type: string }>;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

export interface UserResponse {
  id: number;
  username: string;
  email: string;
}

export async function registerApi(payload: RegisterPayload): Promise<UserResponse> {
  const response = await fetch("/api/users/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Registration failed");
  }

  return response.json();
}