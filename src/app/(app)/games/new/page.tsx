'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { createGame, type GameState } from '../actions'

const TYPES = ['skirmish', 'milsim', 'cqb', 'speedsoft', 'scenario', 'other']

export default function NewGamePage() {
  const [state, action, pending] = useActionState<GameState, FormData>(createGame, {})
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="max-w-xl">
      <Link href="/games" className="t-eyebrow hover:text-[var(--color-tip)]">
        ← Game log
      </Link>
      <h1 className="t-display text-3xl mt-4 mb-8">Log a game</h1>

      {state.error && <p className="notice notice-error mb-6">{state.error}</p>}

      <form action={action} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="field-label" htmlFor="played_on">Date played</label>
            <input id="played_on" name="played_on" type="date" defaultValue={today}
              max={today} className="field-input" required />
          </div>
          <div>
            <label className="field-label" htmlFor="game_type">Game type</label>
            <select id="game_type" name="game_type" className="field-input" defaultValue="">
              <option value="">—</option>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="field_name">Field</label>
          <input id="field_name" name="field_name" className="field-input"
            placeholder="Where did you play?" maxLength={80} />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="field-label" htmlFor="kills">Kills</label>
            <input id="kills" name="kills" type="number" min={0} max={999}
              defaultValue={0} className="field-input" required />
          </div>
          <div>
            <label className="field-label" htmlFor="deaths">Deaths</label>
            <input id="deaths" name="deaths" type="number" min={0} max={999}
              defaultValue={0} className="field-input" required />
          </div>
          <div>
            <label className="field-label" htmlFor="objectives">Objectives</label>
            <input id="objectives" name="objectives" type="number" min={0} max={999}
              defaultValue={0} className="field-input" required />
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="minutes_played">Minutes played</label>
          <input id="minutes_played" name="minutes_played" type="number" min={0} max={1440}
            className="field-input" placeholder="Optional" />
        </div>

        <div>
          <label className="field-label" htmlFor="notes">Notes</label>
          <textarea id="notes" name="notes" rows={4} maxLength={2000}
            className="field-input resize-y"
            placeholder="What worked, what jammed, what you'd change." />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? 'Saving…' : 'Save game'}
          </button>
          <Link href="/games" className="btn btn-ghost">Cancel</Link>
        </div>
      </form>
    </div>
  )
}
