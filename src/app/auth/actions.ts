'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

/**
 * Every field is validated on the SERVER. Whatever the browser
 * form does is a convenience for the user, not a security control --
 * anyone can POST to a server action directly.
 */

const signUpSchema = z.object({
  email: z.string().email('Enter a valid email address.').max(254),
  password: z
    .string()
    .min(10, 'Password must be at least 10 characters.')
    .max(128, 'Password must be under 128 characters.'),
  username: z
    .string()
    .regex(
      /^[a-zA-Z0-9_]{3,20}$/,
      'Username must be 3–20 characters, using letters, numbers and underscores only.'
    ),
  birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter your date of birth.'),
  terms: z.string().optional(),
})

const signInSchema = z.object({
  email: z.string().email('Enter a valid email address.').max(254),
  password: z.string().min(1, 'Enter your password.').max(128),
})

export type AuthState = { error?: string; message?: string }

function yearsSince(dateStr: string): number {
  const dob = new Date(dateStr + 'T00:00:00Z')
  const now = new Date()
  let age = now.getUTCFullYear() - dob.getUTCFullYear()
  const m = now.getUTCMonth() - dob.getUTCMonth()
  if (m < 0 || (m === 0 && now.getUTCDate() < dob.getUTCDate())) age--
  return age
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }
  const { email, password, username, birthdate, terms } = parsed.data

  if (terms !== 'on') {
    return { error: 'You need to accept the rules before you can sign up.' }
  }

  // Age gate. Under-13 accounts trigger COPPA obligations
  // (verifiable parental consent, restricted data handling) that
  // this app is not set up to meet. So they are refused outright.
  const age = yearsSince(birthdate)
  if (Number.isNaN(age) || age < 0 || age > 120) {
    return { error: 'Enter a valid date of birth.' }
  }
  if (age < 13) {
    return { error: 'You must be 13 or older to create an account.' }
  }

  const supabase = await createClient()

  // Reject taken usernames before hitting auth, so we don't leave
  // orphaned auth users behind when the profile trigger fails.
  const { data: taken } = await supabase
    .from('profiles')
    .select('username')
    .ilike('username', username)
    .maybeSingle()

  if (taken) return { error: 'That username is already taken.' }

  const origin = (await headers()).get('origin') ?? ''

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) return { error: error.message }

  return {
    message:
      'Check your email and click the confirmation link to activate your account.',
  }
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  // Deliberately vague. Saying "no account with that email" tells an
  // attacker which emails are registered here.
  if (error) return { error: 'Email or password is incorrect.' }

  const { data } = await supabase.auth.getUser()
  if (data.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_banned, ban_reason')
      .eq('id', data.user.id)
      .single()

    if (profile?.is_banned) {
      await supabase.auth.signOut()
      return {
        error: `This account is banned. ${profile.ban_reason ?? ''}`.trim(),
      }
    }
  }

  // Password was right. If they also have a second factor, that comes next.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

  revalidatePath('/', 'layout')
  redirect(aal?.currentLevel === 'aal1' && aal?.nextLevel === 'aal2' ? '/verify' : '/dashboard')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
