import type { H3Event } from 'h3'
import { createError, parseCookies } from 'h3'
import jwt from 'jsonwebtoken'

/**
 * Resolve the authenticated user id from the `userJwtToken` cookie.
 * Throws a 401 error when the token is missing or invalid so both REST
 * endpoints and AI tools share a single authorization gate.
 */
export function getUserId(event: H3Event): number {
  const cookies = parseCookies(event)
  const userJwtToken = cookies.userJwtToken

  if (!userJwtToken) {
    throw createError({
      statusCode: 401,
      message: 'Not authorized',
    })
  }

  try {
    const decoded = jwt.verify(userJwtToken, process.env.JWT_SECRET as string) as { id: number }
    return decoded.id
  } catch {
    throw createError({
      statusCode: 401,
      message: 'Could not verify JWT token',
    })
  }
}
