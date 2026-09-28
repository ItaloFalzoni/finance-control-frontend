import { defineConfig, devices } from "@playwright/test";

/**
 * E2E do livro-caixa contra o backend real (TODO 4.2b).
 * Exige a API C# em http://localhost:8080 e o front com BACKEND_API_KEY
 * (ver .env.local) — o proxy nunca é mockado.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  // Conta única global no backend: workers em série para evitar raça
  // entre cenários (depósito/saque concorrentes no mesmo saldo).
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command:
      process.platform === "win32"
        ? "npm.cmd run dev -- --port 3000"
        : "npm run dev -- --port 3000",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
