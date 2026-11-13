import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";

// Base própria e descartável para os testes de ponta a ponta (seed de demo recriada a cada execução).
const dataDir = resolve(".data/e2e");

export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure", locale: "pt-BR" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "celular", use: { ...devices["Pixel 7"] }, testMatch: /responsivo/ },
  ],
  webServer: {
    command: `node -e "require('fs').rmSync(process.argv[1],{recursive:true,force:true})" "${dataDir}" && npm run build -w @ground/web && npx next start apps/web -p 3100`,
    url: "http://localhost:3100",
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
    env: { PGLITE_DIR: dataDir, APP_ENV: "local" },
  },
});
