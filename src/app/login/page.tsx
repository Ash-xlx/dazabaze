'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import AuthShell from '@/components/AuthShell'
import { useAuth } from '@/hooks/useAuth'
import type { LoginInput } from '@/lib/validation'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [form, setForm] = useState<LoginInput>({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit() {
    setLoading(true)
    setError(null)
    try {
      await login(form)
      router.push('/')
      router.refresh()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Log in"
      subtitle={
        <>
          Use a seeded account like <span className="font-mono">alice@example.com</span> /{' '}
          <span className="font-mono">Password123!</span>
        </>
      }
    >
      {error ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3">
        <input
          className="h-11 w-full rounded-2xl border border-zinc-200 bg-white px-3 text-sm outline-none dark:border-zinc-800 dark:bg-zinc-950"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
        />
        <input
          className="h-11 w-full rounded-2xl border border-zinc-200 bg-white px-3 text-sm outline-none dark:border-zinc-800 dark:bg-zinc-950"
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void onSubmit()
          }}
        />

        <button
          className="h-11 rounded-2xl bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white"
          onClick={() => void onSubmit()}
          disabled={loading}
        >
          Log in
        </button>
      </div>

      <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
        No account?{' '}
        <Link href="/signup" className="font-semibold text-zinc-950 dark:text-zinc-50">
          Sign up
        </Link>
      </p>
    </AuthShell>
  )
}

