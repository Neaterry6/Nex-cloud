// Shared PBKDF2-SHA256 password hashing for Edge Functions (Deno / WebCrypto).
// Format: pbkdf2$<iterations>$<saltBase64>$<hashBase64>

const ITERATIONS = 210_000
const KEYLEN = 32

function toB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

function fromB64(b64: string): Uint8Array {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: ITERATIONS, hash: 'SHA-256' },
    key,
    KEYLEN * 8,
  )
  return `pbkdf2$${ITERATIONS}$${toB64(salt)}$${toB64(bits)}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [scheme, iterStr, saltB64, hashB64] = stored.split('$')
    if (scheme !== 'pbkdf2') return false
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: fromB64(saltB64) as BufferSource, iterations: Number(iterStr), hash: 'SHA-256' },
      key,
      KEYLEN * 8,
    )
    const expected = fromB64(hashB64)
    const actual = new Uint8Array(bits)
    if (expected.length !== actual.length) return false
    let diff = 0
    for (let i = 0; i < expected.length; i++) diff |= expected[i] ^ actual[i]
    return diff === 0
  } catch {
    return false
  }
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
}

export const MAX_ATTEMPTS = 5
export const LOCK_MS = 15 * 60 * 1000 // 15 minutes

export function lockStatus(row: { failed_attempts: number; locked_until: string | null }): boolean {
  return row.locked_until != null && new Date(row.locked_until).getTime() > Date.now()
}

export function nextLock(row: { failed_attempts: number; locked_until: string | null }) {
  const attempts = row.failed_attempts + 1
  return {
    failed_attempts: attempts,
    locked_until: attempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCK_MS).toISOString() : null,
  }
}
