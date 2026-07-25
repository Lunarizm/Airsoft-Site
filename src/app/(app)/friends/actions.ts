'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type FriendState = { error?: string; message?: string }

/**
 * A friendship is one row: (requester_id, addressee_id, status).
 * The pair is ordered, so A→B and B→A are different rows. Every check
 * below has to look in BOTH directions or you get duplicate requests
 * and blocks that can be walked around by asking from the other side.
 */
async function findRelationship(supabase: Awaited<ReturnType<typeof createClient>>, meId: string, otherId: string) {
  const { data } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id, status')
    .or(
      `and(requester_id.eq.${meId},addressee_id.eq.${otherId}),` +
        `and(requester_id.eq.${otherId},addressee_id.eq.${meId})`
    )
    .maybeSingle()
  return data
}

export async function sendFriendRequest(
  _prev: FriendState,
  formData: FormData
): Promise<FriendState> {
  const targetId = String(formData.get('userId') ?? '')
  if (!targetId) return { error: 'No player selected.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You are not signed in.' }

  if (targetId === user.id) return { error: 'You cannot friend yourself.' }

  const { data: target } = await supabase
    .from('profiles')
    .select('username, is_banned')
    .eq('id', targetId)
    .single()

  if (!target || target.is_banned) return { error: 'That player is not available.' }

  const existing = await findRelationship(supabase, user.id, targetId)

  if (existing) {
    if (existing.status === 'accepted') return { error: 'You are already friends.' }
    if (existing.status === 'blocked') return { error: 'That player is not available.' }
    if (existing.requester_id === user.id) return { error: 'Request already sent.' }
    return { error: `${target.username} already sent you a request — check your inbox.` }
  }

  const { error } = await supabase.from('friendships').insert({
    requester_id: user.id,
    addressee_id: targetId,
    status: 'pending',
  })
  if (error) return { error: error.message }

  revalidatePath('/friends')
  return { message: `Request sent to ${target.username}.` }
}

export async function acceptRequest(
  _prev: FriendState,
  formData: FormData
): Promise<FriendState> {
  const requesterId = String(formData.get('userId') ?? '')
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You are not signed in.' }

  // Only the addressee can accept. The database enforces this too --
  // see patch-friends.sql. Two locks, one door.
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('requester_id', requesterId)
    .eq('addressee_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/friends')
  revalidatePath('/leaderboard')
  return { message: 'Friend added.' }
}

export async function declineRequest(
  _prev: FriendState,
  formData: FormData
): Promise<FriendState> {
  const requesterId = String(formData.get('userId') ?? '')
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You are not signed in.' }

  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('requester_id', requesterId)
    .eq('addressee_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/friends')
  return { message: 'Request declined.' }
}

export async function removeFriend(
  _prev: FriendState,
  formData: FormData
): Promise<FriendState> {
  const otherId = String(formData.get('userId') ?? '')
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You are not signed in.' }

  const { error } = await supabase
    .from('friendships')
    .delete()
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${otherId}),` +
        `and(requester_id.eq.${otherId},addressee_id.eq.${user.id})`
    )

  if (error) return { error: error.message }

  revalidatePath('/friends')
  revalidatePath('/leaderboard')
  return { message: 'Removed.' }
}

export async function blockUser(_prev: FriendState, formData: FormData): Promise<FriendState> {
  const otherId = String(formData.get('userId') ?? '')
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You are not signed in.' }
  if (otherId === user.id) return { error: 'You cannot block yourself.' }

  // Clear whatever exists in either direction, then write the block
  // from your side. Otherwise an old pending row survives and the
  // blocked player still shows up in your requests.
  await supabase
    .from('friendships')
    .delete()
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${otherId}),` +
        `and(requester_id.eq.${otherId},addressee_id.eq.${user.id})`
    )

  const { error } = await supabase.from('friendships').insert({
    requester_id: user.id,
    addressee_id: otherId,
    status: 'blocked',
  })
  if (error) return { error: error.message }

  revalidatePath('/friends')
  return { message: 'Blocked.' }
}
