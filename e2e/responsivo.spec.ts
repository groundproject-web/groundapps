import { expect, test } from "@playwright/test";
import { demoLogin } from "./helpers";

test("celular: sem rolagem horizontal nas telas principais", async ({ page }) => {
  await demoLogin(page, "Carla · Fôlego Nutrição");
  for (const p of ["/app", "/app/marco-zero/leitura", "/app/marco-zero/missao", "/app/sketch/canais", "/ui"]) {
    await page.goto(p);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, p).toBeLessThanOrEqual(1);
  }
});
