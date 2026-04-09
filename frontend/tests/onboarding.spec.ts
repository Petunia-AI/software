import { test, expect } from "@playwright/test";

test.describe("Onboarding Wizard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/onboarding");
  });

  test("muestra el step 1 correctamente", async ({ page }) => {
    await expect(page.getByText("Cuéntanos sobre tu negocio")).toBeVisible();
    await expect(page.getByPlaceholder("Ej: TechVentas LATAM")).toBeVisible();
    await expect(page.getByText("Tu negocio")).toBeVisible();
  });

  test("step indicator muestra 5 pasos", async ({ page }) => {
    const steps = ["Tu negocio", "Contexto IA", "Canales", "Widget", "Listo"];
    for (const step of steps) {
      await expect(page.getByText(step)).toBeVisible();
    }
  });

  test("botón Siguiente deshabilitado sin nombre", async ({ page }) => {
    const nextBtn = page.getByRole("button", { name: /siguiente/i });
    await expect(nextBtn).toBeDisabled();
  });

  test("puede avanzar al step 2 con datos válidos", async ({ page }) => {
    await page.fill('[placeholder="Ej: TechVentas LATAM"]', "Mi Empresa");
    await page.getByText("SaaS / Software").click();

    const nextBtn = page.getByRole("button", { name: /siguiente/i });
    await expect(nextBtn).toBeEnabled();
    await nextBtn.click();

    await expect(page.getByText("Contexto para los agentes IA")).toBeVisible();
  });

  test("puede navegar hacia atrás", async ({ page }) => {
    await page.fill('[placeholder="Ej: TechVentas LATAM"]', "Mi Empresa");
    await page.getByText("SaaS / Software").click();
    await page.getByRole("button", { name: /siguiente/i }).click();

    // Volver al step 1
    await page.getByRole("button", { name: /anterior/i }).click();
    await expect(page.getByText("Cuéntanos sobre tu negocio")).toBeVisible();
  });

  test("step 3 muestra los canales disponibles", async ({ page }) => {
    // Avanzar a step 3
    await page.fill('[placeholder="Ej: TechVentas LATAM"]', "Mi Empresa");
    await page.getByText("SaaS / Software").click();
    await page.getByRole("button", { name: /siguiente/i }).click();
    await page.getByRole("button", { name: /siguiente/i }).click();

    await expect(page.getByText("Activa tus canales")).toBeVisible();
    await expect(page.getByText("Webchat")).toBeVisible();
    await expect(page.getByText("WhatsApp Business")).toBeVisible();
  });

  test("step 4 muestra el código del widget", async ({ page }) => {
    // Avanzar a step 4
    await page.fill('[placeholder="Ej: TechVentas LATAM"]', "Mi Empresa");
    await page.getByText("Fintech").click();
    await page.getByRole("button", { name: /siguiente/i }).click();
    await page.getByRole("button", { name: /siguiente/i }).click();
    await page.getByRole("button", { name: /siguiente/i }).click();

    await expect(page.getByText("Instala el widget")).toBeVisible();
    await expect(page.getByText("widget.js")).toBeVisible();
  });

  test("link saltar navega al dashboard", async ({ page }) => {
    // Mock auth
    await page.evaluate(() => {
      localStorage.setItem("auth-storage", JSON.stringify({ state: { token: "test" }, version: 0 }));
    });
    await page.getByText("Saltar por ahora").click();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
