/**
 * Base URL of the Rust API server.
 *
 * In dev, set `.env.local`:
 * - NEXT_PUBLIC_API_BASE=http://localhost:3001
 *
 * The client always calls `${apiBase()}/api/...`.
 */
export function apiBase(): string {
  return process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001'
}

