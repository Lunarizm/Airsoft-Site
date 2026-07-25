import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Nav from '@/components/Nav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // If this account has 2FA enrolled but the session hasn't cleared it
  // yet, currentLevel is aal1 while nextLevel is aal2. Checking here
  // covers every page inside this layout at once -- add a new page and
  // it's protected automatically, with nothing to remember.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (aal?.currentLevel === 'aal1' && aal?.nextLevel === 'aal2') redirect('/verify')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, role, is_banned, ban_reason')
    .eq('id', user.id)
    .single()

  if (profile?.is_banned) {
    return (
      <main className="min-h-dvh flex items-center justify-center px-5">
        <div className="max-w-md">
          <p className="t-eyebrow mb-3">Account suspended</p>
          <h1 className="t-display text-3xl mb-4">You&apos;re banned</h1>
          <p className="text-[var(--color-bone-dim)] text-sm">
            {profile.ban_reason || 'This account broke the rules and has been suspended.'}
          </p>
        </div>
      </main>
    )
  }

  return (
    <>
      <Nav username={profile?.username ?? 'player'} isAdmin={profile?.role === 'admin'} />
      <main className="max-w-5xl mx-auto px-5 py-10">{children}</main>
    </>
  )
}
