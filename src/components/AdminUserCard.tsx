'use client'

import { useActionState, useState } from 'react'
import {
  banUser,
  unbanUser,
  setRole,
  adminDeleteUser,
  type AdminState,
} from '@/app/(app)/admin/actions'

type User = {
  id: string
  username: string
  role: string
  is_banned: boolean
  ban_reason: string | null
  created_at: string
}

export default function AdminUserCard({ user, isMe }: { user: User; isMe: boolean }) {
  const [panel, setPanel] = useState<'none' | 'ban' | 'delete'>('none')
  const [banState, banAction, banPending] = useActionState<AdminState, FormData>(banUser, {})
  const [unbanState, unbanAction, unbanPending] = useActionState<AdminState, FormData>(unbanUser, {})
  const [roleState, roleAction, rolePending] = useActionState<AdminState, FormData>(setRole, {})
  const [delState, delAction, delPending] = useActionState<AdminState, FormData>(adminDeleteUser, {})

  const msg = banState.error || unbanState.error || roleState.error || delState.error
  const ok = banState.message || unbanState.message || roleState.message || delState.message

  return (
    <li className="stub pl-5 pr-4 py-4">
      <div className="flex items-start gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate">
            {user.username}
            {isMe && (
              <span className="t-data text-[0.625rem] uppercase tracking-widest text-[var(--color-tip)] ml-2">
                you
              </span>
            )}
            {user.role === 'admin' && (
              <span className="t-data text-[0.625rem] uppercase tracking-widest text-[var(--color-tip)] ml-2">
                admin
              </span>
            )}
            {user.is_banned && (
              <span className="t-data text-[0.625rem] uppercase tracking-widest text-[var(--color-hit)] ml-2">
                banned
              </span>
            )}
          </p>
          <p className="t-data text-xs text-[var(--color-bone-faint)] mt-1">
            joined {user.created_at?.slice(0, 10)}
          </p>
          {user.is_banned && user.ban_reason && (
            <p className="text-xs text-[var(--color-hit)] mt-1.5">{user.ban_reason}</p>
          )}
        </div>

        {!isMe && (
          <div className="flex gap-3 items-center shrink-0 t-data text-[0.6875rem] uppercase tracking-widest">
            <form action={roleAction}>
              <input type="hidden" name="userId" value={user.id} />
              <input type="hidden" name="role" value={user.role === 'admin' ? 'user' : 'admin'} />
              <button disabled={rolePending} className="text-[var(--color-bone-dim)] hover:text-[var(--color-tip)]">
                {user.role === 'admin' ? 'Demote' : 'Promote'}
              </button>
            </form>

            {user.is_banned ? (
              <form action={unbanAction}>
                <input type="hidden" name="userId" value={user.id} />
                <button disabled={unbanPending} className="text-[var(--color-confirmed)] hover:underline">
                  Unban
                </button>
              </form>
            ) : (
              <button
                onClick={() => setPanel(panel === 'ban' ? 'none' : 'ban')}
                className="text-[var(--color-bone-dim)] hover:text-[var(--color-hit)]"
              >
                Ban
              </button>
            )}

            <button
              onClick={() => setPanel(panel === 'delete' ? 'none' : 'delete')}
              className="text-[var(--color-bone-faint)] hover:text-[var(--color-hit)]"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {msg && <p className="notice notice-error mt-3">{msg}</p>}
      {ok && <p className="notice notice-ok mt-3">{ok}</p>}

      {panel === 'ban' && (
        <form action={banAction} className="mt-4 flex gap-2 flex-wrap">
          <input type="hidden" name="userId" value={user.id} />
          <input
            name="reason"
            className="field-input flex-1 min-w-48"
            placeholder="Reason (the user sees this)"
            maxLength={300}
          />
          <button
            disabled={banPending}
            className="btn"
            style={{
              background: 'var(--color-hit)',
              color: 'var(--color-field-950)',
              border: '1px solid var(--color-hit)',
            }}
          >
            {banPending ? 'Banning…' : 'Ban'}
          </button>
        </form>
      )}

      {panel === 'delete' && (
        <form action={delAction} className="mt-4">
          <p className="text-xs text-[var(--color-bone-dim)] mb-2">
            Deletes the account and every game they logged. Cannot be undone.
          </p>
          <div className="flex gap-2 flex-wrap">
            <input type="hidden" name="userId" value={user.id} />
            <input
              name="confirm"
              className="field-input flex-1 min-w-48"
              placeholder={`Type ${user.username} to confirm`}
              autoComplete="off"
            />
            <button
              disabled={delPending}
              className="btn"
              style={{
                background: 'var(--color-hit)',
                color: 'var(--color-field-950)',
                border: '1px solid var(--color-hit)',
              }}
            >
              {delPending ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </form>
      )}
    </li>
  )
}
