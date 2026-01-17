'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiJson } from '@/lib/apiClient'
import type { Organization } from '@/lib/types'
import type { OrganizationCreateInput } from '@/lib/validation'

export function useOrganizations() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const orgs = await apiJson<Organization[]>('/api/organizations')
      setOrganizations(orgs)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const create = useCallback(async (body: OrganizationCreateInput) => {
    const created = await apiJson<Organization>('/api/organizations', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    return created
  }, [])

  const remove = useCallback(async (id: string) => {
    return apiJson<{ ok: boolean }>(`/api/organizations/${id}`, { method: 'DELETE' })
  }, [])

  const addMember = useCallback(async (id: string, email: string) => {
    return apiJson<Organization>(`/api/organizations/${id}/members`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  }, [])

  return { organizations, loading, error, refresh, create, remove, addMember }
}

