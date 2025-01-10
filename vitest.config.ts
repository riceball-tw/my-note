import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  // any custom Vitest config you require
  
  test: {
    testTimeout: 1_0000,
    environment: 'nuxt',
    include: ['tests/unit/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
  }
})
