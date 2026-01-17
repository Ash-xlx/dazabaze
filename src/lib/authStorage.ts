import type { User } from '@/lib/types'

/**
 * LocalStorage helpers.
 *
 * We keep auth client-side (JWT in localStorage) because this is a semester project
 * and we want a simple "login -> call API" flow without cookies/session storage.
 */
const TOKEN_KEY = 'dazabaze.token'
const USER_KEY = 'dazabaze.user'
const ORG_KEY = 'dazabaze.orgId'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setAuth(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function getUser(): User | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getSelectedOrgId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(ORG_KEY)
}

export function setSelectedOrgId(orgId: string) {
  localStorage.setItem(ORG_KEY, orgId)
}

