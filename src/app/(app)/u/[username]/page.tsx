import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Avatar from '@/components/Avatar'

export const dynamic = 'force-dynamic'

export default async function PublicProfile({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name, bio, avatar_style, leaderboard_visibility, anonymous_on_leaderboard, created_at')
    .ilike('username', username)
    .eq('is_banned', false)
    .maybeSingle()

  if (!profile) notFound()

  const isMe = profile.id === user?.id

  // Stats come from the view, which respects the games RLS policy.
  // If this player is hidden or friends-only and you aren't a friend,
  // the database returns nothing -- the privacy setting is enforced
  // down there, not by hiding things in this component.
  const { data: stats } = await supabase
    .from('player_stats')
    .select('games_logged, total_kills, total_deaths, kd_ratio')
    .eq('user_id', profile.id)
    .maybeSingle()

  const hidden = !isMe && (!stats || stats.games_logged === 0)
  const anon = !isMe && profile.anonymous_on_leaderboard

  return (
    <div className="max-w-xl space-y-9">
      <Link href="/leaderboard" className="t-eyebrow hover:text-[var(--color-tip)]">
        ← Leaderboard
      </Link>

      <div className="flex items-start gap-4">
        <Avatar seed={profile.id} style={profile.avatar_style ?? 0} size={64} />
        <div className="min-w-0">
          <h1 className="t-display text-3xl break-words">
            {anon ? 'Anonymous player' : profile.username}
          </h1>
          {!anon && profile.display_name && (
            <p className="text-sm text-[var(--color-bone-dim)] mt-1">{profile.display_name}</p>
          )}
          <p className="t-data text-xs text-[var(--color-bone-faint)] mt-1.5">
            joined {profile.created_at?.slice(0, 10)}
          </p>
        </div>
      </div>

      {profile.bio && !anon && (
        <p className="text-sm text-[var(--color-bone-dim)] leading-relaxed whitespace-pre-wrap">
          {profile.bio}
        </p>
      )}

      {hidden ? (
        <p className="text-sm text-[var(--color-bone-faint)] border border-dashed border-[var(--color-field-700)] px-5 py-8 text-center">
          This player keeps their stats private.
        </p>
      ) : (
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[var(--color-field-800)] border border-[var(--color-field-800)]">
          {[
            ['Games', stats?.games_logged ?? 0],
            ['Kills', stats?.total_kills ?? 0],
            ['Deaths', stats?.total_deaths ?? 0],
            ['K/D', stats?.kd_ratio ?? '0.00'],
          ].map(([label, value]) => (
            <div key={String(label)} className="bg-[var(--color-field-900)] px-4 py-4">
              <dt className="t-eyebrow mb-1.5">{label}</dt>
              <dd className="t-data text-xl">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {isMe && (
        <Link href="/profile" className="btn btn-ghost inline-block">
          Edit your profile
        </Link>
      )}
    </div>
  )
}
