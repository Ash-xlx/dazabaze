'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useOrganizations } from '@/hooks/useOrganizations'
import { useIssues } from '@/hooks/useIssues'
import { getSelectedOrgId, setSelectedOrgId } from '@/lib/authStorage'

export default function IssuesHome() {
  const router = useRouter()
  const { isAuthed, user, logout } = useAuth()
  const { organizations, loading: orgLoading, error: orgError } = useOrganizations()

  const [selectedOrgId, setSelectedOrgIdState] = useState<string | null>(() =>
    getSelectedOrgId(),
  )

  useEffect(() => {
    if (!isAuthed) router.push('/login')
  }, [isAuthed, router])

  const orgId = useMemo(() => {
    if (selectedOrgId && organizations.some((o) => o._id === selectedOrgId)) {
      return selectedOrgId
    }
    if (organizations.length > 0) return organizations[0]._id
    return null
  }, [organizations, selectedOrgId])

  const activeOrg = useMemo(
    () => organizations.find((o) => o._id === orgId) ?? null,
    [organizations, orgId],
  )

  const issuesState = useIssues(orgId)

  const newIssueHref = useMemo(() => {
    if (!orgId) return '/issues/new'
    return `/issues/new?orgId=${encodeURIComponent(orgId)}`
  }, [orgId])

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-4 py-10">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Issues</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
              {user ? (
                <>
                  Logged in as <span className="font-semibold">{user.email}</span>.
                </>
              ) : null}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/profile"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
            >
              Profile
            </Link>
            <Link
              href={newIssueHref}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white"
            >
              New
            </Link>
            <button
              className="h-11 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
              onClick={() => {
                logout()
                router.push('/login')
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {orgError ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
            {orgError}
          </div>
        ) : null}

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-2">
              <div className="text-sm font-semibold">Organization</div>
              {orgLoading ? (
                <div className="text-sm text-zinc-600 dark:text-zinc-400">Loading…</div>
              ) : organizations.length === 0 ? (
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  No organizations yet.{' '}
                  <Link href="/org/new" className="font-semibold">
                    Create one
                  </Link>
                  .
                </div>
              ) : (
                <select
                  className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none dark:border-zinc-800 dark:bg-zinc-950"
                  value={orgId ?? ''}
                  onChange={(e) => {
                    setSelectedOrgIdState(e.target.value)
                    setSelectedOrgId(e.target.value)
                  }}
                >
                  {organizations.map((o) => (
                    <option key={o._id} value={o._id}>
                      {o.key} — {o.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {activeOrg ? (
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="font-semibold">Active org</div>
                <div className="mt-1 text-zinc-700 dark:text-zinc-300">
                  {activeOrg.name} (<span className="font-mono">{activeOrg.key}</span>)
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <input
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none placeholder:text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
              placeholder="Search issues by title/description…"
              value={issuesState.query}
              onChange={(e) => issuesState.setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void issuesState.search()
              }}
              disabled={!orgId}
            />
            <div className="flex gap-2">
              <button
                className="h-11 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white"
                onClick={() => void (issuesState.canSearch ? issuesState.search() : issuesState.refresh())}
                disabled={!orgId || issuesState.loading}
              >
                {issuesState.canSearch ? 'Search' : 'Refresh'}
              </button>
              <button
                className="h-11 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                onClick={() => {
                  issuesState.setQuery('')
                  void issuesState.refresh()
                }}
                disabled={!orgId || issuesState.loading}
              >
                Clear
              </button>
            </div>
          </div>

          {issuesState.error ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
              {issuesState.error}
            </div>
          ) : null}

          {issuesState.loading ? (
            <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">Loading…</div>
          ) : issuesState.issues.length === 0 ? (
            <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">No issues.</div>
          ) : (
            <div className="mt-4 grid gap-3">
              {issuesState.issues.map((i) => (
                <Link
                  key={i._id}
                  href={`/issues/${i._id}`}
                  className="rounded-2xl border border-zinc-200 bg-white p-4 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-base font-semibold tracking-tight">{i.title}</div>
                      <div className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                        {i.description}
                      </div>
                    </div>
                    <div className="shrink-0 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                      {i.status}
                    </div>
                  </div>
                  {i.parentIssueId ? (
                    <div className="mt-2 font-mono text-xs text-zinc-500">
                      sub-issue of: {i.parentIssueId}
                    </div>
                  ) : null}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

