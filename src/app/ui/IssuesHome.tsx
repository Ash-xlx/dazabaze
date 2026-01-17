'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useIssues } from '@/hooks/useIssues'
import { useOrg } from '@/components/AppShell'

type StatusFilter = 'all' | 'todo' | 'in_progress' | 'in_review' | 'done'

function statusMeta(status: string) {
  switch (status) {
    case 'todo':
      return { label: 'Todo', dot: 'bg-zinc-400' }
    case 'in_progress':
      return { label: 'In progress', dot: 'bg-indigo-400' }
    case 'in_review':
    // legacy alias
    case 'backlog':
      return { label: 'In review', dot: 'bg-violet-400' }
    case 'done':
      return { label: 'Done', dot: 'bg-emerald-400' }
    default:
      return { label: status, dot: 'bg-zinc-400' }
  }
}

export default function IssuesHome() {
  const { orgId, activeOrg, organizations, orgLoading, orgError } = useOrg()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const issuesState = useIssues(orgId)

  const visibleIssues = useMemo(() => {
    // Home list shows only root issues (no parentIssueId)
    const list = issuesState.issues.filter((i) => !i.parentIssueId)
    if (statusFilter === 'all') return list
    return list.filter((i) => {
      if (statusFilter === 'in_review') return i.status === 'in_review' || i.status === 'backlog'
      return i.status === statusFilter
    })
  }, [issuesState.issues, statusFilter])

  const tabs: Array<{ key: StatusFilter; label: string }> = useMemo(
    () => [
      { key: 'all', label: 'All' },
      { key: 'todo', label: 'Todo' },
      { key: 'in_progress', label: 'In progress' },
      { key: 'in_review', label: 'In review' },
      { key: 'done', label: 'Done' },
    ],
    [],
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-semibold tracking-tight">
            {activeOrg ? (
              <>
                <span className="font-mono text-zinc-600 dark:text-zinc-400">{activeOrg.key}</span>{' '}
                <span className="text-zinc-950 dark:text-zinc-50">{activeOrg.name}</span>
              </>
            ) : (
              <span className="text-zinc-600 dark:text-zinc-400">Select a workspace</span>
            )}
          </div>
          <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            {visibleIssues.length} issues
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              className={[
                'h-9 rounded-xl px-3 text-sm font-semibold',
                statusFilter === t.key
                  ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-950'
                  : 'border border-zinc-200 bg-white/70 text-zinc-800 hover:bg-white dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-200 dark:hover:bg-zinc-950',
              ].join(' ')}
              onClick={() => setStatusFilter(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {orgError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
          {orgError}
        </div>
      ) : null}

      {!orgLoading && organizations.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200/70 bg-white/70 p-4 shadow-sm backdrop-blur-xl dark:border-zinc-800/60 dark:bg-zinc-950/30">
          <div className="text-sm font-semibold">Create your first workspace</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            You’ll need an organization before you can create issues.
          </div>
          <div className="mt-4">
            <Link
              href="/org/new"
              className="inline-flex h-9 items-center justify-center rounded-xl bg-zinc-900 px-3 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white"
            >
              New organization
            </Link>
          </div>
        </div>
      ) : null}

      <div className="rounded-3xl border border-zinc-200/70 bg-white/70 shadow-sm backdrop-blur-xl dark:border-zinc-800/60 dark:bg-zinc-950/30">
        <div className="flex flex-col gap-3 border-b border-zinc-200/70 px-4 py-4 dark:border-zinc-800/60 md:flex-row md:items-center">
          <input
            className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none placeholder:text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
            placeholder="Search issues…"
            value={issuesState.query}
            onChange={(e) => issuesState.setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void issuesState.search()
            }}
            disabled={!orgId}
          />
          <div className="flex gap-2">
            <button
              className="h-10 rounded-xl bg-zinc-900 px-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white"
              onClick={() =>
                void (issuesState.canSearch ? issuesState.search() : issuesState.refresh())
              }
              disabled={!orgId || issuesState.loading}
            >
              {issuesState.canSearch ? 'Search' : 'Refresh'}
            </button>
            <button
              className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
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
          <div className="mx-4 mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
            {issuesState.error}
          </div>
        ) : null}

        {issuesState.loading ? (
          <div className="px-4 py-6 text-sm text-zinc-600 dark:text-zinc-400">Loading…</div>
        ) : visibleIssues.length === 0 ? (
          <div className="px-4 py-6 text-sm text-zinc-600 dark:text-zinc-400">No issues.</div>
        ) : (
          <ul className="divide-y divide-zinc-200/70 dark:divide-zinc-800/60">
            {visibleIssues.map((i) => {
              const meta = statusMeta(i.status)
              return (
                <li key={i._id}>
                  <Link
                    href={`/issues/${i._id}`}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-zinc-50/80 dark:hover:bg-zinc-900/30"
                  >
                    <span className="mt-1.5 inline-flex h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-zinc-200/20 dark:ring-zinc-900/40">
                      <span className={['h-2.5 w-2.5 rounded-full', meta.dot].join(' ')} />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-sm font-semibold tracking-tight">
                          {i.title}
                        </div>
                      </div>
                      <div className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                        {i.description}
                      </div>
                    </div>

                    <div className="shrink-0 pt-0.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                      {meta.label}
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

