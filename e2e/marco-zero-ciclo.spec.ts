import { expect, test } from "@playwright/test";
import { demoLogin } from "./helpers";

test("Marco Zero: missão → check-in → resultado → ajuste (Carla)", async ({ page }) => {
  await demoLogin(page, "Carla · Fôlego Nutrição");

  await page.goto("/app/marco-zero/leitura");
  await expect(page.getByText("2.000", { exact: true })).toBeVisible();
  await expect(page.getByText("18%", { exact: true })).toBeVisible();

  await page.goto("/app/marco-zero/grupos");
  for (const g of ["Fiéis", "Em risco", "Sumidos", "Compra única recente"]) await expect(page.getByRole("heading", { name: g })).toBeVisible();

  await page.goto("/app/marco-zero/missao");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("180 clientes");
  await expect(page.getByText("Separamos 27 clientes para comparar. Não mande para elas.")).toBeVisible();

  // uma semana depois (botão de staging)
  await page.goto("/app/marco-zero/check-in");
  await page.getByRole("button", { name: "Avançar uma semana (staging)" }).click();
  await expect(page.getByRole("button", { name: "Mandei para uma parte" })).toBeVisible();

  // caminho "parte" + bloqueio
  await page.getByRole("button", { name: "Mandei para uma parte" }).click();
  await page.getByLabel("Para quantas clientes").fill("100");
  await page.getByRole("button", { name: "Responder", exact: true }).click();
  await page.getByRole("button", { name: "Faltou tempo" }).click();
  await page.getByLabel("Respostas das clientes (uma por linha)").fill("Pode mandar o link!\nO frete tá caro\nFrete de novo\nfrete alto demais");
  await page.getByRole("button", { name: "Ver o resultado →" }).click();

  await page.waitForURL(/resultado/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("A mensagem trouxe");
  await expect(page.getByText(/^Ficaram sem mensagem \(\d+\)$/)).toBeVisible();
  await expect(page.getByText("3 respostas: reclamação de frete.")).toBeVisible();

  await page.goto("/app/marco-zero/ajuste");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Continuar o que deu certo. Consertar o que travou.");
  await expect(page.getByText(/lotes de 50/)).toBeVisible();
  await expect(page.getByText("O que trava a execução: faltou tempo.")).toBeVisible();
});
