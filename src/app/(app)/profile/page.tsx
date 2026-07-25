import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ProfileEditor from '@/components/ProfileEditor'
import DeleteAccount from '@/components/DeleteAccount'
import MfaSetup from '@/components/MfaSetup'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name, bio, avatar_style, leaderboard_visibility, anonymous_on_leaderboard, role, created_at')
    .eq('id', user!.id)
    .single()

  const { data: stats } = await supabase
    .from('player_stats')
    .select('games_logged, total_kills, total_deaths, kd_ratio')
    .eq('user_id', user!.id)
    .maybeSingle()

  return (
    <div className="max-w-xl space-y-11">
      <div>
        <p className="t-eyebrow mb-1.5">
          {profile?.role === 'admin' ? 'Administrator' : 'Player'}
        </p>
        <h1 className="t-display text-3xl">{profile?.username}</h1>
        {profile && (
          <Link
            href={`/u/${profile.username}`}
            className="t-data text-xs text-[var(--color-tip)] hover:underline mt-2 inline-block"
          >
            View public profile →
          </Link>
        )}
      </div>

      <div>
        <p className="t-eyebrow mb-3">Career totals</p>
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
      </div>

      {profile && <ProfileEditor profile={profile} />}

      <div>
        <p className="t-eyebrow mb-2">Account email</p>
        <p className="t-data text-sm text-[var(--color-bone-dim)]">{user?.email}</p>
        <p className="text-xs text-[var(--color-bone-faint)] mt-2">
          Never shown to other players.
        </p>
      </div>

      <MfaSetup />

      <DeleteAccount username={profile?.username ?? ''} />
    </div>
  )
}
