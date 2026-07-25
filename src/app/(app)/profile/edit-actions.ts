'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export type ProfileState = { error?: string; message?: string }

const profileSchema = z.object({
  display_name: z.string().max(40).optional().or(z.literal('')),
  bio: z.string().max(300).optional().or(z.literal('')),
  avatar_style: z.coerce.number().int().min(0).max(7),
  leaderboard_visibility: z.enum(['public', 'friends', 'hidden']),
  anonymous_on_leaderboard: z.string().optional(),
})

export async function updateProfile(
  _prev: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const parsed = profileSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You are not signed in.' }

  const v = parsed.data

  // Only these columns are grantable to authenticated users -- the
  // database rejects an attempt to slip role or is_banned in here,
  // even though this code would never send them.
  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: v.display_name || null,
      bio: v.bio || null,
      avatar_style: v.avatar_style,
      leaderboard_visibility: v.leaderboard_visibility,
      anonymous_on_leaderboard: v.anonymous_on_leaderboard === 'on',
    })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/profile')
  revalidatePath('/leaderboard')
  return { message: 'Saved.' }
}
