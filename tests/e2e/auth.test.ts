import { test } from '@nuxt/test-utils/playwright'
import { db } from '@/src/index'
import { usersTable } from '@/src/db/schema';

test('User is able to sign up', async ({ page, goto }) => {
  await goto('/', { waitUntil: 'hydration' })
  await page.locator(`[data-test-email]`).fill('tester@gmail.com');
  await page.locator(`[data-test-password]`).fill('12345678');
  await page.locator(`[data-test-signup]`).click();
  page.on('dialog', dialog => dialog.accept());
  await page.waitForURL('/');
})

async function insertTestingUser() {
  const user = { email: 'foobar@gmail.com', password: '12345678' }
  await db.insert(usersTable).values(user)
}

test('User is able to sign in', async ({ page, goto }) => {
  await goto('/', { waitUntil: 'hydration' })
  insertTestingUser()
  await page.locator(`[data-test-email]`).fill('asdjfo@gmail.com');
  await page.locator(`[data-test-password]`).fill('12345678');
  await page.locator(`[data-test-signup]`).click();
  page.on('dialog', dialog => dialog.accept());
  await page.waitForURL('/');
})
