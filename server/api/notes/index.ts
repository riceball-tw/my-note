import { db } from '@/src/index'
import { notesTable } from '@/src/db/schema';
import jwt from 'jsonwebtoken'
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  try {
    const cookies = parseCookies(event)
    const userJwtToken = cookies.userJwtToken

    if (!userJwtToken) {
      throw createError({
        statusCode: 401,
        message: "Not authorized to access notes"
      })
    }

    const decodedToken = await jwt.verify(userJwtToken, process.env.JWT_SECRET as string) as { id: number }


    const targetUser = await db
      .select()
      .from(notesTable)
      .where(eq(notesTable.userId, decodedToken.id))
    

    return targetUser
  } catch(err) {

  }
})