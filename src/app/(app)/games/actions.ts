'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const gameSchema = z.object({
  played_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a valid date.'),
  field_name: z.string().max(80).optional().or(z.literal('')),
  game_type: z
    .enum(['skirmish', 'milsim', 'cqb', 'speedsoft', 'scenario', 'other'])
    .optional()
    .or(z.literal('')),
  kills: z.coerce.number().int().min(0).max(999),
  deaths: z.coerce.number().int().min(0).max(999),
  objectives: z.coerce.number().int().min(0).max(999),
  minutes_played: z.coerce.number().int().min(0).max(1440).optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal('')),
})

export type GameState = { error?: string }

export async function createGame(_prev: GameState, formData: FormData): Promise<GameState> {
  const parsed = gameSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You need to be signed in to log a game.' }

  const v = parsed.data

  // user_id comes from the verified session, never from the form.
  // If it came from the form, anyone could log games onto your account.
  const { error } = await supabase.from('games').insert({
    user_id: user.id,
    played_on: v.played_on,
    field_name: v.field_name || null,
    game_type: v.game_type || null,
    kills: v.kills,
    deaths: v.deaths,
    objectives: v.objectives,
    minutes_played: v.minutes_played === '' ? null : v.minutes_played,
    notes: v.notes || null,
  })

  if (error) return { error: error.message }

  revalidatePath('/games')
  revalidatePath('/dashboard')
  redirect('/games')
}

export async function deleteGame(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  if (!id) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  // The .eq('user_id') is belt-and-braces: RLS already blocks
  // deleting somebody else's row. Two locks, one door.
  await supabase.from('games').delete().eq('id', id).eq('user_id', user.id)

  revalidatePath('/games')
  revalidatePath('/dashboard')
}
