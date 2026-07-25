import { createClient } from '@/lib/supabase/server'
import ActionButton from '@/components/ActionButton'
import CallsignLookup from '@/components/CallsignLookup'
import Avatar from '@/components/Avatar'
import {
  findPlayerByCallsign,
  sendFriendRequest,
  acceptRequest,
  declineRequest,
  removeFriend,
  blockUser,
} from './actions'

export const dynamic = 'force-dynamic'

export default async function FriendsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const meId = user!.id

  const { data: rows } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id, status')

  const all = rows ?? []
  const relatedIds = new Set<string>()
  all.forEach((r) => {
    relatedIds.add(r.requester_id)
    relatedIds.add(r.addressee_id)
  })
  relatedIds.delete(meId)

  const { data: people } = relatedIds.size
    ? await supabase.from('profiles').select('id, username, avatar_style').in('id', Array.from(relatedIds))
    : { data: [] as { id: string; username: string; avatar_style: number }[] }

  const nameOf = (id: string) => people?.find((p) => p.id === id)?.username ?? 'unknown player'
  const styleOf = (id: string) => people?.find((p) => p.id === id)?.avatar_style ?? 0

  const friends = all.filter((r) => r.status === 'accepted')
  const incoming = all.filter((r) => r.status === 'pending' && r.addressee_id === meId)
  const outgoing = all.filter((r) => r.status === 'pending' && r.requester_id === meId)
  const blocked = all.filter((r) => r.status === 'blocked' && r.requester_id === meId)

  const otherId = (r: { requester_id: string; addressee_id: string }) =>
    r.requester_id === meId ? r.addressee_id : r.requester_id

  return (
    <div className="space-y-11">
      <div>
        <p className="t-eyebrow mb-1.5">
          {friends.length} friend{friends.length === 1 ? '' : 's'}
        </p>
        <h1 className="t-display text-3xl">Friends</h1>
      </div>

      <section>
        <p className="t-eyebrow mb-3">Add a player</p>
        <CallsignLookup lookupAction={findPlayerByCallsign} addAction={sendFriendRequest} />
      </section>

      {incoming.length > 0 && (
        <section>
          <p className="t-eyebrow mb-3">Requests for you</p>
          <ul className="space-y-1.5">
            {incoming.map((r) => (
              <li key={r.requester_id} className="stub pl-4 pr-4 py-3 flex items-center gap-3">
                <Avatar seed={r.requester_id} style={styleOf(r.requester_id)} size={28} />
                <span className="flex-1 truncate text-sm">{nameOf(r.requester_id)}</span>
                <ActionButton action={acceptRequest} fields={{ userId: r.requester_id }} label="Accept" tone="primary" />
                <ActionButton action={declineRequest} fields={{ userId: r.requester_id }} label="Decline" tone="quiet" />
                <ActionButton action={blockUser} fields={{ userId: r.requester_id }} label="Block" tone="danger" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <p className="t-eyebrow mb-3">Your friends</p>
        {friends.length === 0 ? (
          <div className="border border-dashed border-[var(--color-field-700)] px-5 py-10 text-center">
            <p className="text-sm text-[var(--color-bone-dim)]">
              Ask a teammate for their exact callsign and add them above.
            </p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {friends.map((r) => (
              <li key={otherId(r)} className="stub pl-4 pr-4 py-3 flex items-center gap-3">
                <Avatar seed={otherId(r)} style={styleOf(otherId(r))} size={28} />
                <a href={`/u/${nameOf(otherId(r))}`} className="flex-1 truncate text-sm hover:text-[var(--color-tip)]">
                  {nameOf(otherId(r))}
                </a>
                <ActionButton action={removeFriend} fields={{ userId: otherId(r) }} label="Remove" tone="danger" />
              </li>
            ))}
          </ul>
        )}
      </section>

      {outgoing.length > 0 && (
        <section>
          <p className="t-eyebrow mb-3">Waiting on them</p>
          <ul className="space-y-1.5">
            {outgoing.map((r) => (
              <li key={r.addressee_id} className="stub pl-4 pr-4 py-3 flex items-center gap-3">
                <span className="flex-1 truncate text-sm text-[var(--color-bone-dim)]">{nameOf(r.addressee_id)}</span>
                <ActionButton action={removeFriend} fields={{ userId: r.addressee_id }} label="Cancel" tone="quiet" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {blocked.length > 0 && (
        <section>
          <p className="t-eyebrow mb-3">Blocked</p>
          <ul className="space-y-1.5">
            {blocked.map((r) => (
              <li key={r.addressee_id} className="stub pl-4 pr-4 py-3 flex items-center gap-3">
                <span className="flex-1 truncate text-sm text-[var(--color-bone-faint)]">{nameOf(r.addressee_id)}</span>
                <ActionButton action={removeFriend} fields={{ userId: r.addressee_id }} label="Unblock" tone="quiet" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
