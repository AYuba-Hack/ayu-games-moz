const { defineConfig, devices } = require('@playwright/test');

module.exports=defineConfig({
  testDir: __dirname,
  testMatch: '**/*.spec.cjs',
  timeout: 30000,
  expect: { timeout: 7000 },
  reporter: [['list'],['html', { outputFolder:'qa-report', open:'never' }]],
  retries: 1,
  workers: 2,
  use: { baseURL: 'http://127.0.0.1:8765', channel: 'chrome', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'Chromium-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'Pixel-7-mobile', use: { ...devices['Pixel 7'], browserName:'chromium' } },
  ],
  webServer: { command: 'python3 -m http.server 8765 --bind 127.0.0.1', url:'http://127.0.0.1:8765/', timeout: 15000, reuseExistingServer: !process.env.CI }
});
