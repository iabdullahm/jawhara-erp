'use client';

import type { UserRole } from './types';

const TOKEN_KEY = 'jawhara_token';
const USER_KEY = 'jawhara_user';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  nameAr?: string | null;
  role: UserRole;
  avatarUrl?: string | null;
  tenant?: {
    id: string;
    slug: string;
    name: string;
    nameAr?: string | null;
    currency: string;
    logoUrl?: string | null;
  } | null;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function getUser(): AuthenticatedUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as AuthenticatedUser) : null;
}

export function setUser(user: AuthenticatedUser) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
