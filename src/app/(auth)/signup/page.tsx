'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signUp, type AuthState } from '@/app/auth/actions'

export default function SignUpPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signUp, {})

  return (
    <main className="min-h-dvh flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="t-eyebrow hover:text-[var(--color-tip)]">
          ← Airsoft Log
        </Link>

        <h1 className="t-display text-4xl mt-5 mb-1">Create account</h1>
        <p className="text-[var(--color-bone-dim)] text-sm mb-8">
          Free. You need a working email to confirm it.
        </p>

        {state.error && <p className="notice notice-error mb-5">{state.error}</p>}
        {state.message && <p className="notice notice-ok mb-5">{state.message}</p>}

        <form action={action} className="space-y-5">
          <div>
            <label className="field-label" htmlFor="username">
              Callsign
            </label>
            <input
              id="username"
              name="username"
              className="field-input"
              placeholder="ghost_07"
              required
              minLength={3}
              maxLength={20}
              pattern="[a-zA-Z0-9_]+"
              autoComplete="username"
            />
            <p className="text-xs text-[var(--color-bone-faint)] mt-1.5">
              3–20 characters. Letters, numbers and underscores. Everyone can see this.
            </p>
          </div>

          <div>
            <label className="field-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="field-input"
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="field-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="field-input"
              required
              minLength={10}
              autoComplete="new-password"
            />
            <p className="text-xs text-[var(--color-bone-faint)] mt-1.5">
              At least 10 characters. Use a password you don&apos;t use anywhere else.
            </p>
          </div>

          <div>
            <label className="field-label" htmlFor="birthdate">
              Date of birth
            </label>
            <input
              id="birthdate"
              name="birthdate"
              type="date"
              className="field-input"
              required
            />
            <p className="text-xs text-[var(--color-bone-faint)] mt-1.5">
              You must be 13 or older to use Airsoft Log.
            </p>
          </div>

          <label className="flex gap-3 items-start text-sm text-[var(--color-bone-dim)] cursor-pointer">
            <input
              type="checkbox"
              name="terms"
              required
              className="mt-1 accent-[var(--color-tip)] w-4 h-4 shrink-0"
            />
            <span>
              I&apos;ll keep it civil, I won&apos;t harass anyone, and I understand
              accounts that break the rules get banned.
            </span>
          </label>

          <button type="submit" className="btn btn-primary w-full" disabled={pending}>
            {pending ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-sm text-[var(--color-bone-dim)] mt-7">
          Already have one?{' '}
          <Link href="/login" className="text-[var(--color-tip)] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
