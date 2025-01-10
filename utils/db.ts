import { db } from '@/src/index'
import { usersTable } from '@/src/db/schema';
import bcrypt from 'bcryptjs'
import { reset } from "drizzle-seed";
import * as schema from "@/src/db/schema";

export const initialTestingUser = {
  email: 'default@gmail.com',
  password: '12345678'
} as const


const hashedInitialTestingUser = async () => ({
  email: 'default@gmail.com',
  password: await getHashedPassword(initialTestingUser.password)
})

async function getHashedPassword(password: string) {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

export async function insertTestingUser() {
  await db.insert(usersTable).values(await hashedInitialTestingUser())
}

export async function initializeTestingDb() {
  await reset(db, schema);
  try {
    await insertTestingUser()
  } catch {
    // Some times tests running in parallel might repeatedly initialize testing db adding testing usercause error, so catch error here to avoid tests fail
    console.log('Testing user might be inserted or unable to insert');
  }

}

export async function resetDb() {
  await reset(db, schema);
}