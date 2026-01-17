'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiJson } from '@/lib/apiClient'
import type { Issue, Organization } from '@/lib/types'

export function useIssue(issueId: string | null) {
  const [issue, setIssue] = useState<Issue | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [subIssues, setSubIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!issueId) {
      setIssue(null)
      setOrganization(null)
      setSubIssues([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const i = await apiJson<Issue>(`/api/issues/${issueId}`)
      setIssue(i)

      const org = await apiJson<Organization>(`/api/organizations/${i.organizationId}`)
      setOrganization(org)

      const subs = await apiJson<Issue[]>(
        `/api/issues?organizationId=${encodeURIComponent(i.organizationId)}&parentIssueId=${encodeURIComponent(i._id)}`,
      )
      setSubIssues(subs)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [issueId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { issue, organization, subIssues, loading, error, refresh }
}

