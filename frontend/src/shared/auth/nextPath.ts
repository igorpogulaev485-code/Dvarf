/** Allow only same-origin relative paths for post-login redirect. */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null
  if (!raw.startsWith('/') || raw.startsWith('//')) return null
  if (raw.startsWith('/login')) return null
  return raw
}
