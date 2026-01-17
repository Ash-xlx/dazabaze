'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useMe } from '@/hooks/useMe'
import { useOrganizations } from '@/hooks/useOrganizations'
import { clearAuth } from '@/lib/authStorage'

export default function ProfilePage() {
  const router = useRouter()
  const { isAuthed, logout, user } = useAuth()
  const { me, loading: meLoading, error: meError, deleteAccount } = useMe()
  const { organizations, loading, error, refresh, remove, addMember } = useOrganizations()

  const [inviteEmail, setInviteEmail] = useState<Record<string, string>>({})
  const [busyOrgId, setBusyOrgId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthed) router.push('/login')
  }, [isAuthed, router])

  const effectiveUser = me ?? user

  const ownedOrgIds = useMemo(() => {
    if (!effectiveUser) return new Set<string>()
    return new Set(organizations.filter((o) => o.ownerId === effectiveUser._id).map((o) => o._id))
  }, [effectiveUser, organizations])

  async function onInvite(orgId: string) {
    setBusyOrgId(orgId)
    setActionError(null)
    try {
      await addMember(orgId, inviteEmail[orgId] ?? '')
      setInviteEmail((p) => ({ ...p, [orgId]: '' }))
      await refresh()
    } catch (e) {
      setActionError((e as Error).message)
    } finally {
      setBusyOrgId(null)
    }
  }

  async function onDeleteOrg(orgId: string) {
    if (!confirm('Delete this organization? This also deletes all issues in it.')) return
    setBusyOrgId(orgId)
    setActionError(null)
    try {
      await remove(orgId)
      await refresh()
    } catch (e) {
      setActionError((e as Error).message)
    } finally {
      setBusyOrgId(null)
    }
  }

  async function onDeleteAccount() {
    if (!confirm('Delete your account? This will delete your owned organizations and issues.')) return
    setActionError(null)
    try {
      await deleteAccount()
      clearAuth()
      logout()
      router.push('/login')
      router.refresh()
    } catch (e) {
      setActionError((e as Error).message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-sm font-semibold tracking-tight">Profile</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Account overview and workspace management.
          </div>
        </div>
        <Link
          href="/org/new"
          className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
        >
          New organization
        </Link>
      </div>

      {(meError || error || actionError) ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
          {meError || error || actionError}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="rounded-3xl border border-zinc-200/70 bg-white/70 p-4 shadow-sm backdrop-blur-xl dark:border-zinc-800/60 dark:bg-zinc-950/30">
          <div className="text-sm font-semibold">Account</div>
          {meLoading ? (
            <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Loading…</div>
          ) : effectiveUser ? (
            <div className="mt-3 grid gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Name
                </div>
                <div className="mt-0.5 font-semibold">{effectiveUser.name}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Email
                </div>
                <div className="mt-0.5 font-mono text-xs">{effectiveUser.email}</div>
              </div>
              <div className="pt-2">
                <button
                  className="h-10 w-full rounded-xl border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-900 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/60"
                  onClick={() => void onDeleteAccount()}
                >
                  Delete account
                </button>
              </div>
              <div className="pt-1">
                <button
                  className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                  onClick={() => {
                    logout()
                    router.push('/login')
                  }}
                >
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">No user loaded.</div>
          )}
        </div>

        <div className="rounded-3xl border border-zinc-200/70 bg-white/70 p-4 shadow-sm backdrop-blur-xl dark:border-zinc-800/60 dark:bg-zinc-950/30">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold">Organizations</div>
            <Link href="/" className="text-sm font-semibold hover:underline">
              Back to issues
            </Link>
          </div>

          {loading ? (
            <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Loading…</div>
          ) : organizations.length === 0 ? (
            <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              No organizations yet.
            </div>
          ) : (
            <div className="mt-3 grid gap-3">
              {organizations.map((o) => {
                const isOwner = ownedOrgIds.has(o._id)
                return (
                  <div
                    key={o._id}
                    className="rounded-2xl border border-zinc-200/70 bg-white/70 p-4 shadow-sm dark:border-zinc-800/60 dark:bg-zinc-950/30"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="truncate font-semibold">
                          {o.name}{' '}
                          <span className="ml-2 rounded-lg border border-zinc-200 bg-white px-2 py-1 font-mono text-xs dark:border-zinc-800 dark:bg-zinc-950">
                            {o.key}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                          members: {o.memberIds.length} · owner: {o.ownerId}
                        </div>
                      </div>

                      {isOwner ? (
                        <button
                          className="h-9 shrink-0 rounded-xl border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-900 hover:bg-red-100 disabled:opacity-60 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/60"
                          onClick={() => void onDeleteOrg(o._id)}
                          disabled={busyOrgId === o._id}
                        >
                          Delete
                        </button>
                      ) : (
                        <div className="shrink-0 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
                          Member
                        </div>
                      )}
                    </div>

                    {isOwner ? (
                      <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center">
                        <input
                          className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none dark:border-zinc-800 dark:bg-zinc-950"
                          placeholder="Invite user by email (must already have an account)"
                          value={inviteEmail[o._id] ?? ''}
                          onChange={(e) =>
                            setInviteEmail((p) => ({ ...p, [o._id]: e.target.value }))
                          }
                        />
                        <button
                          className="h-10 rounded-xl bg-zinc-900 px-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white"
                          onClick={() => void onInvite(o._id)}
                          disabled={busyOrgId === o._id}
                        >
                          Add member
                        </button>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

