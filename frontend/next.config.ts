import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// ── Security headers ─────────────────────────────────────────────────────────
const securityHeaders = [
  // Evita que el navegador sniffee el tipo de contenido
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Controla cómo se envía el referrer
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Prohíbe embeber en iframes de otros dominios
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Desactiva funciones de hardware que no se usan
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // DNS prefetch para mejorar rendimiento
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // Fuerza HTTPS en producción (2 años + subdomains)
  ...(isDev
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]),
  // CSP — modo permisivo en dev, estricto en prod
  {
    key: "Content-Security-Policy",
    value: isDev
      ? "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;"
      : [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' https://js.stripe.com https://cdn.jsdelivr.net",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob: https:",
          "font-src 'self' data:",
          "connect-src 'self' https: wss: https://js.stripe.com https://api.stripe.com",
          "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
          "frame-ancestors 'self'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join("; "),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  typescript: {
    // Los errores de tipo se resuelven en CI separado; no bloquear el build de producción
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      { protocol: "http",  hostname: "localhost" },
      { protocol: "https", hostname: "**.fal.media" },
      { protocol: "https", hostname: "v3b.fal.media" },
      { protocol: "https", hostname: "**.railway.app" },
      { protocol: "https", hostname: "**.up.railway.app" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "**.unsplash.com" },
    ],
    formats: ["image/avif", "image/webp"],
  },
  async rewrites() {
    // BACKEND_URL es una variable server-side (sin NEXT_PUBLIC_) que apunta
    // directamente al servicio backend de Railway. Nunca debe ser el mismo
    // dominio del frontend para evitar loops.
    const backendUrl =
      process.env.BACKEND_URL ||
      "http://gentes-de-ventas.railway.internal:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },

    ];
  },
  async headers() {
    // Cabeceras especiales para el widget: se puede embeber en cualquier dominio (WordPress, etc.)
    const widgetHeaders = securityHeaders
      .filter((h) => h.key !== "X-Frame-Options")
      .map((h) => {
        if (h.key === "Content-Security-Policy") {
          return {
            key: h.key,
            value: h.value
              // Permite que cualquier sitio embeba el widget en un iframe
              .replace("frame-ancestors 'self'", "frame-ancestors *"),
          };
        }
        return h;
      });

    return [
      {
        // Regla específica para el widget — debe ir ANTES de la regla genérica
        source: "/widget",
        headers: widgetHeaders,
      },
      {
        // Aplica a todas las demás rutas
        source: "/((?!widget).*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
