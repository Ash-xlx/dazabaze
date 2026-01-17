'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useOrganizations } from '@/hooks/useOrganizations'
import { setSelectedOrgId } from '@/lib/authStorage'
import type { OrganizationCreateInput } from '@/lib/validation'

export default function NewOrgPage() {
  const router = useRouter()
  const { isAuthed } = useAuth()
  const { create } = useOrganizations()

  const [form, setForm] = useState<OrganizationCreateInput>({ name: '', key: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthed) router.push('/login')
  }, [isAuthed, router])

  async function onSubmit() {
    setLoading(true)
    setError(null)
    try {
      const org = await create(form)
      setSelectedOrgId(org._id)
      router.push('/')
      router.refresh()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto w-full max-w-md px-4 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">New organization</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Create your workspace (like Linear teams).
        </p>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <div className="mt-6 grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <input
            className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none dark:border-zinc-800 dark:bg-zinc-950"
            placeholder="Organization name (e.g. Acme)"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
          <input
            className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none dark:border-zinc-800 dark:bg-zinc-950"
            placeholder="Key (e.g. ACME)"
            value={form.key}
            onChange={(e) => setForm((p) => ({ ...p, key: e.target.value.toUpperCase() }))}
          />

          <button
            className="h-11 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white"
            onClick={() => void onSubmit()}
            disabled={loading}
          >
            Create organization
          </button>
        </div>
      </div>
    </div>
  )
}

