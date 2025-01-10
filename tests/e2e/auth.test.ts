import { test } from '@nuxt/test-utils/playwright'
import { initialTestingUser, initializeTestingDb } from '@/utils/db'

test('User is able to sign up', async ({ page, goto }) => {
  await goto('/signup', { waitUntil: 'hydration' })
  await page.locator(`[data-test-email]`).fill('tester@gmail.com');
  await page.locator(`[data-test-password]`).fill('12345678');
  await page.locator(`[data-test-signup]`).click();
  page.on('dialog', dialog => dialog.accept());
  await page.waitForURL('/');
})

test('User is able to sign in', async ({ page, goto }) => {
  await initializeTestingDb()
  await goto('/signin', { waitUntil: 'hydration' })
  await page.locator(`[data-test-email]`).fill(initialTestingUser.email);
  await page.locator(`[data-test-password]`).fill(initialTestingUser.password);
  await page.locator(`[data-test-signin]`).click();
  page.on('dialog', dialog => dialog.accept());
  await page.waitForURL('/');
})
