'use client'

import { useActionState } from 'react'
import type { FriendState } from '@/app/(app)/friends/actions'

type Found = { id: string; username: string }
type LookupState = FriendState & { found?: Found }

export default function CallsignLookup({
  lookupAction,
  addAction,
}: {
  lookupAction: (prev: LookupState, fd: FormData) => Promise<LookupState>
  addAction: (prev: FriendState, fd: FormData) => Promise<FriendState>
}) {
  const [lookup, doLookup, looking] = useActionState<LookupState, FormData>(lookupAction, {})
  const [add, doAdd, adding] = useActionState<FriendState, FormData>(addAction, {})

  return (
    <div className="space-y-3">
      <form action={doLookup} className="flex gap-2">
        <input
          name="callsign"
          className="field-input flex-1"
          placeholder="Exact callsign"
          minLength={3}
          maxLength={20}
          pattern="[a-zA-Z0-9_]+"
          autoComplete="off"
          required
        />
        <button className="btn btn-ghost" disabled={looking}>
          {looking ? 'Looking…' : 'Find'}
        </button>
      </form>

      <p className="text-xs text-[var(--color-bone-faint)]">
        You need the whole callsign. Capitals don&apos;t matter.
      </p>

      {lookup.error && <p className="notice notice-error">{lookup.error}</p>}
      {add.error && <p className="notice notice-error">{add.error}</p>}
      {add.message && <p className="notice notice-ok">{add.message}</p>}

      {lookup.found && !add.message && (
        <form action={doAdd} className="stub pl-4 pr-4 py-3 flex items-center gap-4">
          <input type="hidden" name="userId" value={lookup.found.id} />
          <span className="flex-1 truncate text-sm">{lookup.found.username}</span>
          <button
            className="t-data text-[0.6875rem] uppercase tracking-widest text-[var(--color-tip)] hover:underline disabled:opacity-40"
            disabled={adding}
          >
            {adding ? 'Sending…' : 'Send request'}
          </button>
        </form>
      )}
    </div>
  )
}
