/**
 * Users API service - CRUD for user management
 */

import { api } from "./api";

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: string;
  assignedProjectId?: string;
  assignedProjectName?: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: string;
  assignedProjectId?: string;
  assignedProjectName?: string;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
  assignedProjectId?: string;
  assignedProjectName?: string;
}

export async function listUsers(): Promise<ApiUser[]> {
  return api<ApiUser[]>("/api/users");
}

export async function createUser(input: CreateUserInput): Promise<ApiUser> {
  return api<ApiUser>("/api/users", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<ApiUser> {
  return api<ApiUser>(`/api/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteUser(id: string): Promise<void> {
  return api<void>(`/api/users/${id}`, {
    method: "DELETE",
  });
}
