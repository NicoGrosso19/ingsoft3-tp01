import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    timeout: 60_000,
    expect: { timeout: 15_000 },
    use: {
        baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },
    retries: 1,
    reporter: [['html', { open: 'never' }], ['list']],
});