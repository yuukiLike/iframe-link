import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './docs/reports/coverage',
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts']
    }
  }
})
