'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useOrganizations } from '@/hooks/useOrganizations'
import { getSelectedOrgId, setSelectedOrgId } from '@/lib/authStorage'
import type { Organization } from '@/lib/types'

type OrgContextValue = {
  orgId: string | null
  activeOrg: Organization | null
  organizations: Organization[]
  orgLoading: boolean
  orgError: string | null
  setOrgId: (id: string) => void
}

const OrgContext = createContext<OrgContextValue | null>(null)

export function useOrg() {
  const ctx = useContext(OrgContext)
  if (!ctx) throw new Error('useOrg must be used within <AppShell />')
  return ctx
}

function routeLabel(pathname: string) {
  if (pathname === '/') return 'Issues'
  if (pathname === '/profile') return 'Profile'
  if (pathname === '/org/new') return 'New organization'
  if (pathname === '/issues/new') return 'New issue'
  if (pathname.startsWith('/issues/')) return 'Issue'
  return 'IssueApp'
}

function initials(email?: string | null) {
  const v = (email ?? '').trim()
  if (!v) return '?'
  return v.slice(0, 1).toUpperCase()
}

export default function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthed, user, logout } = useAuth()
  const { organizations, loading: orgLoading, error: orgError } = useOrganizations()

  const [selectedOrgIdState, setSelectedOrgIdState] = useState<string | null>(() =>
    getSelectedOrgId(),
  )
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    if (!isAuthed) router.push('/login')
  }, [isAuthed, router])

  const orgId = useMemo(() => {
    if (
      selectedOrgIdState &&
      organizations.some((o) => o._id === selectedOrgIdState)
    ) {
      return selectedOrgIdState
    }
    if (organizations.length > 0) return organizations[0]._id
    return null
  }, [organizations, selectedOrgIdState])

  const activeOrg = useMemo(
    () => organizations.find((o) => o._id === orgId) ?? null,
    [organizations, orgId],
  )

  useEffect(() => {
    if (!orgId) return
    if (getSelectedOrgId() === orgId) return
    setSelectedOrgId(orgId)
  }, [orgId])

  const newIssueHref = useMemo(() => {
    if (!orgId) return '/issues/new'
    return `/issues/new?orgId=${encodeURIComponent(orgId)}`
  }, [orgId])

  const orgCtxValue = useMemo<OrgContextValue>(
    () => ({
      orgId,
      activeOrg,
      organizations,
      orgLoading,
      orgError,
      setOrgId: (id: string) => {
        setSelectedOrgIdState(id)
        setSelectedOrgId(id)
      },
    }),
    [activeOrg, orgError, orgId, orgLoading, organizations],
  )

  return (
    <OrgContext.Provider value={orgCtxValue}>
      <div className="h-dvh bg-zinc-50 text-zinc-950 dark:bg-[#0b0c10] dark:text-zinc-50">
        {mobileNavOpen ? (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              className="absolute inset-0 bg-black/40"
              aria-label="Close menu"
              onClick={() => setMobileNavOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 w-[86%] max-w-[320px] border-r border-zinc-200/70 bg-white/90 p-4 backdrop-blur-xl dark:border-zinc-800/60 dark:bg-zinc-950/60">
              <div className="flex items-center justify-between">
                <Link
                  href="/"
                  className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold tracking-tight hover:bg-zinc-100/70 dark:hover:bg-zinc-900/40"
                  onClick={() => setMobileNavOpen(false)}
                >
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-50 dark:text-zinc-950">
                    I
                  </span>
                  <span>IssueApp</span>
                </Link>
                <button
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                  onClick={() => setMobileNavOpen(false)}
                >
                  Close
                </button>
              </div>

              <div className="mt-4 rounded-2xl border border-zinc-200/70 bg-white/70 p-3 shadow-sm dark:border-zinc-800/60 dark:bg-zinc-950/30">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Workspace
                </div>
                {orgLoading ? (
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">Loading…</div>
                ) : organizations.length === 0 ? (
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">
                    No organizations yet.{' '}
                    <Link
                      href="/org/new"
                      className="font-semibold text-zinc-900 dark:text-zinc-50"
                      onClick={() => setMobileNavOpen(false)}
                    >
                      Create one
                    </Link>
                    .
                  </div>
                ) : (
                  <select
                    className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none dark:border-zinc-800 dark:bg-zinc-950"
                    value={orgId ?? ''}
                    onChange={(e) => orgCtxValue.setOrgId(e.target.value)}
                  >
                    {organizations.map((o) => (
                      <option key={o._id} value={o._id}>
                        {o.key} — {o.name}
                      </option>
                    ))}
                  </select>
                )}
                {orgError ? (
                  <div className="mt-2 text-xs text-red-700 dark:text-red-300">{orgError}</div>
                ) : null}
              </div>

              <nav className="mt-4 space-y-1">
                <Link
                  href="/"
                  onClick={() => setMobileNavOpen(false)}
                  aria-current={pathname === '/' ? 'page' : undefined}
                  className={[
                    'flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold',
                    pathname === '/'
                      ? 'bg-zinc-100/80 text-zinc-950 dark:bg-zinc-900/40 dark:text-zinc-50'
                      : 'text-zinc-700 hover:bg-zinc-100/70 dark:text-zinc-300 dark:hover:bg-zinc-900/40',
                  ].join(' ')}
                >
                  <span>Issues</span>
                </Link>
                <Link
                  href="/profile"
                  onClick={() => setMobileNavOpen(false)}
                  aria-current={pathname === '/profile' ? 'page' : undefined}
                  className={[
                    'flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold',
                    pathname === '/profile'
                      ? 'bg-zinc-100/80 text-zinc-950 dark:bg-zinc-900/40 dark:text-zinc-50'
                      : 'text-zinc-700 hover:bg-zinc-100/70 dark:text-zinc-300 dark:hover:bg-zinc-900/40',
                  ].join(' ')}
                >
                  <span>Profile</span>
                </Link>
              </nav>

              <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-zinc-200/70 bg-white/70 p-3 shadow-sm dark:border-zinc-800/60 dark:bg-zinc-950/30">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-zinc-200 text-sm font-semibold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">
                    {initials(user?.email)}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{user?.email ?? '—'}</div>
                    <div className="truncate text-xs text-zinc-600 dark:text-zinc-400">
                      {activeOrg ? `${activeOrg.key} · ${activeOrg.name}` : 'No workspace'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 grid gap-2">
                <Link
                  href={newIssueHref}
                  onClick={() => setMobileNavOpen(false)}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-zinc-900 px-3 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white"
                >
                  New issue
                </Link>
                <button
                  className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                  onClick={() => {
                    logout()
                    setMobileNavOpen(false)
                    router.push('/login')
                  }}
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex h-full">
          <aside className="hidden w-[260px] shrink-0 border-r border-zinc-200/70 bg-white/70 backdrop-blur-xl dark:border-zinc-800/60 dark:bg-zinc-950/30 md:flex md:flex-col">
            <div className="px-4 pb-3 pt-4">
              <Link
                href="/"
                className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold tracking-tight hover:bg-zinc-100/70 dark:hover:bg-zinc-900/40"
              >
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-50 dark:text-zinc-950">
                  I
                </span>
                <span>IssueApp</span>
              </Link>
            </div>

            <div className="px-4">
              <div className="rounded-2xl border border-zinc-200/70 bg-white/70 p-3 shadow-sm dark:border-zinc-800/60 dark:bg-zinc-950/30">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Workspace
                </div>
                {orgLoading ? (
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">Loading…</div>
                ) : organizations.length === 0 ? (
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">
                    No organizations yet.{' '}
                    <Link href="/org/new" className="font-semibold text-zinc-900 dark:text-zinc-50">
                      Create one
                    </Link>
                    .
                  </div>
                ) : (
                  <select
                    className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none dark:border-zinc-800 dark:bg-zinc-950"
                    value={orgId ?? ''}
                    onChange={(e) => orgCtxValue.setOrgId(e.target.value)}
                  >
                    {organizations.map((o) => (
                      <option key={o._id} value={o._id}>
                        {o.key} — {o.name}
                      </option>
                    ))}
                  </select>
                )}
                {orgError ? (
                  <div className="mt-2 text-xs text-red-700 dark:text-red-300">{orgError}</div>
                ) : null}
              </div>
            </div>

            <nav className="mt-4 px-3">
              <Link
                href="/"
                aria-current={pathname === '/' ? 'page' : undefined}
                className={[
                  'flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold',
                  pathname === '/'
                    ? 'bg-zinc-100/80 text-zinc-950 dark:bg-zinc-900/40 dark:text-zinc-50'
                    : 'text-zinc-700 hover:bg-zinc-100/70 dark:text-zinc-300 dark:hover:bg-zinc-900/40',
                ].join(' ')}
              >
                <span>Issues</span>
              </Link>
              <Link
                href="/profile"
                aria-current={pathname === '/profile' ? 'page' : undefined}
                className={[
                  'mt-1 flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold',
                  pathname === '/profile'
                    ? 'bg-zinc-100/80 text-zinc-950 dark:bg-zinc-900/40 dark:text-zinc-50'
                    : 'text-zinc-700 hover:bg-zinc-100/70 dark:text-zinc-300 dark:hover:bg-zinc-900/40',
                ].join(' ')}
              >
                <span>Profile</span>
              </Link>
            </nav>

            <div className="mt-auto px-4 pb-4 pt-3">
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200/70 bg-white/70 p-3 shadow-sm dark:border-zinc-800/60 dark:bg-zinc-950/30">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-zinc-200 text-sm font-semibold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">
                    {initials(user?.email)}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{user?.email ?? '—'}</div>
                    <div className="truncate text-xs text-zinc-600 dark:text-zinc-400">
                      {activeOrg ? `${activeOrg.key} · ${activeOrg.name}` : 'No workspace'}
                    </div>
                  </div>
                </div>
                <button
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                  onClick={() => {
                    logout()
                    router.push('/login')
                  }}
                >
                  Logout
                </button>
              </div>
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-zinc-200/70 bg-white/70 px-4 backdrop-blur-xl dark:border-zinc-800/60 dark:bg-zinc-950/30">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  className="grid h-9 w-9 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900 md:hidden"
                  aria-label="Open menu"
                  onClick={() => setMobileNavOpen(true)}
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>

                <div className="min-w-0">
                <div className="truncate text-sm font-semibold tracking-tight">
                  {routeLabel(pathname)}
                </div>
                <div className="truncate text-xs text-zinc-600 dark:text-zinc-400">
                  {activeOrg ? `${activeOrg.key} · ${activeOrg.name}` : 'Select a workspace'}
                </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={newIssueHref}
                  className="inline-flex h-9 items-center justify-center rounded-xl bg-zinc-900 px-3 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white"
                >
                  New issue
                </Link>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6">{children}</div>
            </div>
          </div>
        </div>
      </div>
    </OrgContext.Provider>
  )
}

