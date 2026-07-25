import { createClient } from '@/lib/supabase/server'
import DeleteAccount from '@/components/DeleteAccount'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, bio, role, created_at')
    .eq('id', user!.id)
    .single()

  const { data: stats } = await supabase
    .from('player_stats')
    .select('*')
    .eq('user_id', user!.id)
    .single()

  return (
    <div className="max-w-xl space-y-10">
      <div>
        <p className="t-eyebrow mb-1.5">
          {profile?.role === 'admin' ? 'Administrator' : 'Player'}
        </p>
        <h1 className="t-display text-3xl">{profile?.username}</h1>
        <p className="t-data text-xs text-[var(--color-bone-faint)] mt-2">
          Joined {profile?.created_at?.slice(0, 10)}
        </p>
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

      <div>
        <p className="t-eyebrow mb-3">Account email</p>
        <p className="t-data text-sm text-[var(--color-bone-dim)]">{user?.email}</p>
        <p className="text-xs text-[var(--color-bone-faint)] mt-2">
          Only you can see your email. Other players see your callsign.
        </p>
      </div>

      <DeleteAccount username={profile?.username ?? ''} />
    </div>
  )
}
