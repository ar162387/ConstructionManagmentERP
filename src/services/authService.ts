import { api } from './api';
import type { User } from '@/types';

export interface LoginResponse {
  token: string;
  token_type: string;
  user: UserFromApi;
}

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

function toUser(u: UserFromApi): User {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role as User['role'],
    avatar: u.avatar,
    createdAt: new Date(u.createdAt),
    assignedProjects: u.assignedProjects,
    canEdit: u.canEdit,
    canDelete: u.canDelete,
  };
}

export async function login(email: string, password: string): Promise<{ user: User; token: string } | null> {
  const { data } = await api.post<LoginResponse>('/login', { email, password });
  return {
    user: toUser(data.user),
    token: data.token,
  };
}

export async function logout(): Promise<void> {
  await api.post('/logout');
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data } = await api.get<{ user: UserFromApi }>('/user');
    return toUser(data.user);
  } catch {
    return null;
  }
}
