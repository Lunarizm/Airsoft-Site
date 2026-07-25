'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type DeleteState = { error?: string }

/**
 * Permanently deletes the signed-in user's own account.
 *
 * Three gates before anything is destroyed:
 *  1. The session must be valid (getUser, not getSession).
 *  2. They must type their own callsign back.
 *  3. They must re-enter their password.
 *
 * Gate 3 matters more than it looks. Without it, anyone who walks up
 * to an unlocked laptop can wipe the account in two clicks. Any
 * action that can't be undone should cost a password.
 */
export async function deleteAccount(
  _prev: DeleteState,
  formData: FormData
): Promise<DeleteState> {
  const confirm = String(formData.get('confirm') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.email) return { error: 'You are not signed in.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, role')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'Could not load your account.' }

  if (confirm.toLowerCase() !== profile.username.toLowerCase()) {
    return { error: 'That callsign does not match your account.' }
  }

  if (!password) return { error: 'Enter your password to confirm.' }

  // Re-authenticate. Proves the person at the keyboard is the account owner.
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  })
  if (authError) return { error: 'Password is incorrect.' }

  // Don't let the last admin delete themselves -- that locks everyone,
  // including you, out of moderating the site forever. Recovering means
  // going back into the Supabase SQL editor by hand.
  if (profile.role === 'admin') {
    const admin = createAdminClient()
    const { count } = await admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin')

    if ((count ?? 0) <= 1) {
      return {
        error:
          'You are the only admin. Promote someone else first, or this site loses all moderation.',
      }
    }
  }

  // Requires the service-role key: normal users can't touch auth.users.
  // The ON DELETE CASCADE in the schema takes the profile, games, clips,
  // guns, friendships and team memberships with it automatically.
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) return { error: error.message }

  await supabase.auth.signOut()
  redirect('/?deleted=1')
}
