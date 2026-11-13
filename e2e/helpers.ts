import type { Page } from "@playwright/test";

export async function demoLogin(page: Page, who: "Carla · Fôlego Nutrição" | "João · Brutal Wear" | "Sócio da Ground") {
  await page.goto("/entrar");
  await page.getByRole("button", { name: new RegExp(who) }).click();
  await page.waitForURL(/\/(app|admin)/);
}

export async function logout(page: Page) {
  await page.getByRole("button", { name: "Sair" }).first().click();
  await page.waitForURL("/");
}
