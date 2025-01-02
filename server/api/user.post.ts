import { db } from '@/src/index'
import { usersTable } from '@/src/db/schema';
import bcrypt from 'bcryptjs'
import type { QueryError } from 'mysql2'
import { usersInsertRequestSchema } from '@/src/db/schema';
import { readValidatedBody } from "h3";
import { fromError } from 'zod-validation-error';

export default defineEventHandler(async (event) => {
  const validationResult = await readValidatedBody(event, body => usersInsertRequestSchema.safeParse(body))
  
  if (!validationResult.success) {
    throw createError({
      statusCode: 400,
      message: fromError(validationResult.error).toString()
    })
  }

  const body = await readBody(event)
  const salt = await bcrypt.genSalt(10)
  const passwordHash = await bcrypt.hash(body.password, salt)
  
  try {
    const newUser = {
      email: body.email,
      password: passwordHash,
      salt: salt,
    }
    await db.insert(usersTable).values(newUser)
    setResponseStatus(event, 201)
  } catch(err) {
    if ((err as QueryError).code === 'ER_DUP_ENTRY') {
      throw createError({
        statusCode: 409,
        message: "An email with this address already exists."
      })
    }
    throw err
  }
})