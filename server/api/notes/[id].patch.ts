import { getRouterParam, readValidatedBody } from 'h3'
import { fromError } from 'zod-validation-error'
import { getUserId } from '@/server/utils/auth'
import { updateNote } from '@/server/utils/notes'
import { noteUpdateRequestSchema } from '@/src/db/schema'

// PATCH /api/notes/:id — update a note's title and/or text (ownership enforced in the service).
export default defineEventHandler(async (event) => {
  const userId = getUserId(event)
  const targetId = Number(getRouterParam(event, 'id'))

  const validationResult = await readValidatedBody(event, body =>
    noteUpdateRequestSchema.safeParse(body),
  )

  if (!validationResult.success) {
    throw createError({
      statusCode: 400,
      message: fromError(validationResult.error).toString(),
    })
  }

  return updateNote(userId, targetId, validationResult.data)
})
