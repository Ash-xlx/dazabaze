'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiJson } from '@/lib/apiClient'
import type { User } from '@/lib/types'

export function useOrgMembers(organizationId: string | null) {
  const [members, setMembers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!organizationId) {
      setMembers([])
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const users = await apiJson<User[]>(`/api/organizations/${organizationId}/members`)
      // Stable sorting for dropdown UX
      users.sort((a, b) => a.email.localeCompare(b.email))
      setMembers(users)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { members, loading, error, refresh }
}

