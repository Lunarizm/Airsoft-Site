'use client'

import { useActionState, useState } from 'react'
import { deleteAccount, type DeleteState } from '@/app/(app)/profile/actions'

export default function DeleteAccount({ username }: { username: string }) {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState<DeleteState, FormData>(deleteAccount, {})

  return (
    <div className="border border-[var(--color-hit)]/35 p-5">
      <p className="t-eyebrow mb-2" style={{ color: 'var(--color-hit)' }}>
        Danger zone
      </p>
      <h2 className="t-display text-lg mb-2">Delete account</h2>
      <p className="text-sm text-[var(--color-bone-dim)] mb-5 leading-relaxed">
        This removes your account, every game you&apos;ve logged, your stats and
        your place on the leaderboard. It happens immediately and it cannot be
        undone — there is no backup and no restore.
      </p>

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="btn btn-ghost"
          style={{ borderColor: 'var(--color-hit)', color: 'var(--color-hit)' }}
        >
          Delete my account
        </button>
      ) : (
        <form action={action} className="space-y-4">
          {state.error && <p className="notice notice-error">{state.error}</p>}

          <div>
            <label className="field-label" htmlFor="confirm">
              Type your callsign <span className="text-[var(--color-bone)]">{username}</span> to confirm
            </label>
            <input
              id="confirm"
              name="confirm"
              className="field-input"
              autoComplete="off"
              required
            />
          </div>

          <div>
            <label className="field-label" htmlFor="del-password">
              Your password
            </label>
            <input
              id="del-password"
              name="password"
              type="password"
              className="field-input"
              autoComplete="current-password"
              required
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={pending}
              className="btn"
              style={{
                background: 'var(--color-hit)',
                color: 'var(--color-field-950)',
                border: '1px solid var(--color-hit)',
              }}
            >
              {pending ? 'Deleting…' : 'Permanently delete'}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
