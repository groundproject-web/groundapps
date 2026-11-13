import { expect, test } from "@playwright/test";
import { demoLogin } from "./helpers";

test("Sketch sozinho (João): persona com fonte, terreno, canais, missões e o momento do Marco Zero", async ({ page }) => {
  await demoLogin(page, "João · Brutal Wear");
  await page.goto("/app/sketch/entrada");
  await expect(page.getByText("Tudo bem: o Sketch funciona sozinho", { exact: false })).toBeVisible();

  await page.goto("/app/sketch/cliente");
  await expect(page.getByText("Homem de 30 a 40 anos que faz crossfit")).toBeVisible();
  await expect(page.getByText("52×")).toBeVisible();

  await page.goto("/app/sketch/terreno");
  await expect(page.getByText("espaço vazio").first()).toBeVisible();

  await page.goto("/app/sketch/canais");
  await expect(page.getByText("4 de 4 canais no plano")).toBeVisible();
  await page.getByRole("button", { name: /Campeonatos amadores/ }).click();
  await expect(page.getByText("3 de 4 canais no plano")).toBeVisible();

  await page.goto("/app/sketch/plano");
  await page.getByRole("button", { name: /Levar camisetas/ }).click();
  await expect(page.getByText("1 de 3 feitas")).toBeVisible();

  await page.goto("/app/sketch/sinais");
  await expect(page.getByText("Disponível com o Marco Zero.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Agora não, seguir com o Sketch" })).toBeVisible();

  // sem Marco Zero assinado, o módulo não abre
  await page.goto("/app/marco-zero");
  await page.waitForURL(/\/app\/plano/);
});

test("Sketch com Marco Zero (Carla): integração e recompra por canal", async ({ page }) => {
  await demoLogin(page, "Carla · Fôlego Nutrição");
  await page.goto("/app/sketch/entrada");
  await expect(page.getByText("Importado do Marco Zero")).toBeVisible();
  await page.goto("/app/sketch/sinais");
  await page.getByRole("button", { name: "Simular o mês do Sketch (staging)" }).click();
  await expect(page.getByText("Clubes de corrida do Rio trouxeram 23 clientes; 9 já voltaram.")).toBeVisible();
});
