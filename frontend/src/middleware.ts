import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Rutas que requieren autenticación
const PROTECTED_PREFIXES = ["/dashboard", "/analytics", "/leads", "/conversations", "/agents", "/content", "/properties", "/settings", "/billing", "/admin"];
// Rutas de auth que redirigen al dashboard si ya hay sesión
const AUTH_ROUTES = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("auth_token")?.value
    ?? request.headers.get("authorization")?.replace("Bearer ", "");

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthRoute  = AUTH_ROUTES.some((p) => pathname.startsWith(p));

  // Sin token intentando acceder a ruta protegida → login
  if (isProtected && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Con token intentando ir a login/register → dashboard
  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Agregar headers de seguridad adicionales a la respuesta
  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");

  return response;
}

export const config = {
  matcher: [
    // Excluye archivos estáticos, imágenes y API routes internas
    "/((?!_next/static|_next/image|favicon.ico|widget|api).*)",
  ],
};
