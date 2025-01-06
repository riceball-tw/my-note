import { db } from '@/src/index'
import { eq } from 'drizzle-orm';
import { notesTable } from '@/src/db/schema';
import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
    const targetId = Number((await getRouterParam(event, 'id')))

    const cookies = parseCookies(event)
    const userJwtToken = cookies.userJwtToken

    if (!userJwtToken) {
      throw createError({
        statusCode: 401,
        message: "Not authorized to update"
      })
    }

    const decodedToken = await jwt.verify(userJwtToken, process.env.JWT_SECRET as string) as { id: number }

    const noteTryingToUpdate = (await db
    .select()
    .from(notesTable)
    .where(eq(notesTable.id, targetId)))[0]


    if (!noteTryingToUpdate) {
      throw createError({
        statusCode: 401,
        message: "Note does not exist."
      })
    }

    if (noteTryingToUpdate.userId !== decodedToken.id) {
      throw createError({
        statusCode: 401,
        message: "Not authorized to update this note."
      })
    }
    await db
      .delete(notesTable)
      .where(eq(notesTable.id, targetId))
})