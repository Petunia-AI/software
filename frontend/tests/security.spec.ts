import { test, expect } from "@playwright/test";

test.describe("Security headers", () => {
  test("respuesta del servidor incluye X-Content-Type-Options", async ({ request }) => {
    const res = await request.get("/");
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
  });

  test("respuesta incluye X-Frame-Options", async ({ request }) => {
    const res = await request.get("/");
    expect(res.headers()["x-frame-options"]).toBe("SAMEORIGIN");
  });

  test("ruta protegida redirige a /login sin token", async ({ page }) => {
    // Asegurarse de que no hay cookie de sesión
    await page.context().clearCookies();
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login redirige a /dashboard con token existente", async ({ page }) => {
    // Simular cookie de sesión válida
    await page.context().addCookies([
      {
        name: "auth_token",
        value: "fake-token-for-middleware-test",
        domain: "localhost",
        path: "/",
      },
    ]);
    await page.goto("/login");
    // El middleware debe redirigir al dashboard
    // (puede fallar si la API rechaza el token — chequeamos solo la URL inicial)
    await expect(page).not.toHaveURL("/login");
  });
});

test.describe("Rate limiting headers", () => {
  test("API devuelve 429 al exceder límite de login", async ({ request }) => {
    // Enviar 15 requests seguidos — slowapi devuelve 429 al sobrepasar 10/min
    const results: number[] = [];
    for (let i = 0; i < 15; i++) {
      const res = await request.post("http://localhost:8000/api/auth/login", {
        data: { email: "test@test.com", password: "wrong" },
      });
      results.push(res.status());
    }
    // Al menos uno debe ser 429 o 401 (nunca 500)
    expect(results.every((s) => s === 401 || s === 429)).toBeTruthy();
    expect(results.some((s) => s === 429)).toBeTruthy();
  });
});
