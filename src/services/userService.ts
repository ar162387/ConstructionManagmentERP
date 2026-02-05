import { api } from './api';
import type { User, UserRole } from '@/types';

export interface UserFromApi {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  createdAt: string;
  canEdit?: boolean;
  canDelete?: boolean;
  assignedProjects?: string[];
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  canEdit?: boolean;
  canDelete?: boolean;
  assignedProjects?: string[];
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  canEdit?: boolean;
  canDelete?: boolean;
  assignedProjects?: string[];
}

function toUser(u: UserFromApi): User {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role as UserRole,
    avatar: u.avatar,
    createdAt: new Date(u.createdAt),
    assignedProjects: u.assignedProjects,
    canEdit: u.canEdit,
    canDelete: u.canDelete,
  };
}

export async function getUsers(): Promise<User[]> {
  const { data } = await api.get<{ data: UserFromApi[] }>('/users');
  return data.data.map(toUser);
}

export async function createUser(payload: CreateUserPayload): Promise<User> {
  const { data } = await api.post<{ data: UserFromApi }>('/users', {
    name: payload.name,
    email: payload.email,
    password: payload.password,
    role: payload.role,
    canEdit: payload.canEdit,
    canDelete: payload.canDelete,
    assignedProjects: payload.assignedProjects,
  });
  return toUser(data.data);
}

export async function updateUser(
  userId: string,
  payload: UpdateUserPayload
): Promise<User> {
  const body: Record<string, unknown> = {
    name: payload.name,
    email: payload.email,
    role: payload.role,
    canEdit: payload.canEdit,
    canDelete: payload.canDelete,
    assignedProjects: payload.assignedProjects,
  };
  // Only include password when explicitly provided (non-empty string)
  const pwd = typeof payload.password === 'string' ? payload.password.trim() : '';
  if (pwd.length >= 8) {
    body.password = pwd;
  }
  const { data } = await api.put<{ data: UserFromApi }>(`/users/${userId}`, body);
  return toUser(data.data);
}

export async function deleteUser(userId: string): Promise<void> {
  await api.delete(`/users/${userId}`);
}
