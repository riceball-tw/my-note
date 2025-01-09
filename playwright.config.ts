import { fileURLToPath } from 'node:url'
import { defineConfig } from '@playwright/test'
import type { ConfigOptions } from '@nuxt/test-utils/playwright'

export default defineConfig<ConfigOptions>({
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
  use: {
    nuxt: {
      rootDir: fileURLToPath(new URL('.', import.meta.url)),
      host: 'http://localhost:3000',
    },
    trace: 'on-first-retry',
  },
  
})
