import { readValidatedBody } from 'h3'
import { z } from 'zod'
import { getUserId } from '@/server/utils/auth'
import { verifyPendingDelete } from '@/server/utils/deleteToken'
import { deleteNote } from '@/server/utils/notes'

export default defineEventHandler(async (event) => {
  const userId = getUserId(event)

  const result = await readValidatedBody(event, body =>
    z.object({ token: z.string().min(1) }).safeParse(body),
  )
  if (!result.success) {
    throw createError({ statusCode: 400, message: 'A confirmation token is required.' })
  }

  const { userId: tokenUserId, noteId } = verifyPendingDelete(result.data.token)

  // The token is bound to the user who requested the deletion; re-check it
  // matches the caller so a leaked token cannot delete someone else's note.
  if (tokenUserId !== userId) {
    throw createError({ statusCode: 403, message: 'This confirmation does not belong to you.' })
  }

  // deleteNote re-verifies ownership and existence. A replayed token is
  // therefore harmless: the second call 404s because the note is already gone.
  await deleteNote(userId, noteId)

  return { deleted: true, noteId }
})
