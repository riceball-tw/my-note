import { db } from '@/src/index'
import { notesTable } from '@/src/db/schema';
import jwt from 'jsonwebtoken'
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
    const cookies = parseCookies(event)
    const userJwtToken = cookies.userJwtToken

    if (!userJwtToken) {
      throw createError({
        statusCode: 401,
        message: "Not authorized to access notes"
      })
    }

    const verifyToken = async (token: string) => {
      try {
        return await jwt.verify(token, process.env.JWT_SECRET as string) as { id: number };
      } catch {
        throw createError({
          statusCode: 500,
          message: "Could not verify JWT token",
        });
      }
    };

    const decodedToken = await verifyToken(userJwtToken);

    const newNotesId = (await db
      .insert(notesTable)
      .values({
        text: 'New Note',
        userId: decodedToken.id
      }).$returningId())[0].id
    

    const newNote = (await db 
      .select()
      .from(notesTable)
      .where(eq(notesTable.id, newNotesId)))[0]

    return newNote
})