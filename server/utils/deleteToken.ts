import { createError } from 'h3'
import jwt from 'jsonwebtoken'

const PURPOSE = 'note-delete'
const EXPIRES_IN = '5m'

interface PendingDeleteClaims {
  userId: number
  noteId: number
  purpose: typeof PURPOSE
}

function secret(): string {
  return process.env.JWT_SECRET as string
}

/**
 * Create a short-lived signed token scoped to a single user + note that
 * authorizes exactly one deletion. The token is the only thing the client
 * needs to echo back; ownership is re-checked on confirmation.
 */
export function signPendingDelete(userId: number, noteId: number): string {
  return jwt.sign({ userId, noteId, purpose: PURPOSE } satisfies PendingDeleteClaims, secret(), {
    expiresIn: EXPIRES_IN,
  })
}

/**
 * Validate a pending-delete token. Throws a 400 for tampered, expired, or
 * wrong-purpose tokens so callers never delete on a bad token.
 */
export function verifyPendingDelete(token: string): { userId: number, noteId: number } {
  let decoded: PendingDeleteClaims
  try {
    decoded = jwt.verify(token, secret()) as PendingDeleteClaims
  } catch {
    throw createError({ statusCode: 400, message: 'Delete confirmation is invalid or has expired.' })
  }

  if (decoded.purpose !== PURPOSE || typeof decoded.userId !== 'number' || typeof decoded.noteId !== 'number') {
    throw createError({ statusCode: 400, message: 'Delete confirmation is invalid.' })
  }

  return { userId: decoded.userId, noteId: decoded.noteId }
}
