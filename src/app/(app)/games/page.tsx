import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { deleteGame } from './actions'

export const dynamic = 'force-dynamic'

export default async function GamesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: games } = await supabase
    .from('games')
    .select('*')
    .eq('user_id', user!.id)
    .order('played_on', { ascending: false })

  return (
    <div>
      <div className="flex items-end justify-between mb-6 gap-4">
        <div>
          <p className="t-eyebrow mb-1.5">
            {games?.length ?? 0} game{games?.length === 1 ? '' : 's'} logged
          </p>
          <h1 className="t-display text-3xl">Game log</h1>
        </div>
        <Link href="/games/new" className="btn btn-primary shrink-0">Log a game</Link>
      </div>

      {!games || games.length === 0 ? (
        <div className="border border-dashed border-[var(--color-field-700)] px-6 py-14 text-center">
          <p className="t-display text-lg mb-2">Nothing logged yet</p>
          <p className="text-sm text-[var(--color-bone-dim)]">
            Your K/D starts counting from the first game you add.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {games.map((g) => {
            const kd = g.deaths === 0 ? g.kills : g.kills / g.deaths
            return (
              <li key={g.id} className="stub pl-5 pr-4 py-4">
                <div className="flex items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{g.field_name || 'Unnamed field'}</p>
                    <p className="t-data text-xs text-[var(--color-bone-faint)] mt-1">
                      {g.played_on}
                      {g.game_type ? ` · ${g.game_type}` : ''}
                      {g.minutes_played ? ` · ${g.minutes_played} min` : ''}
                    </p>
                    {g.notes && (
                      <p className="text-sm text-[var(--color-bone-dim)] mt-2.5 whitespace-pre-wrap">
                        {g.notes}
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <p className="t-data text-lg">
                      <span className="text-[var(--color-confirmed)]">{g.kills}</span>
                      <span className="text-[var(--color-bone-faint)] mx-1">/</span>
                      <span className="text-[var(--color-hit)]">{g.deaths}</span>
                    </p>
                    <p className="t-data text-xs text-[var(--color-bone-faint)] mt-0.5">
                      {kd.toFixed(2)} K/D
                    </p>
                    <form action={deleteGame} className="mt-2">
                      <input type="hidden" name="id" value={g.id} />
                      <button className="t-data text-[0.6875rem] uppercase tracking-widest text-[var(--color-bone-faint)] hover:text-[var(--color-hit)] transition-colors">
                        Delete
                      </button>
                    </form>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
