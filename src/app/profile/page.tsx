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
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-4 py-10">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Profile</h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Account overview and organization management.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
            >
              Back to Issues
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

        {(meError || error || actionError) ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
            {meError || error || actionError}
          </div>
        ) : null}

        <div className="grid gap-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-sm font-semibold">Account</div>
            {meLoading ? (
              <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Loading…</div>
            ) : effectiveUser ? (
              <div className="mt-2 grid gap-1 text-sm text-zinc-700 dark:text-zinc-300">
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400">Name:</span> {effectiveUser.name}
                </div>
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400">Email:</span> {effectiveUser.email}
                </div>
                <div className="mt-3">
                  <button
                    className="h-11 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-900 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/60"
                    onClick={() => void onDeleteAccount()}
                  >
                    Delete account
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">No user loaded.</div>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">Organizations</div>
              <Link href="/org/new" className="text-sm font-semibold hover:underline">
                New organization
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
                      className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-semibold">
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
                            className="h-10 rounded-xl border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-900 hover:bg-red-100 disabled:opacity-60 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/60"
                            onClick={() => void onDeleteOrg(o._id)}
                            disabled={busyOrgId === o._id}
                          >
                            Delete org
                          </button>
                        ) : (
                          <div className="text-xs text-zinc-600 dark:text-zinc-400">Member</div>
                        )}
                      </div>

                      {isOwner ? (
                        <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center">
                          <input
                            className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none dark:border-zinc-800 dark:bg-zinc-950"
                            placeholder="Invite user by email (must already have an account)"
                            value={inviteEmail[o._id] ?? ''}
                            onChange={(e) =>
                              setInviteEmail((p) => ({ ...p, [o._id]: e.target.value }))
                            }
                          />
                          <button
                            className="h-11 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white"
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
    </div>
  )
}

