'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiJson } from '@/lib/apiClient'
import type { User } from '@/lib/types'

export function useMe() {
  const [me, setMe] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const u = await apiJson<User>('/api/me')
      setMe(u)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const deleteAccount = useCallback(async () => {
    return apiJson<{ ok: boolean }>('/api/me', { method: 'DELETE' })
  }, [])

  return { me, loading, error, refresh, deleteAccount }
}

