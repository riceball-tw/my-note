import { readValidatedBody } from 'h3'
import { fromError } from 'zod-validation-error'
import { getUserId } from '@/server/utils/auth'
import { createNote } from '@/server/utils/notes'
import { noteCreateRequestSchema } from '@/src/db/schema'

// POST /api/notes — create a note; title/text optional (defaults to an empty "Untitled note").
export default defineEventHandler(async (event) => {
  const userId = getUserId(event)

  const validationResult = await readValidatedBody(event, body =>
    noteCreateRequestSchema.safeParse(body ?? {}),
  )

  if (!validationResult.success) {
    throw createError({
      statusCode: 400,
      message: fromError(validationResult.error).toString(),
    })
  }

  return createNote(userId, validationResult.data)
})
