import Link from 'next/link'

export default function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-[#0b0c10] dark:text-zinc-50">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(900px_circle_at_20%_10%,rgba(99,102,241,0.16),transparent_60%),radial-gradient(900px_circle_at_80%_10%,rgba(16,185,129,0.10),transparent_55%)]" />

      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-16">
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center gap-2 rounded-xl px-2 py-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-50 dark:text-zinc-950">
              I
            </span>
            <span className="text-sm font-semibold tracking-tight">IssueApp</span>
          </Link>
        </div>

        <div className="rounded-3xl border border-zinc-200/70 bg-white/70 p-6 shadow-sm backdrop-blur-xl dark:border-zinc-800/60 dark:bg-zinc-950/30">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle ? (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{subtitle}</p>
          ) : null}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  )
}

