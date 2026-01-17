'use client'

import { useCallback, useMemo, useState } from 'react'
import { apiJson } from '@/lib/apiClient'
import { clearAuth, getToken, getUser, setAuth } from '@/lib/authStorage'
import type { AuthResponse, User } from '@/lib/types'
import type { LoginInput, SignupInput } from '@/lib/validation'

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => getUser())
  const [token, setToken] = useState<string | null>(() => getToken())

  const isAuthed = useMemo(() => Boolean(token), [token])

  const login = useCallback(async (body: LoginInput) => {
    const res = await apiJson<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    setAuth(res.token, res.user)
    setUser(res.user)
    setToken(res.token)
    return res
  }, [])

  const signup = useCallback(async (body: SignupInput) => {
    const res = await apiJson<AuthResponse>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    setAuth(res.token, res.user)
    setUser(res.user)
    setToken(res.token)
    return res
  }, [])

  const logout = useCallback(() => {
    clearAuth()
    setUser(null)
    setToken(null)
  }, [])

  return { user, token, isAuthed, login, signup, logout }
}

