import { getRouterParam } from 'h3'
import { getUserId } from '@/server/utils/auth'
import { deleteNote } from '@/server/utils/notes'

// DELETE /api/notes/:id — direct delete for the manual "Delete Note" button (ownership enforced).
export default defineEventHandler(async (event) => {
  const userId = getUserId(event)
  const targetId = Number(getRouterParam(event, 'id'))
  await deleteNote(userId, targetId)
  setResponseStatus(event, 204)
})
