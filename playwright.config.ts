import { defineConfig, devices } from "@playwright/test";

const PORT = 3210;

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices["iPhone 13"],
    // iPhone 13 = 390×844; run it in Chromium (WebKit is not needed for this flow).
    browserName: "chromium",
    viewport: { width: 390, height: 844 },
    locale: "ko-KR",
    timezoneId: "Europe/Berlin",
    geolocation: { latitude: 49.8728, longitude: 8.6512 },
    permissions: ["geolocation"],
  },
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    env: { TANKERKOENIG_MODE: "mock" },
  },
});
