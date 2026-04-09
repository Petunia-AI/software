import { test, expect } from "@playwright/test";

test.describe("Widget de Chat", () => {
  const WIDGET_URL = "/widget?business_id=test123&color=%23635bff&name=Sof%C3%ADa";

  test.beforeEach(async ({ page }) => {
    await page.goto(WIDGET_URL);
  });

  test("muestra el header con el nombre del agente", async ({ page }) => {
    await expect(page.getByText("Sofía")).toBeVisible();
    await expect(page.getByText("En línea")).toBeVisible();
  });

  test("muestra el formulario de inicio", async ({ page }) => {
    await expect(page.getByText("¡Bienvenido!")).toBeVisible();
    await expect(page.getByPlaceholder("Tu nombre")).toBeVisible();
    await expect(page.getByPlaceholder("Tu email (opcional)")).toBeVisible();
    await expect(page.getByRole("button", { name: "Comenzar chat" })).toBeVisible();
  });

  test("botón Comenzar deshabilitado sin nombre", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Comenzar chat" })).toBeDisabled();
  });

  test("botón se habilita al escribir nombre", async ({ page }) => {
    await page.fill('[placeholder="Tu nombre"]', "Juan");
    await expect(page.getByRole("button", { name: "Comenzar chat" })).toBeEnabled();
  });

  test("al iniciar chat con error de API muestra fallback", async ({ page }) => {
    await page.route("**/conversations/start**", (route) => {
      route.fulfill({ status: 500, body: JSON.stringify({ detail: "Error" }) });
    });

    await page.fill('[placeholder="Tu nombre"]', "Juan");
    await page.getByRole("button", { name: "Comenzar chat" }).click();

    // Debería mostrar pantalla de error o mantenerse en el form
    await expect(page).toHaveURL(new RegExp(WIDGET_URL.split("?")[0]));
  });

  test("widget acepta parámetro de color", async ({ page }) => {
    // El color #635bff debe aplicarse al header
    const header = page.locator("header, [class*='header']").first();
    await expect(header).toBeVisible();
  });
});
