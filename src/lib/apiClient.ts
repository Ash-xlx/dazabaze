'use client'

import { apiBase } from '@/lib/apiBase'
import { getToken } from '@/lib/authStorage'

/**
 * Small fetch wrapper for the React client.
 *
 * - Prepends `NEXT_PUBLIC_API_BASE`
 * - Attaches `Authorization: Bearer <token>` when logged in
 * - Normalizes error responses to `Error(message)`
 *
 * This is used by all client-side hooks (useAuth/useIssues/etc).
 */
export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> | undefined),
  }
  if (token) headers.Authorization = `Bearer ${token}`
  if (init?.body) headers['Content-Type'] = headers['Content-Type'] ?? 'application/json'

  const res = await fetch(`${apiBase()}${path}`, { ...init, headers })

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null
    throw new Error(body?.message ?? `Request failed (${res.status})`)
  }
  return (await res.json()) as T
}

