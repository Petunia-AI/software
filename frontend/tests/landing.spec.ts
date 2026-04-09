import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("muestra el hero con headline principal", async ({ page }) => {
    await expect(page.getByText("Tu equipo de ventas")).toBeVisible();
    await expect(page.getByText("nunca duerme")).toBeVisible();
  });

  test("navbar tiene links correctos", async ({ page }) => {
    await expect(page.getByRole("link", { name: "Empieza gratis" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Iniciar sesión" })).toBeVisible();
  });

  test("sección de precios muestra los 3 planes", async ({ page }) => {
    await page.locator("#pricing").scrollIntoViewIfNeeded();
    await expect(page.getByText("Starter")).toBeVisible();
    await expect(page.getByText("Pro")).toBeVisible();
    await expect(page.getByText("Enterprise")).toBeVisible();
  });

  test("precios muestran valores correctos", async ({ page }) => {
    await page.locator("#pricing").scrollIntoViewIfNeeded();
    await expect(page.getByText("$49")).toBeVisible();
    await expect(page.getByText("$149")).toBeVisible();
    await expect(page.getByText("$399")).toBeVisible();
  });

  test("sección features muestra los 6 items", async ({ page }) => {
    await page.locator("#features").scrollIntoViewIfNeeded();
    await expect(page.getByText("5 Agentes IA especializados")).toBeVisible();
    await expect(page.getByText("Omnicanal integrado")).toBeVisible();
    await expect(page.getByText("Calificación BANT automática")).toBeVisible();
  });

  test("badge MÁS POPULAR está en plan Pro", async ({ page }) => {
    await page.locator("#pricing").scrollIntoViewIfNeeded();
    await expect(page.getByText("MÁS POPULAR")).toBeVisible();
  });

  test("CTA principal redirige a /login", async ({ page }) => {
    await page.getByRole("link", { name: "Empieza gratis" }).first().click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("estadísticas del hero son visibles", async ({ page }) => {
    await expect(page.getByText("3x")).toBeVisible();
    await expect(page.getByText("87%")).toBeVisible();
    await expect(page.getByText("24/7")).toBeVisible();
  });
});
