'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signIn, type AuthState } from '@/app/auth/actions'

export default function LoginPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signIn, {})

  return (
    <main className="min-h-dvh flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="t-eyebrow hover:text-[var(--color-tip)]">
          ← Airsoft Log
        </Link>

        <h1 className="t-display text-4xl mt-5 mb-1">Sign in</h1>
        <p className="text-[var(--color-bone-dim)] text-sm mb-8">
          Pick up where your last game left off.
        </p>

        {state.error && <p className="notice notice-error mb-5">{state.error}</p>}

        <form action={action} className="space-y-5">
          <div>
            <label className="field-label" htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              className="field-input"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="field-label" htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              className="field-input"
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn btn-primary w-full" disabled={pending}>
            {pending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-sm text-[var(--color-bone-dim)] mt-7">
          No account yet?{' '}
          <Link href="/signup" className="text-[var(--color-tip)] hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </main>
  )
}
