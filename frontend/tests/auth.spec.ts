import { test, expect } from "@playwright/test";

test.describe("Login Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("muestra el formulario de login", async ({ page }) => {
    await expect(page.getByText("Bienvenido de vuelta")).toBeVisible();
    await expect(page.getByPlaceholder("tu@empresa.com")).toBeVisible();
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();
    await expect(page.getByRole("button", { name: "Iniciar sesión" })).toBeVisible();
  });

  test("panel izquierdo muestra headline de marketing", async ({ page }) => {
    await expect(page.getByText("Vende más,")).toBeVisible();
    await expect(page.getByText("sin trabajar más.")).toBeVisible();
  });

  test("muestra features en panel izquierdo", async ({ page }) => {
    await expect(page.getByText("Calificación BANT automática 24/7")).toBeVisible();
  });

  test("switch a registro muestra campos adicionales", async ({ page }) => {
    await page.getByRole("button", { name: "Crear cuenta gratis" }).click();
    await expect(page.getByText("Crea tu cuenta")).toBeVisible();
    await expect(page.getByPlaceholder("Tu nombre")).toBeVisible();
  });

  test("toggle password visibility", async ({ page }) => {
    const passwordInput = page.getByPlaceholder("••••••••");
    await expect(passwordInput).toHaveAttribute("type", "password");

    await page.locator("button[type='button']").last().click();
    await expect(passwordInput).toHaveAttribute("type", "text");
  });

  test("submit vacío no navega", async ({ page }) => {
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("credenciales incorrectas muestran error", async ({ page }) => {
    // Mock the API to return 401
    await page.route("**/api/auth/login", (route) => {
      route.fulfill({ status: 401, body: JSON.stringify({ detail: "Credenciales incorrectas" }) });
    });

    await page.fill('[placeholder="tu@empresa.com"]', "wrong@test.com");
    await page.fill('[placeholder="••••••••"]', "wrongpass");
    await page.getByRole("button", { name: "Iniciar sesión" }).click();

    await expect(page.getByText(/incorrecto/i)).toBeVisible({ timeout: 5000 });
  });
});
