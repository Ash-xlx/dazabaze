'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useIssue } from '@/hooks/useIssue'
import { useIssueMutations } from '@/hooks/useIssueMutations'
import { useOrganizations } from '@/hooks/useOrganizations'
import type { IssueInput } from '@/lib/validation'

type Props =
  | { mode: 'new'; id?: never }
  | { mode: 'existing'; id: string }

const emptyIssue: IssueInput = {
  organizationId: '',
  title: '',
  description: '',
  status: 'todo',
  parentIssueId: null,
}

export default function IssueEditor(props: Props) {
  const router = useRouter()
  const search = useSearchParams()
  const { isAuthed } = useAuth()
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
      organizationId: orgId || p.organizationId,
      parentIssueId: parentIssueId ?? p.parentIssueId ?? null,
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.mode])

  useEffect(() => {
    if (props.mode !== 'existing') return
    if (!issue) return
    setForm({
      organizationId: issue.organizationId,
      title: issue.title,
      description: issue.description,
      status: issue.status,
      parentIssueId: issue.parentIssueId ?? null,
    })
  }, [issue, props.mode])

  const activeOrg = useMemo(() => {
    return organizations.find((o) => o._id === form.organizationId) ?? organization ?? null
  }, [organizations, form.organizationId, organization])

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
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {props.mode === 'new'
                ? 'Create a new issue in the selected organization.'
                : 'Edit or delete the selected issue.'}
            </p>
          </div>
          <button
            className="h-11 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
            onClick={() => router.push('/')}
          >
            Back
          </button>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          {showError ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
              {showError}
            </div>
          ) : null}

          {props.mode === 'existing' && loading ? (
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Loading…</div>
          ) : (
            <div className="grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-semibold">Organization</span>
                <select
                  className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none dark:border-zinc-800 dark:bg-zinc-950"
                  value={form.organizationId}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, organizationId: e.target.value }))
                  }
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

              {activeOrg ? (
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="font-semibold">Linked collection (Organization)</div>
                  <div className="mt-2 grid gap-1 text-zinc-700 dark:text-zinc-300">
                    <div>
                      <span className="text-zinc-500 dark:text-zinc-400">Name:</span>{' '}
                      {activeOrg.name}
                    </div>
                    <div>
                      <span className="text-zinc-500 dark:text-zinc-400">Key:</span>{' '}
                      {activeOrg.key}
                    </div>
                  </div>
                </div>
              ) : null}

              <label className="grid gap-2">
                <span className="text-sm font-semibold">Title</span>
                <input
                  className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none dark:border-zinc-800 dark:bg-zinc-950"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold">Status</span>
                <select
                  className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none dark:border-zinc-800 dark:bg-zinc-950"
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                >
                  <option value="todo">todo</option>
                  <option value="in_progress">in_progress</option>
                  <option value="backlog">backlog</option>
                  <option value="done">done</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold">Description</span>
                <textarea
                  className="min-h-[120px] w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none dark:border-zinc-800 dark:bg-zinc-950"
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                />
              </label>

              {props.mode === 'existing' ? (
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">Sub-issues</div>
                    {issue ? (
                      <Link
                        href={`/issues/new?orgId=${encodeURIComponent(issue.organizationId)}&parentIssueId=${encodeURIComponent(issue._id)}`}
                        className="text-sm font-semibold text-zinc-900 hover:underline dark:text-zinc-50"
                      >
                        New sub-issue
                      </Link>
                    ) : null}
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
                          className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
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

              <div className="flex flex-wrap gap-2 pt-2">
                {props.mode === 'new' ? (
                  <button
                    className="h-11 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white"
                    onClick={() => void onCreate()}
                    disabled={saving}
                  >
                    New
                  </button>
                ) : (
                  <>
                    <button
                      className="h-11 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white"
                      onClick={() => void onUpdate()}
                      disabled={saving}
                    >
                      Edit
                    </button>
                    <button
                      className="h-11 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-900 hover:bg-red-100 disabled:opacity-60 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/60"
                      onClick={() => void onDelete()}
                      disabled={saving}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

