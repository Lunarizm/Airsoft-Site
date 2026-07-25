'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type AdminState = { error?: string; message?: string }

/**
 * Every action below calls this FIRST.
 *
 * Hiding the Admin link from non-admins is not security -- server actions
 * are just HTTP endpoints, and anyone who reads your JavaScript bundle can
 * find their names and POST to them directly. The role check has to happen
 * on the server, inside every single action. No exceptions.
 *
 * Returns the caller's own id so actions can refuse self-targeting.
 */
async function requireAdmin(): Promise<{ id: string } | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_banned')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' || profile.is_banned) return null
  return { id: user.id }
}

async function countAdmins(): Promise<number> {
  const admin = createAdminClient()
  const { count } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'admin')
  return count ?? 0
}

export async function banUser(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const me = await requireAdmin()
  if (!me) return { error: 'Not authorised.' }

  const targetId = String(formData.get('userId') ?? '')
  const reason = String(formData.get('reason') ?? '').trim().slice(0, 300)

  if (!targetId) return { error: 'No user selected.' }
  if (targetId === me.id) return { error: 'You cannot ban yourself.' }

  const admin = createAdminClient()

  const { data: target } = await admin
    .from('profiles')
    .select('role, username')
    .eq('id', targetId)
    .single()

  if (!target) return { error: 'That user no longer exists.' }
  if (target.role === 'admin') {
    return { error: 'Demote this admin before banning them.' }
  }

  // Service-role client required: the schema revokes UPDATE on
  // is_banned from normal users, so even an admin's browser session
  // can't set it. Bans only happen through server code.
  const { error } = await admin
    .from('profiles')
    .update({ is_banned: true, ban_reason: reason || 'Broke the rules.' })
    .eq('id', targetId)

  if (error) return { error: error.message }

  revalidatePath('/admin')
  return { message: `${target.username} is banned.` }
}

export async function unbanUser(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const me = await requireAdmin()
  if (!me) return { error: 'Not authorised.' }

  const targetId = String(formData.get('userId') ?? '')
  if (!targetId) return { error: 'No user selected.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({ is_banned: false, ban_reason: null })
    .eq('id', targetId)

  if (error) return { error: error.message }

  revalidatePath('/admin')
  return { message: 'Ban lifted.' }
}

export async function setRole(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const me = await requireAdmin()
  if (!me) return { error: 'Not authorised.' }

  const targetId = String(formData.get('userId') ?? '')
  const role = String(formData.get('role') ?? '')

  if (role !== 'admin' && role !== 'user') return { error: 'Invalid role.' }
  if (!targetId) return { error: 'No user selected.' }

  // Demoting the last admin leaves the site with nobody who can moderate,
  // recoverable only through the Supabase SQL editor.
  if (role === 'user' && (await countAdmins()) <= 1) {
    return { error: 'This is the last admin. Promote someone else first.' }
  }

  const admin = createAdminClient()
  const { error } = await admin.from('profiles').update({ role }).eq('id', targetId)
  if (error) return { error: error.message }

  revalidatePath('/admin')
  return { message: role === 'admin' ? 'Promoted to admin.' : 'Demoted to player.' }
}

export async function adminDeleteUser(
  _prev: AdminState,
  formData: FormData
): Promise<AdminState> {
  const me = await requireAdmin()
  if (!me) return { error: 'Not authorised.' }

  const targetId = String(formData.get('userId') ?? '')
  const confirm = String(formData.get('confirm') ?? '').trim()

  if (!targetId) return { error: 'No user selected.' }
  if (targetId === me.id) {
    return { error: 'Delete your own account from your profile page instead.' }
  }

  const admin = createAdminClient()
  const { data: target } = await admin
    .from('profiles')
    .select('username, role')
    .eq('id', targetId)
    .single()

  if (!target) return { error: 'That user no longer exists.' }
  if (target.role === 'admin') return { error: 'Demote this admin first.' }

  // Typing the username is the last gate before an irreversible delete.
  if (confirm.toLowerCase() !== target.username.toLowerCase()) {
    return { error: `Type ${target.username} exactly to confirm.` }
  }

  const { error } = await admin.auth.admin.deleteUser(targetId)
  if (error) return { error: error.message }

  revalidatePath('/admin')
  return { message: `${target.username} deleted, along with all their games.` }
}

export async function adminDeleteGame(
  _prev: AdminState,
  formData: FormData
): Promise<AdminState> {
  const me = await requireAdmin()
  if (!me) return { error: 'Not authorised.' }

  const gameId = String(formData.get('gameId') ?? '')
  if (!gameId) return { error: 'No game selected.' }

  const admin = createAdminClient()
  const { error } = await admin.from('games').delete().eq('id', gameId)
  if (error) return { error: error.message }

  revalidatePath('/admin')
  return { message: 'Game deleted.' }
}

export async function resolveReport(
  _prev: AdminState,
  formData: FormData
): Promise<AdminState> {
  const me = await requireAdmin()
  if (!me) return { error: 'Not authorised.' }

  const reportId = String(formData.get('reportId') ?? '')
  const status = String(formData.get('status') ?? '')

  if (!['open', 'reviewing', 'resolved', 'dismissed'].includes(status)) {
    return { error: 'Invalid status.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('reports').update({ status }).eq('id', reportId)
  if (error) return { error: error.message }

  revalidatePath('/admin')
  return { message: 'Report updated.' }
}
