'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useIssue } from '@/hooks/useIssue'
import { useIssueMutations } from '@/hooks/useIssueMutations'
import { useOrganizations } from '@/hooks/useOrganizations'
import { useOrgMembers } from '@/hooks/useOrgMembers'
import { useOrg } from '@/components/AppShell'
import type { IssueInput } from '@/lib/validation'

type Props =
  | { mode: 'new'; id?: never }
  | { mode: 'existing'; id: string }

const emptyIssue: IssueInput = {
  organizationId: '',
  title: '',
  description: '',
  status: 'todo',
  assigneeId: null,
  parentIssueId: null,
}

export default function IssueEditor(props: Props) {
  const router = useRouter()
  const search = useSearchParams()
  const { isAuthed } = useAuth()
  const { orgId: selectedOrgId } = useOrg()
  const mutations = useIssueMutations()
  const { organizations } = useOrganizations()
  const { issue, organization, subIssues, loading, error } = useIssue(
    props.mode === 'existing' ? props.id : null,
  )

  const [form, setForm] = useState<IssueInput>(emptyIssue)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthed) router.push('/login')
  }, [isAuthed, router])

  // For new issue, prefill orgId/parentIssueId from query params
  useEffect(() => {
    if (props.mode !== 'new') return
    const orgId = search.get('orgId') ?? ''
    const parentIssueId = search.get('parentIssueId')
    setForm((p) => ({
      ...p,
      organizationId: orgId || p.organizationId || selectedOrgId || '',
      parentIssueId: parentIssueId ?? p.parentIssueId ?? null,
    }))
  }, [props.mode, search, selectedOrgId])

  useEffect(() => {
    if (props.mode !== 'existing') return
    if (!issue) return
    setForm({
      organizationId: issue.organizationId,
      title: issue.title,
      description: issue.description,
      status: (issue.status === 'backlog' ? 'in_review' : issue.status) as IssueInput['status'],
      assigneeId: issue.assigneeId ?? null,
      parentIssueId: issue.parentIssueId ?? null,
    })
  }, [issue, props.mode])

  const activeOrg = useMemo(() => {
    return organizations.find((o) => o._id === form.organizationId) ?? organization ?? null
  }, [organizations, form.organizationId, organization])

  const membersState = useOrgMembers(form.organizationId || null)

  async function goHome() {
    router.push('/')
    router.refresh()
  }

  async function onCreate() {
    setSaving(true)
    setActionError(null)
    try {
      await mutations.create(form)
      await goHome()
    } catch (e) {
      setActionError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function onUpdate() {
    if (props.mode !== 'existing') return
    setSaving(true)
    setActionError(null)
    try {
      await mutations.update(props.id, form)
      await goHome()
    } catch (e) {
      setActionError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function onDelete() {
    if (props.mode !== 'existing') return
    if (!confirm('Delete this issue?')) return
    setSaving(true)
    setActionError(null)
    try {
      await mutations.remove(props.id)
      await goHome()
    } catch (e) {
      setActionError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const title = props.mode === 'new' ? 'New Issue' : 'Issue Details'
  const showError = error ?? actionError

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-sm font-semibold tracking-tight">{title}</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {props.mode === 'new'
              ? 'Create a new issue in a workspace.'
              : 'Update fields and manage sub-issues.'}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
            onClick={() => router.push('/')}
          >
            Back to issues
          </button>
          {props.mode === 'new' ? (
            <button
              className="h-10 rounded-xl bg-zinc-900 px-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white"
              onClick={() => void onCreate()}
              disabled={saving}
            >
              Create issue
            </button>
          ) : (
            <>
              <button
                className="h-10 rounded-xl bg-zinc-900 px-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white"
                onClick={() => void onUpdate()}
                disabled={saving}
              >
                Save changes
              </button>
              <button
                className="h-10 rounded-xl border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-900 hover:bg-red-100 disabled:opacity-60 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/60"
                onClick={() => void onDelete()}
                disabled={saving}
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {showError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
          {showError}
        </div>
      ) : null}

      {props.mode === 'existing' && loading ? (
        <div className="text-sm text-zinc-600 dark:text-zinc-400">Loading…</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="rounded-3xl border border-zinc-200/70 bg-white/70 p-4 shadow-sm backdrop-blur-xl dark:border-zinc-800/60 dark:bg-zinc-950/30">
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Title
              </span>
              <input
                className="h-11 w-full rounded-2xl border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none placeholder:text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
                placeholder="Issue title"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              />
            </label>

            <label className="mt-4 grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Description
              </span>
              <textarea
                className="min-h-[180px] w-full resize-y rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
                placeholder="Write a short description…"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </label>

            {props.mode === 'existing' && issue && !issue.parentIssueId ? (
              <div className="mt-5 rounded-2xl border border-zinc-200/70 bg-white/70 p-4 shadow-sm dark:border-zinc-800/60 dark:bg-zinc-950/30">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold">Sub-issues</div>
                  <Link
                    href={`/issues/new?orgId=${encodeURIComponent(issue.organizationId)}&parentIssueId=${encodeURIComponent(issue._id)}`}
                    className="text-sm font-semibold text-zinc-900 hover:underline dark:text-zinc-50"
                  >
                    New sub-issue
                  </Link>
                </div>
                {subIssues.length === 0 ? (
                  <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    No sub-issues.
                  </div>
                ) : (
                  <div className="mt-3 grid gap-2">
                    {subIssues.map((s) => (
                      <Link
                        key={s._id}
                        href={`/issues/${s._id}`}
                        className="rounded-2xl border border-zinc-200/70 bg-white/70 p-3 text-sm hover:bg-white dark:border-zinc-800/60 dark:bg-zinc-950/30 dark:hover:bg-zinc-950"
                      >
                        <div className="font-semibold">{s.title}</div>
                        <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                          {s.status}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-zinc-200/70 bg-white/70 p-4 shadow-sm backdrop-blur-xl dark:border-zinc-800/60 dark:bg-zinc-950/30">
              <div className="text-sm font-semibold">Fields</div>

              <label className="mt-4 grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Organization
                </span>
                <select
                  className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none dark:border-zinc-800 dark:bg-zinc-950"
                  value={form.organizationId}
                  onChange={(e) => setForm((p) => ({ ...p, organizationId: e.target.value }))}
                >
                  <option value="" disabled>
                    Select an organization…
                  </option>
                  {organizations.map((o) => (
                    <option key={o._id} value={o._id}>
                      {o.key} — {o.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="mt-4 grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Status
                </span>
                <select
                  className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none dark:border-zinc-800 dark:bg-zinc-950"
                  value={form.status}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, status: e.target.value as IssueInput['status'] }))
                  }
                >
                  <option value="todo">Todo</option>
                  <option value="in_progress">In progress</option>
                  <option value="in_review">In review</option>
                  <option value="done">Done</option>
                </select>
              </label>

              <label className="mt-4 grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Assignee
                </span>
                <select
                  className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none dark:border-zinc-800 dark:bg-zinc-950"
                  value={form.assigneeId ?? ''}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, assigneeId: e.target.value || null }))
                  }
                  disabled={!form.organizationId || membersState.loading}
                >
                  <option value="">Unassigned</option>
                  {membersState.members.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.name} — {m.email}
                    </option>
                  ))}
                </select>
                {membersState.error ? (
                  <div className="text-xs text-red-700 dark:text-red-300">
                    {membersState.error}
                  </div>
                ) : null}
              </label>

              {form.parentIssueId ? (
                <div className="mt-4 rounded-2xl border border-zinc-200/70 bg-white/70 p-3 text-sm shadow-sm dark:border-zinc-800/60 dark:bg-zinc-950/30">
                  <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Parent issue
                  </div>
                  <div className="mt-1 truncate font-mono text-xs text-zinc-700 dark:text-zinc-200">
                    {form.parentIssueId}
                  </div>
                </div>
              ) : null}
            </div>

            {activeOrg ? (
              <div className="rounded-3xl border border-zinc-200/70 bg-white/70 p-4 shadow-sm backdrop-blur-xl dark:border-zinc-800/60 dark:bg-zinc-950/30">
                <div className="text-sm font-semibold">Workspace</div>
                <div className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                  {activeOrg.name}{' '}
                  <span className="ml-2 rounded-lg border border-zinc-200 bg-white px-2 py-1 font-mono text-xs dark:border-zinc-800 dark:bg-zinc-950">
                    {activeOrg.key}
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}

