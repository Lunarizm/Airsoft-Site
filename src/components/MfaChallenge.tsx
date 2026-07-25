'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function MfaChallenge() {
  const supabase = createClient()
  const router = useRouter()
  const [factorId, setFactorId] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => {
      const verified = (data?.totp ?? []).find((f) => f.status === 'verified')
      if (verified) setFactorId(verified.id)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function submit() {
    setError('')
    setBusy(true)

    const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId })
    if (cErr || !challenge) {
      setBusy(false)
      return setError(cErr?.message ?? 'Could not start verification.')
    }

    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: code.trim(),
    })

    if (vErr) {
      setBusy(false)
      setCode('')
      return setError('Wrong or expired code. Codes change every 30 seconds.')
    }

    // Session is now AAL2. refresh() makes the server re-read it.
    router.push('/dashboard')
    router.refresh()
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <main className="min-h-dvh flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <p className="t-eyebrow mb-4">Step two</p>
        <h1 className="t-display text-3xl mb-2">Enter your code</h1>
        <p className="text-sm text-[var(--color-bone-dim)] mb-7">
          Open your authenticator app and type the six digits for Airsoft Log.
        </p>

        {error && <p className="notice notice-error mb-5">{error}</p>}

        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && code.length === 6) submit()
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          placeholder="000000"
          className="field-input text-2xl tracking-[0.4em] text-center"
        />

        <button
          onClick={submit}
          disabled={busy || code.length !== 6 || !factorId}
          className="btn btn-primary w-full mt-5"
        >
          {busy ? 'Checking…' : 'Verify'}
        </button>

        <button
          onClick={signOut}
          className="t-data text-xs text-[var(--color-bone-faint)] hover:text-[var(--color-bone)] mt-6 block mx-auto"
        >
          Sign out instead
        </button>
      </div>
    </main>
  )
}
