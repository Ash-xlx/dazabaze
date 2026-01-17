'use client'

import { apiJson } from '@/lib/apiClient'
import type { Issue } from '@/lib/types'
import type { IssueInput } from '@/lib/validation'

export function useIssueMutations() {
  return {
    create: (body: IssueInput) =>
      apiJson<Issue>('/api/issues', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: IssueInput) =>
      apiJson<Issue>(`/api/issues/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    remove: (id: string) => apiJson<{ ok: boolean }>(`/api/issues/${id}`, { method: 'DELETE' }),
  }
}

