'use client'

import { useActionState } from 'react'

type State = { error?: string; message?: string }
type Action = (prev: State, formData: FormData) => Promise<State>

/**
 * A single-purpose form button. The server action is passed in as a
 * prop from the server component -- Next.js allows this, and it keeps
 * all the real logic on the server where it can be trusted.
 */
export default function ActionButton({
  action,
  fields,
  label,
  pendingLabel,
  tone = 'quiet',
}: {
  action: Action
  fields: Record<string, string>
  label: string
  pendingLabel?: string
  tone?: 'quiet' | 'primary' | 'danger'
}) {
  const [state, formAction, pending] = useActionState<State, FormData>(action, {})

  const tones = {
    quiet: 'text-[var(--color-bone-dim)] hover:text-[var(--color-bone)]',
    primary: 'text-[var(--color-tip)] hover:underline',
    danger: 'text-[var(--color-bone-faint)] hover:text-[var(--color-hit)]',
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <form action={formAction}>
        {Object.entries(fields).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <button
          disabled={pending}
          className={`t-data text-[0.6875rem] uppercase tracking-widest transition-colors disabled:opacity-40 ${tones[tone]}`}
        >
          {pending ? (pendingLabel ?? 'Working…') : label}
        </button>
      </form>
      {state.error && (
        <span className="t-data text-[0.625rem] text-[var(--color-hit)] text-right max-w-48">
          {state.error}
        </span>
      )}
      {state.message && (
        <span className="t-data text-[0.625rem] text-[var(--color-confirmed)]">
          {state.message}
        </span>
      )}
    </span>
  )
}
