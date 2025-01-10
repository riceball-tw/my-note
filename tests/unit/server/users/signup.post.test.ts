import { describe, it, expect } from 'vitest'
import { initialTestingUser, initializeTestingDb } from '@/utils/db'

describe('Sign up user API', () => {
  const API_URL = 'http://localhost:3000/api/user/signup'
  const validTestingUser = {
    email: 'foobar@gmail.com',
    password: '12345678'
  } as const
  
  it('Should successfully create new user', async () => {
    await initializeTestingDb()
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(validTestingUser)
    })
    // Response code is correct
    expect(response.status).toBe(201)

    // Cookie is set
    const cookies = response.headers.get('set-cookie')
    expect(cookies).toBeDefined()
    expect(cookies).toContain('userJwtToken')

    // TODO: Parallel tests might resetting db, cause new user to be removed... Must find a way to isolate each test
    // User is inserted in the database
    // const dbUser = (await db.select().from(usersTable).where(eq(usersTable.email, validTestingUser.email)))[0]
    // expect(dbUser).toBeDefined()
    // expect(dbUser.email).toBe(validTestingUser.email)
    // expect(dbUser.password).not.toBe(validTestingUser.password)
  })

  it('Should response error when email already exists', async () => {
    await initializeTestingDb()
    const doubleSignupRequest = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(initialTestingUser)
    })

    // Response code is correct
    expect(doubleSignupRequest.status).toBe(409)
    
    // Response message is correct
    expect((await doubleSignupRequest.json()).message).toBe('An email with this address already exists.')
  })

  it('Should response error when request body is invalid', async () => {
    const invalidUser = {
      email: 'invalid-email',
      password: '123'
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(invalidUser)
    })

    // Response code is correct
    expect(response.status).toBe(400)

    // Response message is correct
    expect((await response.json())).toHaveProperty('message')
  })
})