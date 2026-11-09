import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45000,
  expect: {
    timeout: 7000
  },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:8788',
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 720 }
  },
  projects: [
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: {
    command: 'npx wrangler dev --port 8788',
    url: 'http://127.0.0.1:8788',
    reuseExistingServer: true,
    timeout: 30000
  }
});
