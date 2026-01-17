'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiJson } from '@/lib/apiClient'
import type { Issue } from '@/lib/types'

type State = {
  issues: Issue[]
  loading: boolean
  error: string | null
  query: string
}

export function useIssues(organizationId: string | null) {
  const [state, setState] = useState<State>({
    issues: [],
    loading: true,
    error: null,
    query: '',
  })

  const canSearch = useMemo(() => state.query.trim().length > 0, [state.query])

  const refresh = useCallback(async () => {
    if (!organizationId) {
      setState((s) => ({ ...s, issues: [], loading: false }))
      return
    }
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const issues = await apiJson<Issue[]>(
        `/api/issues?organizationId=${encodeURIComponent(organizationId)}`,
      )
      setState((s) => ({ ...s, issues, loading: false }))
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: (e as Error).message }))
    }
  }, [organizationId])

  const search = useCallback(async () => {
    if (!organizationId) return refresh()
    const q = state.query.trim()
    if (!q) return refresh()

    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const issues = await apiJson<Issue[]>(
        `/api/issues/search?q=${encodeURIComponent(q)}&organizationId=${encodeURIComponent(organizationId)}`,
      )
      setState((s) => ({ ...s, issues, loading: false }))
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: (e as Error).message }))
    }
  }, [organizationId, refresh, state.query])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return {
    ...state,
    setQuery: (query: string) => setState((s) => ({ ...s, query })),
    canSearch,
    refresh,
    search,
  }
}

