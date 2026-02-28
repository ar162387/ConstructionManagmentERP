/**
 * Auth API service - login, me
 */

import { api, setToken, clearToken, TOKEN_KEY } from "./api";

export { TOKEN_KEY };
export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: string;
  assignedProjectId?: string;
  assignedProjectName?: string;
}

export interface LoginResponse {
  token: string;
  user: ApiUser;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  return api<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    token: null,
  });
}

export async function getMe(): Promise<ApiUser> {
  return api<ApiUser>("/api/auth/me");
}

export { setToken, clearToken };
