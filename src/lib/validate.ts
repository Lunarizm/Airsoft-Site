/**
 * PostgREST's .or() filter takes a raw string, so anything you
 * interpolate into it becomes part of the query language itself --
 * not a parameter. A value like
 *
 *   x),status.eq.accepted,(id.eq.y
 *
 * would break out of the intended condition and rewrite the filter.
 * Every id that reaches an .or() must be proven to be a plain UUID
 * first. Anything else is rejected before it touches the database.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value)
}
