/**
 * Uniform server-action envelope.
 *
 * Actions return this instead of redirecting so the client can show a toast and
 * decide where to navigate. Errors are returned rather than thrown: a thrown
 * error in a server action surfaces as an opaque digest in production, which
 * gives the user nothing actionable.
 */
export type ActionResult<T = undefined> =
  | ({ ok: true; message?: string } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string; field?: string }

export function ok(message?: string): ActionResult {
  return { ok: true, message }
}

export function okWith<T>(data: T, message?: string): ActionResult<T> {
  return { ok: true, data, message } as ActionResult<T>
}

export function fail(error: string, field?: string): ActionResult<never> {
  return { ok: false, error, field }
}
