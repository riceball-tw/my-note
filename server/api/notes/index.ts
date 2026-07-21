import { getUserId } from '@/server/utils/auth'
import { listNotes } from '@/server/utils/notes'

// GET /api/notes — list the signed-in user's notes (newest first).
export default defineEventHandler(async (event) => {
  const userId = getUserId(event)
  return listNotes(userId)
})
