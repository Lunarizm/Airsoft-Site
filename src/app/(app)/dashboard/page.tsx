import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: games } = await supabase
    .from('games')
    .select('*')
    .eq('user_id', user!.id)
    .order('played_on', { ascending: false })
    .limit(5)

  const { data: totals } = await supabase
    .from('player_stats')
    .select('*')
    .eq('user_id', user!.id)
    .single()

  const kills = totals?.total_kills ?? 0
  const deaths = totals?.total_deaths ?? 0
  const played = totals?.games_logged ?? 0
  const kd = deaths === 0 ? kills : kills / deaths
  const total = kills + deaths

  return (
    <div className="space-y-12">
      {/* ---- SIGNATURE: chrono readout ---- */}
      <section>
        <p className="t-eyebrow mb-3">Career readout</p>

        <div className="chrono px-6 py-7 sm:px-9 sm:py-9">
          <div className="relative z-10 flex flex-wrap items-end gap-x-10 gap-y-6">
            <div>
              <p className="t-eyebrow mb-1.5">K / D ratio</p>
              <p className="chrono-value text-6xl sm:text-7xl leading-none">
                {played === 0 ? '—.——' : kd.toFixed(2)}
              </p>
            </div>

            <dl className="flex gap-8 pb-2">
              <div>
                <dt className="t-eyebrow mb-1">Kills</dt>
                <dd className="t-data text-2xl text-[var(--color-confirmed)]">{kills}</dd>
              </div>
              <div>
                <dt className="t-eyebrow mb-1">Deaths</dt>
                <dd className="t-data text-2xl text-[var(--color-hit)]">{deaths}</dd>
              </div>
              <div>
                <dt className="t-eyebrow mb-1">Games</dt>
                <dd className="t-data text-2xl">{played}</dd>
              </div>
            </dl>
          </div>

          {/* hit tape */}
          <div className="tape mt-7 relative z-10">
            {total === 0 ? (
              <div className="w-full bg-[var(--color-field-700)]" />
            ) : (
              <>
                <div className="tape-k" style={{ width: `${(kills / total) * 100}%` }} />
                <div className="tape-d" style={{ width: `${(deaths / total) * 100}%` }} />
              </>
            )}
          </div>
        </div>
      </section>

      {/* ---- recent games ---- */}
      <section>
        <div className="flex items-end justify-between mb-4 gap-4">
          <div>
            <p className="t-eyebrow mb-1.5">Last five games</p>
            <h2 className="t-display text-2xl">Recent</h2>
          </div>
          <Link href="/games/new" className="btn btn-primary shrink-0">
            Log a game
          </Link>
        </div>

        {!games || games.length === 0 ? (
          <div className="border border-dashed border-[var(--color-field-700)] px-6 py-12 text-center">
            <p className="t-display text-lg mb-2">No games yet</p>
            <p className="text-sm text-[var(--color-bone-dim)] mb-6">
              Log your first game and your K/D starts counting.
            </p>
            <Link href="/games/new" className="btn btn-ghost inline-block">
              Log your first game
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {games.map((g) => (
              <li key={g.id} className="stub pl-5 pr-4 py-3.5 flex items-center gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate">
                    {g.field_name || 'Unnamed field'}
                  </p>
                  <p className="t-data text-xs text-[var(--color-bone-faint)] mt-0.5">
                    {g.played_on}
                    {g.game_type ? ` · ${g.game_type}` : ''}
                  </p>
                </div>
                <p className="t-data text-sm shrink-0">
                  <span className="text-[var(--color-confirmed)]">{g.kills}</span>
                  <span className="text-[var(--color-bone-faint)] mx-1">/</span>
                  <span className="text-[var(--color-hit)]">{g.deaths}</span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
