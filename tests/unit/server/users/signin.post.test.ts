import { describe, it, expect } from 'vitest'
import { initialTestingUser, initializeTestingDb } from '@/utils/db'

describe('Sign in user API', () => {
  const API_URL = 'http://localhost:3000/api/user/signin'

  it('Should successfully sign in user', async () => {
    await initializeTestingDb()
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(initialTestingUser)
    })

    // Response code is correct
    expect(response.status).toBe(204)

    // Cookie is set
    const cookies = response.headers.get('set-cookie')
    expect(cookies).toBeDefined()
    expect(cookies).toContain('userJwtToken')
  })

  it('Should response error when request body is invalid', async () => {
      await initializeTestingDb()
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: initialTestingUser.email,
          password: 'wrongpassword123'
        })
      })

      // Response code is correct
      expect(response.status).toBe(401)
    })

  it('Should response error when request body format is invalid', async () => {
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
