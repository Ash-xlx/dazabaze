'use client'

import { usePathname } from 'next/navigation'
import AppShell from '@/components/AppShell'

const AUTH_PATHS = new Set(['/login', '/signup'])

export default function RootChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuthRoute = AUTH_PATHS.has(pathname)

  if (isAuthRoute) return children
  return <AppShell>{children}</AppShell>
}

