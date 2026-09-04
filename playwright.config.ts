import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:4173", trace: "retain-on-failure" },
  webServer: { command: "npx serve out -l 4173 --no-clipboard", url: "http://127.0.0.1:4173", reuseExistingServer: !process.env.CI },
});
