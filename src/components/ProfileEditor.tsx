'use client'

import { useActionState, useState } from 'react'
import Avatar from './Avatar'
import { updateProfile, type ProfileState } from '@/app/(app)/profile/edit-actions'

type Profile = {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  avatar_style: number
  leaderboard_visibility: string
  anonymous_on_leaderboard: boolean
}

const VISIBILITY = [
  ['public', 'Everyone', 'Anyone signed in can see your stats and profile.'],
  ['friends', 'Friends only', 'Only players you have accepted can see your games.'],
  ['hidden', 'Nobody', 'You disappear from the leaderboard entirely.'],
] as const

export default function ProfileEditor({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfile, {})
  const [style, setStyle] = useState(profile.avatar_style ?? 0)
  const [bio, setBio] = useState(profile.bio ?? '')

  return (
    <form action={action} className="space-y-8">
      {state.error && <p className="notice notice-error">{state.error}</p>}
      {state.message && <p className="notice notice-ok">{state.message}</p>}

      <div>
        <p className="field-label">Avatar</p>
        <div className="flex items-center gap-4 flex-wrap">
          <Avatar seed={profile.id} style={style} size={56} />
          <div className="flex gap-1.5 flex-wrap">
            {Array.from({ length: 8 }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setStyle(i)}
                aria-label={`Avatar colour ${i + 1}`}
                className={`p-0.5 border transition-colors ${
                  style === i
                    ? 'border-[var(--color-tip)]'
                    : 'border-[var(--color-field-700)] hover:border-[var(--color-bone-faint)]'
                }`}
              >
                <Avatar seed={profile.id} style={i} size={26} />
              </button>
            ))}
          </div>
        </div>
        <input type="hidden" name="avatar_style" value={style} />
        <p className="text-xs text-[var(--color-bone-faint)] mt-2">
          Generated from your account, so it&apos;s yours alone. Pick a colour.
        </p>
      </div>

      <div>
        <label className="field-label" htmlFor="display_name">Display name</label>
        <input
          id="display_name"
          name="display_name"
          defaultValue={profile.display_name ?? ''}
          className="field-input"
          maxLength={40}
          placeholder={profile.username}
        />
        <p className="text-xs text-[var(--color-bone-faint)] mt-1.5">
          Optional. Shown alongside your callsign, which never changes.
        </p>
      </div>

      <div>
        <label className="field-label" htmlFor="bio">Bio</label>
        <textarea
          id="bio"
          name="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          maxLength={300}
          className="field-input resize-y"
          placeholder="Who you are, what you run, how you play."
        />
        <p className="t-data text-xs text-[var(--color-bone-faint)] mt-1.5">
          {bio.length}/300 — public, so don&apos;t put your address or school in it.
        </p>
      </div>

      <fieldset>
        <legend className="field-label">Who can see your stats</legend>
        <div className="space-y-2 mt-1">
          {VISIBILITY.map(([value, label, help]) => (
            <label
              key={value}
              className="flex gap-3 items-start p-3 border border-[var(--color-field-800)] hover:border-[var(--color-field-700)] cursor-pointer transition-colors"
            >
              <input
                type="radio"
                name="leaderboard_visibility"
                value={value}
                defaultChecked={profile.leaderboard_visibility === value}
                className="mt-1 accent-[var(--color-tip)] shrink-0"
              />
              <span>
                <span className="text-sm block">{label}</span>
                <span className="text-xs text-[var(--color-bone-faint)]">{help}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex gap-3 items-start cursor-pointer">
        <input
          type="checkbox"
          name="anonymous_on_leaderboard"
          defaultChecked={profile.anonymous_on_leaderboard}
          className="mt-1 accent-[var(--color-tip)] w-4 h-4 shrink-0"
        />
        <span>
          <span className="text-sm block">Hide my callsign on the leaderboard</span>
          <span className="text-xs text-[var(--color-bone-faint)]">
            Your stats still count, but you show up as &ldquo;anonymous player&rdquo;
            to anyone who isn&apos;t your friend.
          </span>
        </span>
      </label>

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  )
}
