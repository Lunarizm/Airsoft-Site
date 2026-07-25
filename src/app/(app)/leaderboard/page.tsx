import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Avatar from '@/components/Avatar'

export const dynamic = 'force-dynamic'

/**
 * A player with 3 kills and 0 deaths in one game has an "infinite" K/D
 * and would sit above someone with 400 kills across 50 games. That makes
 * the board meaningless. So K/D ranking requires a minimum number of
 * games; everyone else is listed but marked unranked.
 */
const MIN_GAMES = 3

const SORTS = {
  kd: { column: 'kd_ratio', label: 'K/D' },
  kills: { column: 'total_kills', label: 'Kills' },
  games: { column: 'games_logged', label: 'Games' },
} as const

type SortKey = keyof typeof SORTS

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; scope?: string }>
}) {
  const params = await searchParams
  const sort: SortKey = params.sort && params.sort in SORTS ? (params.sort as SortKey) : 'kd'
  const scope = params.scope === 'friends' ? 'friends' : 'all'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let query = supabase.from('player_stats').select('*').limit(100)

  // Friends scope: me plus everyone I've actually accepted.
  if (scope === 'friends' && user) {
    const { data: links } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .eq('status', 'accepted')

    const ids = [
      user.id,
      ...(links ?? []).map((l) =>
        l.requester_id === user.id ? l.addressee_id : l.requester_id
      ),
    ]
    query = query.in('user_id', ids)
  }

  if (sort === 'kd') {
    query = query
      .gte('games_logged', MIN_GAMES)
      .order('kd_ratio', { ascending: false })
      .order('total_kills', { ascending: false })
  } else {
    query = query.gt('games_logged', 0).order(SORTS[sort].column, { ascending: false })
  }

  const { data: rows } = await query

  return (
    <div>
      <div className="mb-6">
        <p className="t-eyebrow mb-1.5">Top 100 players</p>
        <h1 className="t-display text-3xl">Leaderboard</h1>
      </div>

      <div className="flex gap-2 mb-5">
        {(['all', 'friends'] as const).map((sc) => (
          <Link
            key={sc}
            href={`/leaderboard?sort=${sort}&scope=${sc}`}
            className={`t-data text-[0.6875rem] uppercase tracking-widest px-3 py-1.5 border transition-colors ${
              scope === sc
                ? 'border-[var(--color-tip)] text-[var(--color-tip)]'
                : 'border-[var(--color-field-700)] text-[var(--color-bone-faint)] hover:text-[var(--color-bone)]'
            }`}
          >
            {sc === 'all' ? 'Everyone' : 'Friends only'}
          </Link>
        ))}
      </div>

      <div className="flex gap-1 mb-6 border-b border-[var(--color-field-800)]">
        {(Object.keys(SORTS) as SortKey[]).map((key) => (
          <Link
            key={key}
            href={`/leaderboard?sort=${key}&scope=${scope}`}
            className={`t-data text-xs uppercase tracking-widest px-3.5 py-2.5 border-b-2 -mb-px transition-colors ${
              sort === key
                ? 'border-[var(--color-tip)] text-[var(--color-bone)]'
                : 'border-transparent text-[var(--color-bone-faint)] hover:text-[var(--color-bone)]'
            }`}
          >
            {SORTS[key].label}
          </Link>
        ))}
      </div>

      {sort === 'kd' && (
        <p className="text-xs text-[var(--color-bone-faint)] mb-4">
          You need {MIN_GAMES} logged games to appear on the K/D board.
        </p>
      )}

      {!rows || rows.length === 0 ? (
        <div className="border border-dashed border-[var(--color-field-700)] px-6 py-14 text-center">
          <p className="t-display text-lg mb-2">Nobody qualifies yet</p>
          <p className="text-sm text-[var(--color-bone-dim)]">
            {scope === 'friends'
              ? 'Add some friends, or get them to log a few games.'
              : sort === 'kd'
                ? `Log ${MIN_GAMES} games and you'll be first on the board.`
                : 'Log a game to get on the board.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r, i) => {
            const isMe = r.user_id === user?.id
            const rank = i + 1
            return (
              <li
                key={r.user_id}
                className={`stub pl-4 pr-4 py-3 flex items-center gap-4 ${
                  isMe ? 'border-[var(--color-tip)]/50 bg-[var(--color-field-850)]' : ''
                }`}
              >
                <span
                  className={`t-data text-sm w-8 shrink-0 ${
                    rank <= 3 ? 'text-[var(--color-tip)]' : 'text-[var(--color-bone-faint)]'
                  }`}
                >
                  {rank}
                </span>

                <Avatar seed={r.user_id} style={r.avatar_style ?? 0} size={26} />

                <span className="flex-1 min-w-0 truncate text-sm">
                  {r.anonymous_on_leaderboard && !isMe ? (
                    <span className="text-[var(--color-bone-faint)]">anonymous player</span>
                  ) : (
                    <Link href={`/u/${r.username}`} className="hover:text-[var(--color-tip)] transition-colors">
                      {r.username}
                    </Link>
                  )}
                  {isMe && (
                    <span className="t-data text-[0.625rem] uppercase tracking-widest text-[var(--color-tip)] ml-2">
                      you
                    </span>
                  )}
                </span>

                <span className="t-data text-xs text-[var(--color-bone-faint)] hidden sm:inline shrink-0">
                  {r.games_logged} games
                </span>

                <span className="t-data text-xs shrink-0 hidden sm:inline">
                  <span className="text-[var(--color-confirmed)]">{r.total_kills}</span>
                  <span className="text-[var(--color-bone-faint)] mx-1">/</span>
                  <span className="text-[var(--color-hit)]">{r.total_deaths}</span>
                </span>

                <span className="t-data text-base w-14 text-right shrink-0">
                  {sort === 'kills'
                    ? r.total_kills
                    : sort === 'games'
                      ? r.games_logged
                      : Number(r.kd_ratio).toFixed(2)}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
