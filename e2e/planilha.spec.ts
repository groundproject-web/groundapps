import { expect, test } from "@playwright/test";
import { demoLogin, logout } from "./helpers";

test("Lojista novo: conta → plano liberado pela Ground → planilha bagunçada → marco zero", async ({ page, request }) => {
  const email = `e2e-${Date.now()}@loja.test`;
  await page.goto("/criar-conta");
  await page.getByLabel("Seu nome").fill("Teste");
  await page.getByLabel("Nome da loja").fill("Loja E2E");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel(/Senha/).fill("senha-de-teste-123");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByText("Seu plano ainda não foi liberado")).toBeVisible();
  await logout(page);

  await demoLogin(page, "Sócio da Ground");
  const row = page.getByRole("row", { name: /Loja E2E/ });
  await row.getByLabel(/Faixa do Marco Zero/).selectOption("MZ2");
  await row.getByRole("button", { name: "Liberar" }).click();
  await expect(row).toContainText("MZ MZ2");
  await logout(page);

  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("senha-de-teste-123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/app/);

  const csv = await (await request.get("/api/demo/planilha-folego")).body();
  await page.goto("/app/marco-zero/conexao");
  await page.setInputFiles("#planilha", { name: "pedidos.csv", mimeType: "text/csv", buffer: csv });
  await page.getByRole("button", { name: "Ler a planilha" }).click();
  await page.waitForURL(/organizacao/);
  await expect(page.getByText("Esses dois cadastros são a mesma cliente?")).toBeVisible();
  await expect(page.getByRole("row", { name: /CPF/ })).toContainText("dado sensível");
  await page.getByRole("button", { name: "Sim, juntar" }).click();
  await expect(page.getByText("Pronto, virou uma cliente só: 5 pedidos.")).toBeVisible();
  await page.getByRole("button", { name: "Ver o meu marco zero →" }).click();
  await page.waitForURL(/leitura/);
  await expect(page.getByText("Taxa de recompra")).toBeVisible();
});
