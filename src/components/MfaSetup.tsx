'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Factor = { id: string; friendly_name?: string; status: string }

export default function MfaSetup() {
  const supabase = createClient()
  const [factors, setFactors] = useState<Factor[]>([])
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState<{ id: string; qr: string; secret: string } | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function refresh() {
    const { data } = await supabase.auth.mfa.listFactors()
    setFactors((data?.totp ?? []).filter((f) => f.status === 'verified'))
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function startEnroll() {
    setError('')
    setMessage('')
    setBusy(true)

    // Abandoned enrolments leave unverified factors behind, and the
    // next enroll then fails on a duplicate name. Clear them first.
    const { data: existing } = await supabase.auth.mfa.listFactors()
    for (const f of existing?.totp ?? []) {
      if (f.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: f.id })
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: `authenticator-${Date.now()}`,
    })
    setBusy(false)

    if (error) return setError(error.message)
    setEnrolling({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret })
  }

  async function confirmEnroll() {
    if (!enrolling) return
    setError('')
    setBusy(true)

    const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({
      factorId: enrolling.id,
    })
    if (cErr || !challenge) {
      setBusy(false)
      return setError(cErr?.message ?? 'Could not start verification.')
    }

    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId: enrolling.id,
      challengeId: challenge.id,
      code: code.trim(),
    })
    setBusy(false)

    if (vErr) return setError('That code was wrong or expired. Try the current one.')

    setEnrolling(null)
    setCode('')
    setMessage('Two-factor authentication is on.')
    refresh()
  }

  async function turnOff(factorId: string) {
    setError('')
    setBusy(true)
    const { error } = await supabase.auth.mfa.unenroll({ factorId })
    setBusy(false)
    if (error) return setError(error.message)
    setMessage('Two-factor authentication is off.')
    refresh()
  }

  if (loading) {
    return <p className="t-data text-xs text-[var(--color-bone-faint)]">Checking…</p>
  }

  return (
    <div className="border border-[var(--color-field-800)] p-5">
      <p className="t-eyebrow mb-2">Security</p>
      <h2 className="t-display text-lg mb-2">Two-factor authentication</h2>
      <p className="text-sm text-[var(--color-bone-dim)] mb-5 leading-relaxed">
        Adds a six-digit code from your phone on top of your password. Someone
        who steals your password still can&apos;t get in.
      </p>

      {error && <p className="notice notice-error mb-4">{error}</p>}
      {message && <p className="notice notice-ok mb-4">{message}</p>}

      {factors.length > 0 ? (
        <div className="flex items-center gap-4 flex-wrap">
          <span className="t-data text-xs uppercase tracking-widest text-[var(--color-confirmed)]">
            ● Enabled
          </span>
          <button
            onClick={() => turnOff(factors[0].id)}
            disabled={busy}
            className="t-data text-[0.6875rem] uppercase tracking-widest text-[var(--color-bone-faint)] hover:text-[var(--color-hit)] disabled:opacity-40"
          >
            Turn off
          </button>
        </div>
      ) : enrolling ? (
        <div className="space-y-5">
          <div>
            <p className="text-sm mb-3">
              1. Scan this in Google Authenticator, Authy, 1Password or Apple Passwords.
            </p>
            {/* Supabase returns the QR as an SVG data URL */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={enrolling.qr}
              alt="Two-factor QR code"
              width={176}
              height={176}
              className="bg-white p-2"
            />
          </div>

          <details className="text-sm">
            <summary className="cursor-pointer text-[var(--color-bone-dim)] hover:text-[var(--color-bone)]">
              Can&apos;t scan it?
            </summary>
            <p className="t-data text-xs mt-2 break-all text-[var(--color-bone-dim)]">
              {enrolling.secret}
            </p>
          </details>

          <div>
            <label className="field-label" htmlFor="mfa-code">
              2. Enter the current six-digit code
            </label>
            <input
              id="mfa-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              className="field-input max-w-40 tracking-[0.3em]"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={confirmEnroll}
              disabled={busy || code.length !== 6}
              className="btn btn-primary"
            >
              {busy ? 'Checking…' : 'Turn on'}
            </button>
            <button onClick={() => setEnrolling(null)} className="btn btn-ghost">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={startEnroll} disabled={busy} className="btn btn-ghost">
          {busy ? 'Starting…' : 'Set up two-factor'}
        </button>
      )}
    </div>
  )
}
