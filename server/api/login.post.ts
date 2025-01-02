import { db } from '@/src/index'
import { usersTable } from '@/src/db/schema';
import bcrypt from 'bcryptjs'
import { usersInsertRequestSchema } from '@/src/db/schema';
import { readValidatedBody } from "h3";
import { fromError } from 'zod-validation-error';
import jwt from 'jsonwebtoken'
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const validationResult = await readValidatedBody(event, body => usersInsertRequestSchema.safeParse(body))
  
  if (!validationResult.success) {
    throw createError({
      statusCode: 400,
      message: fromError(validationResult.error).toString()
    })
  }

  try {
    const body = await readBody(event)
    const targetUser = (await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, body.email)))[0]
    const isValidPassword = await bcrypt.compare(body.password, targetUser?.password)
    
    if (!isValidPassword) {
      throw new Error
    }
    
    const userJwtToken = jwt.sign({ id: targetUser.id }, process.env.JWT_SECRET as string)
    setCookie(event, 'userJwtToken', userJwtToken)
    setResponseStatus(event, 204)
  } catch(err) {
    throw createError({
      statusCode: 401,
      message: "Username or Password is invalid."
    })
  }
})