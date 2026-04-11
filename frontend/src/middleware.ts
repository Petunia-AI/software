import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Rutas que requieren autenticación de cliente
const CLIENT_PROTECTED = ["/dashboard", "/analytics", "/leads", "/seguimiento", "/conversations", "/agents", "/content", "/properties", "/settings", "/billing"];
// Rutas admin protegidas (usan cookie separada)
const ADMIN_PROTECTED = ["/admin"];
// Rutas de auth que redirigen al dashboard si ya hay sesión
const AUTH_ROUTES = ["/login", "/register"];
// Rutas de auth admin
const ADMIN_AUTH_ROUTES = ["/admin/login"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Token cliente
  const clientToken = request.cookies.get("auth_token")?.value
    ?? request.headers.get("authorization")?.replace("Bearer ", "");
  // Token admin — cookie completamente separada
  const adminToken = request.cookies.get("admin_auth_token")?.value;

  const isClientProtected = CLIENT_PROTECTED.some((p) => pathname.startsWith(p));
  const isAdminProtected  = ADMIN_PROTECTED.some((p) => pathname.startsWith(p)) && !ADMIN_AUTH_ROUTES.some((p) => pathname.startsWith(p));
  const isAuthRoute       = AUTH_ROUTES.some((p) => pathname.startsWith(p));
  const isAdminAuthRoute  = ADMIN_AUTH_ROUTES.some((p) => pathname.startsWith(p));

  // Admin sin token → login admin
  if (isAdminProtected && !adminToken) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // Admin login con token admin → panel admin
  if (isAdminAuthRoute && adminToken) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  // Cliente sin token intentando acceder a ruta protegida → login
  if (isClientProtected && !clientToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Con token cliente intentando ir a login/register → dashboard
  if (isAuthRoute && clientToken) {
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
