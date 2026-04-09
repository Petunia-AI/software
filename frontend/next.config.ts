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
          "script-src 'self' 'unsafe-inline'",          // Next.js necesita inline scripts
          "style-src 'self' 'unsafe-inline'",           // Tailwind genera estilos inline
          "img-src 'self' data: blob: https:",
          "font-src 'self'",
          "connect-src 'self' https: wss:",             // API + WebSocket
          "frame-ancestors 'self'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join("; "),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  experimental: {
    typedRoutes: false,
  },
  images: {
    remotePatterns: [
      { protocol: "http",  hostname: "localhost" },
      { protocol: "https", hostname: "**.fal.media" },
      { protocol: "https", hostname: "v3b.fal.media" },
      { protocol: "https", hostname: "**.railway.app" },
      { protocol: "https", hostname: "**.up.railway.app" },
    ],
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        // Aplica a todas las rutas
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
